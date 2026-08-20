/**
 * Create CampaignBot WhatsApp templates by driving the live UI.
 * Launches Microsoft Edge (persistent profile) automatically — no CDP / debug flag.
 * Session is saved in backend/.campaignbot-profile so later runs stay logged in.
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { WpExperiment } from '../models/wpMarketingModels.js';
import * as cbAuth from './campaignBotAuth.js';

const TEMPLATES = 'https://campaignbot.online/templates';
const LOGIN = 'https://campaignbot.online/login';
const PROFILE_DIR = process.env.CB_PROFILE_DIR
  || path.join(process.cwd(), '.campaignbot-profile');

const LANG_LABEL = {
  en_US: 'English (US)',
  en_GB: 'English (UK)',
  hi:    'Hindi',
};

let busy = false;
let sharedContext = null;

async function getPersistentContext() {
  if (sharedContext) {
    try {
      const pages = sharedContext.pages();
      if (pages) return sharedContext;
    } catch {
      sharedContext = null;
    }
  }
  sharedContext = await launchBrowser();
  sharedContext.on('close', () => { sharedContext = null; });
  return sharedContext;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cbLog(msg, extra) {
  cbAuth.cbLog(msg, extra);
}

async function dumpPage(page, label) {
  try {
    const info = await page.evaluate(() => {
      const form = document.querySelector('div.fixed.inset-0 form') || document.querySelector('form');
      const boxes = [...document.querySelectorAll('input.otp-box')];
      const vueOf = (el) => {
        let n = el;
        while (n) {
          if (n.__vueParentComponent) return { kind: 'vue3', inst: n.__vueParentComponent };
          if (n.__vue__) return { kind: 'vue2', inst: n.__vue__ };
          n = n.parentElement;
        }
        return null;
      };
      const found = form ? vueOf(form) : null;
      const keys = [];
      if (found?.kind === 'vue3') {
        const inst = found.inst;
        for (const bag of [inst.setupState, inst.ctx, inst.proxy]) {
          if (!bag) continue;
          try { keys.push(...Object.keys(bag).filter((k) => !k.startsWith('_') && !k.startsWith('$'))); } catch { /* ignore */ }
        }
      }
      if (found?.kind === 'vue2') {
        try { keys.push(...Object.keys(found.inst.$data || found.inst)); } catch { /* ignore */ }
      }
      const errNodes = [...document.querySelectorAll('.text-red-500, .text-red-600, [class*="error"], .toast, .alert')];
      return {
        url: location.href,
        title: document.title,
        modal: Boolean(document.querySelector('div.fixed.inset-0 form')),
        phone: document.querySelector('input[placeholder="Enter mobile number"]')?.value || '',
        otpBoxes: boxes.map((el) => ({ value: el.value, disabled: el.disabled, max: el.maxLength })),
        sendOtpDisabled: [...document.querySelectorAll('button')].find((b) => /send otp/i.test(b.textContent || ''))?.disabled ?? null,
        signUpPresent: [...document.querySelectorAll('button')].some((b) => /sign up/i.test(b.textContent || '')),
        buttons: [...document.querySelectorAll('button')].slice(0, 16).map((b) => ({
          text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48),
          disabled: b.disabled,
          type: b.getAttribute('type') || '',
        })),
        vue: found ? { kind: found.kind, keys: [...new Set(keys)].slice(0, 40) } : null,
        errors: errNodes.map((n) => (n.innerText || '').trim().slice(0, 120)).filter(Boolean).slice(0, 6),
        body: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      };
    });
    if (info.phone) info.phone = cbAuth.maskPhone(info.phone);
    if (Array.isArray(info.otpBoxes)) {
      info.otpBoxes = info.otpBoxes.map((b) => ({ ...b, value: b.value ? `len:${String(b.value).length}` : '' }));
    }
    cbLog(`dump:${label}`, info);
  } catch (err) {
    cbLog(`dump:${label} FAILED`, { error: err.message, url: page.url() });
  }
}

function redactOtpJson(body) {
  return String(body || '').replace(/"otp"\s*:\s*"\d+"/g, '"otp":"******"');
}

function attachNetworkLogger(page) {
  if (page._cbNetLog) return;
  page._cbNetLog = true;
  page._cbVerifyOtp = null;
  page._cbGeneratedOtp = null;
  page._cbGeneratedOtpAt = 0;
  page.on('response', async (res) => {
    const url = res.url();
    if (!/campaignbot\.online/i.test(url)) return;
    if (!/otp|verify|login|signup|auth|user|session|template/i.test(url)) return;
    let body = '';
    try { body = String(await res.text()).slice(0, 1200); } catch { /* ignore */ }
    cbLog('http', { status: res.status(), url, body: redactOtpJson(body).slice(0, 400) });
    if (/generate\/whatsapp\/otp/i.test(url)) {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch { /* ignore */ }
      const otp = String(parsed?.payload?.otp || '').replace(/\D/g, '');
      if (otp.length >= 4) {
        page._cbGeneratedOtp = otp;
        page._cbGeneratedOtpAt = Date.now();
        cbLog('captured generated OTP', {
          otp: cbAuth.maskOtp(otp),
          expireAt: parsed?.payload?.expireAt,
          ref: parsed?.payload?.otp_ref_id,
        });
      }
    }
    if (/verify-otp/i.test(url)) {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch { /* ignore */ }
      page._cbVerifyOtp = {
        at: Date.now(),
        http: res.status(),
        statusCode: parsed.statusCode,
        message: parsed.message || '',
        expired: /expired/i.test(parsed.message || ''),
        invalid: /invalid|incorrect|wrong/i.test(parsed.message || ''),
        ok: parsed.statusCode === 200 || (parsed.payload && parsed.statusCode < 400),
      };
      cbLog('verify-otp result', page._cbVerifyOtp);
    }
  });
  page.on('console', (msg) => {
    const text = msg.text();
    if (/otp|login|error|vue|axios|fail/i.test(text)) {
      cbLog(`page.console:${msg.type()}`, text.slice(0, 300));
    }
  });
}

export async function checkEdgeCdp() {
  // Self-launching Playwright — always "ready". First run may ask for CampaignBot login in the opened window.
  return {
    connected: true,
    selfLaunch: true,
    onCampaignBot: true,
    profileDir: PROFILE_DIR,
  };
}

function missingLinuxLibs(err) {
  const msg = err?.message || '';
  return /libatk|shared libraries|cannot open shared object/i.test(msg);
}

function linuxLibHint() {
  return 'Ubuntu is missing Chromium libraries (libatk-1.0.so.0). On the server run: cd /home/ubuntu/picoso/backend && sudo bash scripts/install-playwright-ubuntu.sh';
}

function systemChromePath() {
  const paths = [
    process.env.CB_CHROME_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ].filter(Boolean);
  return paths.find((p) => fs.existsSync(p)) || null;
}

async function launchBrowser() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const headless = process.env.CB_HEADLESS !== 'false';
  const common = {
    headless,
    viewport: { width: 1440, height: 920 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };

  const attempts = [{ ...common }];
  const sys = systemChromePath();
  if (sys) attempts.push({ ...common, executablePath: sys });
  attempts.push({ ...common, channel: 'chrome' });

  let lastErr;
  for (const opts of attempts) {
    try {
      return await chromium.launchPersistentContext(PROFILE_DIR, opts);
    } catch (err) {
      lastErr = err;
      console.warn('[CB Templates] launch failed:', err.message.split('\n')[0]);
    }
  }

  if (/Executable doesn't exist/i.test(lastErr?.message || '')) {
    throw new Error('Playwright Chromium is not installed. In the backend folder run: npx playwright install chromium');
  }
  if (missingLinuxLibs(lastErr)) {
    throw new Error(linuxLibHint());
  }
  throw lastErr;
}

async function hasTemplatesUi(page) {
  if (await page.locator('button[title="Create a new template"]').first().isVisible().catch(() => false)) return true;
  if (await page.getByRole('button', { name: /^\s*New Template\s*$/i }).first().isVisible().catch(() => false)) return true;
  if (await page.getByRole('heading', { name: /Create New Template/i }).isVisible().catch(() => false)) return true;
  return false;
}

async function setVueInput(locator, value) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(String(value), { delay: 40 });
}

async function pageLooksLikeOtp(page) {
  return page.locator('input.otp-box').first().isVisible().catch(() => false);
}

async function pageLooksLikeLogin(page) {
  if (await pageLooksLikeOtp(page)) return false;
  if (await page.getByRole('button', { name: 'Start with Mobile Number', exact: true }).isVisible().catch(() => false)) return true;
  if (await page.locator('input[placeholder="Enter mobile number"]').first().isVisible().catch(() => false)) return true;
  const text = await page.locator('body').innerText().catch(() => '');
  return /Business Sign Up|Start with Mobile Number|ONLY 3 STEPS TO START|Welcome to CampaignBot/i.test(text);
}

async function isLoggedIn(page) {
  if (page.url().includes('/login')) return false;
  if (await pageLooksLikeOtp(page) || await pageLooksLikeLogin(page)) return false;
  return hasTemplatesUi(page);
}

async function waitForLoginOrApp(page) {
  const end = Date.now() + 25000;
  while (Date.now() < end) {
    if (await hasTemplatesUi(page) && !(await pageLooksLikeLogin(page)) && !(await pageLooksLikeOtp(page))) {
      return 'app';
    }
    if (await pageLooksLikeOtp(page)) return 'otp';
    if (await pageLooksLikeLogin(page) || page.url().includes('/login')) return 'login';
    await sleep(400);
  }
  return 'login';
}

async function openMobileForm(page) {
  const phoneInput = page.locator('input[placeholder="Enter mobile number"][type="tel"]').first();
  if (await phoneInput.isVisible().catch(() => false)) {
    cbLog('openMobileForm: phone field already visible');
    return;
  }

  const start = page.locator('button').filter({ hasText: 'Start with Mobile Number' }).first();
  cbLog('openMobileForm: waiting for Start with Mobile Number');
  await start.waitFor({ state: 'visible', timeout: 20000 });
  await start.click();
  cbLog('openMobileForm: clicked Start with Mobile Number');
  await phoneInput.waitFor({ state: 'visible', timeout: 15000 });
  await dumpPage(page, 'after-start-mobile');
}

async function fillLoginPhone(page, phone) {
  cbLog('fillLoginPhone start', { phone: cbAuth.maskPhone(phone), url: page.url() });
  if (!page.url().includes('/login')) {
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(800);
    cbLog('fillLoginPhone navigated to login', { url: page.url() });
  }

  await dumpPage(page, 'before-phone-fill');
  await openMobileForm(page);

  const input = page.locator('input[placeholder="Enter mobile number"][type="tel"]').first();
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await setVueInput(input, phone);
  const afterType = await input.inputValue().catch(() => '');
  cbLog('fillLoginPhone typed', { want: cbAuth.maskPhone(phone), got: cbAuth.maskPhone(afterType), match: afterType === phone });
  if (afterType !== phone) {
    await input.fill(phone);
    cbLog('fillLoginPhone fallback fill', { got: cbAuth.maskPhone(await input.inputValue().catch(() => '')) });
  }

  const sendOtp = page.locator('button').filter({ hasText: /^\s*Send OTP\s*$/ }).first();
  const enableDeadline = Date.now() + 12000;
  while (Date.now() < enableDeadline) {
    if (await sendOtp.isEnabled().catch(() => false)) break;
    await sleep(250);
  }
  const sendEnabled = await sendOtp.isEnabled().catch(() => false);
  cbLog('fillLoginPhone Send OTP enabled?', sendEnabled);
  await dumpPage(page, 'before-send-otp');
  if (!sendEnabled) {
    throw new Error('CampaignBot Send OTP stayed disabled. The mobile number may not have registered on the form.');
  }
  await sendOtp.click();
  cbLog('fillLoginPhone clicked Send OTP');

  const otpBox = page.locator('input.otp-box').first();
  await otpBox.waitFor({ state: 'visible', timeout: 25000 });
  cbLog('fillLoginPhone OTP boxes appeared');
  await dumpPage(page, 'after-send-otp');
}

async function loginModalVisible(page) {
  const modal = page.locator('div.fixed.inset-0.z-50').filter({ has: page.locator('input.otp-box') });
  return modal.first().isVisible().catch(() => false);
}

async function sessionLeftLogin(page) {
  if (await loginModalVisible(page)) return false;
  if (page.url().includes('/login')) return false;
  if (await pageLooksLikeOtp(page)) return false;
  return true;
}

async function readOtpSnap(page) {
  return page.evaluate(() => {
    const boxes = [...document.querySelectorAll('div.fixed.inset-0 input.otp-box')];
    return {
      pattern: boxes.map((el) => (el.value ? 'x' : '_')).join(''),
      valuesLen: boxes.map((el) => (el.value || '').length),
      disabled: boxes.map((el) => el.disabled),
      active: boxes.findIndex((el) => el === document.activeElement),
    };
  });
}

async function fillOtpViaDom(page, digits) {
  const code = String(digits);
  const snaps = [];
  for (let i = 0; i < code.length; i++) {
    const one = await page.evaluate(({ idx, d }) => {
      const el = document.querySelectorAll('div.fixed.inset-0 input.otp-box')[idx];
      if (!el) return { ok: false, reason: 'missing box' };
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, d);
      const keyOpts = {
        key: d,
        code: `Digit${d}`,
        keyCode: 48 + Number(d),
        which: 48 + Number(d),
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      el.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: d,
        inputType: 'insertText',
      }));
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
      return { ok: true, valueLen: (el.value || '').length, disabled: el.disabled };
    }, { idx: i, d: code[i] });
    snaps.push(one);
    await sleep(180);
  }
  return { snaps, ...(await readOtpSnap(page)) };
}

async function submitLoginForm(page) {
  cbLog('submitLoginForm start', { url: page.url() });
  await dumpPage(page, 'before-signup-click');
  const clicked = await page.evaluate(() => {
    const form = document.querySelector('div.fixed.inset-0 form') || document.querySelector('form');
    if (!form) return { ok: false, reason: 'no form' };
    const btn = [...form.querySelectorAll('button')].find((b) => /sign up/i.test(b.textContent || ''));
    if (btn) {
      btn.disabled = false;
      btn.click();
      return { ok: true, via: 'button.click', text: (btn.textContent || '').trim() };
    }
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return { ok: true, via: 'requestSubmit' };
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { ok: true, via: 'submit-event' };
  });
  cbLog('submitLoginForm result', clicked);
  if (!clicked?.ok) {
    const modal = page.locator('div.fixed.inset-0.z-50').filter({ has: page.locator('form') });
    await modal.locator('button[type="submit"]').filter({ hasText: 'Sign Up' }).first().click({ force: true });
    cbLog('submitLoginForm fallback Playwright click Sign Up');
  }
  await sleep(800);
  await dumpPage(page, 'after-signup-click');
}

async function fillLoginOtp(page, otp) {
  const digits = String(otp).replace(/\D/g, '').slice(0, 6);
  cbLog('fillLoginOtp start', { otp: cbAuth.maskOtp(digits), length: digits.length, url: page.url() });
  if (digits.length !== 6) throw new Error('CampaignBot OTP must be 6 digits');

  const boxes = page.locator('div.fixed.inset-0 input.otp-box');
  await boxes.first().waitFor({ state: 'visible', timeout: 20000 });
  await dumpPage(page, 'otp-boxes-ready');

  const startedAt = Date.now();
  page._cbVerifyOtp = null;

  await boxes.first().click();
  for (let i = 0; i < digits.length; i++) {
    const box = boxes.nth(i);
    const unlock = Date.now() + 3000;
    while (Date.now() < unlock && await box.isDisabled().catch(() => true)) await sleep(50);
    const disabled = await box.isDisabled().catch(() => true);
    cbLog(`fillLoginOtp box ${i}`, { disabled, ...(await readOtpSnap(page)) });
    if (disabled) {
      cbLog(`fillLoginOtp box ${i} still disabled — stopping keyboard loop`);
      break;
    }
    await box.click();
    await page.keyboard.type(digits[i], { delay: 30 });
    await sleep(200);
    cbLog(`fillLoginOtp after box ${i}`, await readOtpSnap(page));
  }

  // CampaignBot auto-calls verify-otp on the 6th digit. Do not click Sign Up
  // or re-type digits — that resubmits an already-consumed / expired OTP.
  const verifyDeadline = Date.now() + 8000;
  while (Date.now() < verifyDeadline) {
    if (await sessionLeftLogin(page) || !page.url().includes('/login')) {
      cbLog('fillLoginOtp success: left login after 6th digit');
      return { ok: true };
    }
    const v = page._cbVerifyOtp;
    if (v && v.at >= startedAt) {
      cbLog('fillLoginOtp verify-otp seen', v);
      if (v.expired || /expired/i.test(await page.locator('body').innerText().catch(() => ''))) {
        return { expired: true };
      }
      if (v.ok) return { ok: true };
      if (v.invalid) return { invalid: true, message: v.message };
      if (v.statusCode >= 400) return { invalid: true, message: v.message };
      break;
    }
    await sleep(150);
  }

  if (await sessionLeftLogin(page)) return { ok: true };

  const body = await page.locator('body').innerText().catch(() => '');
  if (/OTP has expired/i.test(body)) return { expired: true };

  const snap = await readOtpSnap(page);
  if (snap.pattern === 'xxxxxx') {
    cbLog('fillLoginOtp 6 digits filled, clicking Sign Up once');
    await submitLoginForm(page);
    const after = Date.now() + 8000;
    while (Date.now() < after) {
      if (await sessionLeftLogin(page)) return { ok: true };
      const v = page._cbVerifyOtp;
      if (v?.expired) return { expired: true };
      if (v?.ok) return { ok: true };
      if (v?.invalid) return { invalid: true, message: v.message };
      await sleep(200);
    }
  }

  await dumpPage(page, 'after-otp-attempt');
  if (await sessionLeftLogin(page)) return { ok: true };
  return { failed: true };
}

async function clickResendOtp(page) {
  const resend = page.locator('div.fixed.inset-0 button').filter({ hasText: /Resend OTP/i }).first();
  const send = page.locator('div.fixed.inset-0 button').filter({ hasText: /^\s*Send OTP\s*$/ }).first();
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await resend.isEnabled().catch(() => false)) {
      await resend.click();
      cbLog('clicked Resend OTP');
      await sleep(800);
      return;
    }
    if (await send.isEnabled().catch(() => false)) {
      await send.click();
      cbLog('clicked Send OTP to refresh');
      await sleep(800);
      return;
    }
    await sleep(300);
  }
  throw new Error('Could not resend CampaignBot OTP');
}

async function waitForGeneratedOtp(page, afterTs, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (page._cbGeneratedOtp && page._cbGeneratedOtpAt >= afterTs) {
      return page._cbGeneratedOtp;
    }
    await sleep(100);
  }
  return page._cbGeneratedOtpAt >= afterTs ? page._cbGeneratedOtp : null;
}

async function waitAndFillOtp(page) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const afterTs = page._cbGeneratedOtpAt || 0;
    cbAuth.setCbAuth({
      phase: 'otp',
      message: attempt === 1
        ? 'Signing in to CampaignBot…'
        : 'Retrying CampaignBot sign-in with a new OTP…',
    });

    let otp = await waitForGeneratedOtp(page, attempt === 1 ? 0 : afterTs, 12000);
    if (!otp) {
      cbAuth.setCbAuth({
        phase: 'otp',
        message: 'Enter the 6-digit OTP from your SMS, then Verify OTP.',
      });
      otp = await cbAuth.waitForOtp();
    }
    if (!otp) throw new Error('OTP was not entered in time. Enter it in the sign-in card and retry.');

    cbLog('using OTP', { source: page._cbGeneratedOtp === otp ? 'generate-api' : 'user', otp: cbAuth.maskOtp(otp) });
    const result = await fillLoginOtp(page, otp);
    cbLog('fillLoginOtp result', result);
    if (result?.ok) return;

    if (result?.expired || result?.invalid || result?.failed) {
      cbAuth.setCbAuth({
        phase: 'otp',
        message: 'CampaignBot rejected the OTP. Requesting a new one…',
      });
      page._cbGeneratedOtp = null;
      const resendAt = Date.now();
      await clickResendOtp(page).catch((err) => cbLog('resend failed', { error: err.message }));
      page._cbGeneratedOtpAt = Math.max(page._cbGeneratedOtpAt || 0, resendAt);
      continue;
    }
  }
  throw new Error('CampaignBot login did not complete after several OTP attempts.');
}

async function ensureLoggedIn(page, experimentId) {
  attachNetworkLogger(page);
  cbLog('ensureLoggedIn start', { experimentId, url: page.url() });
  cbAuth.setCbAuth({
    phase: 'launching',
    experimentId: experimentId || null,
    message: 'Opening CampaignBot — enter the number and OTP in the sign-in card on this page.',
  });

  await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1200);
  await dumpPage(page, 'after-templates-goto');

  const screen = await waitForLoginOrApp(page);
  cbLog('waitForLoginOrApp', { screen, url: page.url() });
  if (screen === 'app' && await isLoggedIn(page)) {
    cbLog('already logged in');
    cbAuth.setCbAuth({ phase: 'ready', message: 'CampaignBot session ready' });
    return;
  }

  if (!page.url().includes('/login')) {
    await page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(800);
    cbLog('navigated to login', { url: page.url() });
    await dumpPage(page, 'login-page');
  }

  if (await pageLooksLikeOtp(page)) {
    cbLog('login screen is OTP');
    await waitAndFillOtp(page);
  } else {
    cbLog('login screen is phone');
    cbAuth.setCbAuth({
      phase: 'phone',
      message: 'Enter the 10-digit CampaignBot mobile number in the card, then Send OTP.',
    });
    const phone = await cbAuth.waitForPhone();
    if (!phone) throw new Error('CampaignBot number was not entered in time. Enter it in the sign-in card and retry.');
    await fillLoginPhone(page, phone);
    await waitAndFillOtp(page);
  }

  const deadline = Date.now() + 90000;
  let tick = 0;
  while (Date.now() < deadline) {
    tick += 1;
    const left = await sessionLeftLogin(page);
    const templates = await hasTemplatesUi(page);
    if (tick === 1 || tick % 5 === 0) {
      cbLog('post-otp wait', { tick, left, templates, url: page.url() });
      await dumpPage(page, `post-otp-${tick}`);
    }
    if (left || templates) {
      if (!page.url().includes('/templates')) {
        await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
        await sleep(1200);
      }
      if (await hasTemplatesUi(page)) {
        cbLog('login complete, templates UI visible');
        cbAuth.setCbAuth({ phase: 'ready', message: 'CampaignBot session saved. Creating templates.' });
        return;
      }
      if (await sessionLeftLogin(page) && !page.url().includes('/login')) {
        await sleep(2000);
        if (await hasTemplatesUi(page)) {
          cbLog('login complete after extra wait');
          cbAuth.setCbAuth({ phase: 'ready', message: 'CampaignBot session saved. Creating templates.' });
          return;
        }
      }
    }
    const retryOtp = cbAuth.peekPendingOtp();
    if (retryOtp && await loginModalVisible(page)) {
      cbLog('new OTP arrived during wait, retrying fillLoginOtp', { otp: cbAuth.maskOtp(retryOtp) });
      await fillLoginOtp(page, await cbAuth.waitForOtp(1000));
    }
    await sleep(1000);
  }
  await dumpPage(page, 'login-timeout');
  throw new Error('CampaignBot login did not complete. Check the OTP on this page and click Retry login.');
}

function resolvedCategory(variant) {
  const n = Number(variant?.variantNumber) || 0;
  if (n >= 1 && n <= 7) return 'UTILITY';
  if (n >= 8) return 'MARKETING';
  return String(variant?.category || 'MARKETING').toUpperCase() === 'UTILITY' ? 'UTILITY' : 'MARKETING';
}

async function modalScope(page) {
  const heading = page.getByRole('heading', { name: /Create New Template/i });
  const panel = page.locator('div.inline-block.align-bottom, div.inline-block').filter({ has: heading });
  if (await panel.count()) return panel.last();
  const dialog = page.locator('[role="dialog"]').filter({ has: heading });
  if (await dialog.count()) return dialog.last();
  const fixed = page.locator('div.fixed.inset-0').filter({ has: heading });
  if (await fixed.count()) return fixed.last();
  return page;
}

async function nativeFill(locator, value) {
  const str = String(value ?? '');
  if (!(await locator.count())) return false;
  await locator.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await setVueInput(locator.first(), str);
  return true;
}

async function setSelectValue(scope, selector, value) {
  const el = scope.locator(selector).first();
  if (!(await el.count())) return false;
  await el.selectOption(value).catch(() => {});
  await el.evaluate((node, val) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(node, val);
    node.value = val;
    const opt = [...node.options].find((o) => o.value === val);
    if (opt) opt.selected = true;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  return true;
}

async function dumpCreateForm(page, label) {
  try {
    const info = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('h3')].find((h) => /Create New Template/i.test(h.textContent || ''));
      const root = heading?.closest('div.inline-block') || heading?.closest('[role="dialog"]') || document;
      const q = (sel) => root.querySelector(sel) || document.querySelector(sel);
      const unsub = q('#includeUnsubscribeFooter');
      const createBtn = [...(root.querySelectorAll?.('button') || document.querySelectorAll('button'))].find((b) =>
        /create template/i.test((b.textContent || '').replace(/\s+/g, ' '))
      );
      return {
        hasHeading: Boolean(heading),
        rootTag: root === document ? 'document' : (root.tagName || ''),
        name: q('#name')?.value ?? null,
        category: q('#category')?.value ?? null,
        format: q('#templateFormat')?.value ?? null,
        header: q('#headerType')?.value ?? null,
        footer: q('#footerType')?.value ?? null,
        body: (q('#body')?.value || q('[contenteditable="true"]')?.innerText || '').slice(0, 160),
        language: (q('#languageTrigger')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        unsub: unsub ? { disabled: unsub.disabled, checked: unsub.checked } : null,
        examples: [...document.querySelectorAll('input[placeholder*="xample" i], input[placeholder*="variable" i]')].map((e) => ({
          ph: e.placeholder, v: e.value, disabled: e.disabled, visible: e.offsetParent !== null,
        })),
        urls: [...document.querySelectorAll('input[type="url"], input[placeholder*="http"], input[placeholder*="url" i]')].map((e) => ({
          v: e.value, ph: e.placeholder, visible: e.offsetParent !== null,
        })),
        createDisabled: createBtn?.disabled ?? null,
        createText: (createBtn?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      };
    });
    cbLog(`form:${label}`, info);
  } catch (err) {
    cbLog(`form:${label} FAILED`, { error: err.message });
  }
}

async function openCreateModal(page) {
  await closeModalIfOpen(page);
  await sleep(500);

  if (!(await hasTemplatesUi(page))) {
    throw new Error('LOGIN_REQUIRED');
  }

  if (!page.url().includes('/templates')) {
    await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(1000);
  }

  const heading = page.getByRole('heading', { name: /Create New Template/i });
  const newTpl = page.locator('button[title="Create a new template"]');
  if (await newTpl.count()) {
    await newTpl.first().scrollIntoViewIfNeeded().catch(() => {});
    await newTpl.first().click({ force: true });
  } else {
    const byText = page.locator('button').filter({ hasText: /^\s*New Template\s*$/i }).first();
    await byText.scrollIntoViewIfNeeded().catch(() => {});
    await byText.click({ force: true });
  }
  await heading.waitFor({ state: 'visible', timeout: 25000 });
  await page.locator('#name').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#category').waitFor({ state: 'visible', timeout: 10000 });
  await sleep(400);
}

async function selectLanguage(form, code) {
  const value = code || 'en_US';
  const label = LANG_LABEL[value] || 'English (US)';

  const named = form.locator('#language, select[name="language"]').first();
  if (await named.count()) {
    await setSelectValue(form, '#language', value);
    await named.selectOption(value).catch(() => {});
    cbLog('selectLanguage', { via: 'named-select', value });
  }

  const trigger = form.locator('#languageTrigger');
  if (!(await trigger.count())) return;
  const shown = (await trigger.innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (shown.toLowerCase().includes(label.toLowerCase()) || shown.includes(`(${value})`)) {
    cbLog('selectLanguage', { via: 'already', value, shown });
    return;
  }

  await trigger.click();
  await sleep(300);
  const opt = form.getByRole('option', { name: new RegExp(label.replace(/[()]/g, '\\$&'), 'i') });
  if (await opt.count() && await opt.first().isVisible().catch(() => false)) {
    await opt.first().click();
    cbLog('selectLanguage', { via: 'option', value });
    return;
  }

  const matches = form.locator('li, [role="option"], button, div, span').filter({
    hasText: new RegExp(`^\\s*${label.replace(/[()]/g, '\\$&')}\\s*$`),
  });
  const n = await matches.count();
  for (let i = 0; i < n; i++) {
    const el = matches.nth(i);
    const tag = await el.evaluate((node) => node.tagName).catch(() => '');
    if (tag === 'OPTION') continue;
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      cbLog('selectLanguage', { via: 'dropdown', value });
      return;
    }
  }
  cbLog('selectLanguage skipped', { value, shown });
}

async function pickCategory(form, category) {
  const sel = form.locator('#category').first();
  await sel.waitFor({ state: 'visible', timeout: 10000 });
  await sel.selectOption(category).catch(() => {});
  await sel.evaluate((el, val) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(el, val);
    el.value = val;
    const opt = [...el.options].find((o) => o.value === val);
    if (opt) opt.selected = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    let n = el;
    while (n) {
      const inst = n.__vueParentComponent;
      if (inst) {
        for (const bag of [inst.setupState, inst.ctx, inst.proxy]) {
          if (!bag || typeof bag !== 'object') continue;
          for (const key of Object.keys(bag)) {
            if (/categor/i.test(key) && typeof bag[key] === 'string') {
              try { bag[key] = val; } catch { /* ignore */ }
            }
          }
        }
      }
      n = n.parentElement;
    }
  }, category);

  const unsub = form.locator('#includeUnsubscribeFooter');
  for (let i = 0; i < 16; i++) {
    const val = await sel.inputValue().catch(() => '');
    const enabled = await unsub.isEnabled({ timeout: 400 }).catch(() => null);
    if (val === category && category === 'UTILITY' && enabled === false) {
      cbLog('selectCategory', { value: category, via: 'select+unsub-disabled', attempt: i });
      return true;
    }
    if (val === category && category === 'MARKETING' && (enabled === true || enabled === null)) {
      cbLog('selectCategory', { value: category, via: 'select+unsub-enabled', attempt: i });
      return true;
    }
    if (val === category && i > 5) {
      cbLog('selectCategory', { value: category, via: 'select-value', attempt: i, unsubEnabled: enabled });
      return true;
    }
    // Re-fire change if Vue ignored the first select
    if (i === 4 || i === 9) {
      await sel.selectOption(category).catch(() => {});
      await sel.dispatchEvent('change').catch(() => {});
    }
    await sleep(150);
  }
  const finalVal = await sel.inputValue().catch(() => '');
  cbLog('selectCategory soft-fail', { wanted: category, current: finalVal });
  return finalVal === category;
}

async function applyUnsubscribeFooter(form, category) {
  const unsub = form.locator('#includeUnsubscribeFooter');
  if (!(await unsub.count())) return;

  await sleep(300);
  if (category === 'MARKETING') {
    for (let i = 0; i < 12; i++) {
      if (await unsub.isEnabled().catch(() => false)) break;
      await sleep(150);
    }
    if (await unsub.isEnabled().catch(() => false) && !(await unsub.isChecked())) {
      await unsub.check();
    }
  } else if (await unsub.isEnabled().catch(() => false) && await unsub.isChecked()) {
    await unsub.uncheck().catch(() => {});
  }

  cbLog('unsubscribe footer', {
    category,
    checked: await unsub.isChecked().catch(() => null),
    enabled: await unsub.isEnabled().catch(() => null),
  });
}

function uniqueTemplateName(variant, attempt = 0) {
  const base = (variant.templateName || `picoso_var_${variant.variantNumber || Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'picoso_tpl';
  const suffix = attempt > 0
    ? `_${Date.now().toString(36).slice(-4)}${attempt}`
    : '';
  return `${base}${suffix}`.slice(0, 512);
}

function safeBody(variant) {
  let body = String(variant.body || variant.message || '').trim();
  body = body.replace(/\{\{name\}\}/gi, '{{1}}');
  if (!body) body = 'Hey {{1}}, thanks for being with Picoso. Reply for help with your order.';
  if (!/\{\{1\}\}/.test(body)) body = `Hey {{1}}! ${body}`;
  // CampaignBot rejects emoji / odd unicode in some categories — keep ASCII-ish
  body = body.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return body.slice(0, 1000);
}

async function fillBody(form, page, body) {
  const text = body || '';
  const editor = form.locator('[contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click({ force: true });
  await editor.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await sleep(100);

  // Prefer real typing — Vue listens to InputEvents from the contenteditable
  try {
    await editor.pressSequentially(text, { delay: 8 });
  } catch {
    await page.keyboard.insertText(text);
  }

  const got = (await editor.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  if (!got || got.length < Math.min(12, text.length / 2)) {
    await editor.evaluate((el, val) => {
      el.focus();
      el.innerHTML = '';
      el.textContent = val;
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: val,
      }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }, text);
  }

  const hidden = form.locator('#body');
  if (await hidden.count()) {
    await hidden.evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, val);
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, text);
  }
  await sleep(600);
}

async function fillVariableExamples(form, body, examples = {}) {
  const max = [...String(body).matchAll(/\{\{(\d+)\}\}/g)].reduce((m, x) => Math.max(m, parseInt(x[1], 10)), 0);
  if (!max) return;

  // Wait for CampaignBot to render example fields after detecting {{n}} in body
  const anyExample = form.locator('input[placeholder*="Example value" i], input[placeholder*="example value" i]');
  for (let i = 0; i < 20; i++) {
    if (await anyExample.first().isVisible().catch(() => false)) break;
    if (i === 6) {
      const addVar = form.getByRole('button', { name: /Add Variable/i });
      if (await addVar.count() && await addVar.first().isEnabled().catch(() => false)) {
        await addVar.first().click().catch(() => {});
      }
    }
    await sleep(200);
  }

  for (let n = 1; n <= max; n++) {
    let input = form.locator(`input[placeholder="Example value for variable ${n}"]`);
    if (!(await input.first().isVisible().catch(() => false))) {
      const addEx = form.getByRole('button', { name: /Add Example/i });
      if (await addEx.count()) await addEx.first().click().catch(() => {});
      await input.first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
    }
    if (!(await input.first().isVisible().catch(() => false))) {
      input = anyExample.nth(n - 1);
    }
    const value = String(examples[n] || examples[String(n)] || (n === 1 ? 'Rahul' : 'your order')).slice(0, 60);
    if (await input.first().isVisible().catch(() => false)) {
      await setVueInput(input.first(), value);
    }
  }

  const leftoverCount = await anyExample.count();
  for (let i = 0; i < leftoverCount; i++) {
    const el = anyExample.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const existing = await el.inputValue().catch(() => '');
    if (!existing) await setVueInput(el, i === 0 ? 'Rahul' : 'your order');
  }
}

async function fillNearLabel(scope, re, value) {
  if (!value) return false;
  const label = scope.locator('label').filter({ hasText: re }).first();
  if (!(await label.count())) return false;
  const forId = await label.getAttribute('for');
  const input = forId
    ? scope.locator(`[id="${forId}"]`)
    : label.locator('xpath=following::input[1]');
  if (await input.count() && await input.first().isVisible().catch(() => false)) {
    await setVueInput(input.first(), String(value));
    return true;
  }
  return false;
}

async function fillButtons(form, variant) {
  const btn = (variant.buttons && variant.buttons[0]) || {
    type: 'URL',
    text: variant.cta || 'Order Now',
    url: 'https://picoso.in',
  };
  const text = String(btn.text || 'Order Now').slice(0, 25);
  const url = String(btn.url || 'https://picoso.in');

  await setSelectValue(form, '#footerType', 'BUTTONS');
  await sleep(500);

  const buttonLabel = form.locator('label').filter({ hasText: /button text/i }).first();
  await buttonLabel.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

  await fillNearLabel(form, /button text/i, text);
  await fillNearLabel(form, /\b(url|website|link)\b/i, url);

  // Fill every visible URL-ish input in the modal (CampaignBot labels vary)
  const urlInputs = form.locator('input[type="url"], input[placeholder*="http" i], input[placeholder*="URL" i], input[placeholder*="website" i]');
  const n = await urlInputs.count();
  for (let i = 0; i < n; i++) {
    const el = urlInputs.nth(i);
    if (await el.isVisible().catch(() => false)) await setVueInput(el, url);
  }

  // Fallback: any empty text input near "Button"
  const allInputs = form.locator('input[type="text"], input:not([type])');
  const count = await allInputs.count();
  for (let i = 0; i < count; i++) {
    const el = allInputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const ph = ((await el.getAttribute('placeholder')) || '').toLowerCase();
    const id = ((await el.getAttribute('id')) || '').toLowerCase();
    if (id === 'name' || id === 'body') continue;
    const val = await el.inputValue().catch(() => '');
    if (val) continue;
    if (/button|cta|text/.test(ph)) await setVueInput(el, text);
    else if (/http|url|website|link/.test(ph)) await setVueInput(el, url);
  }
}

async function closeModalIfOpen(page) {
  const heading = page.getByRole('heading', { name: /Create New Template/i });
  if (!(await heading.isVisible().catch(() => false))) return;

  const closeBtn = page.getByRole('button', { name: /close modal/i });
  if (await closeBtn.count() && await closeBtn.first().isVisible().catch(() => false)) {
    await closeBtn.first().click().catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
  await heading.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  // Force-remove stuck overlay so next New Template click works
  if (await heading.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].find((n) => /Create New Template/i.test(n.textContent || ''));
      const panel = h?.closest('div.fixed') || h?.closest('[role="dialog"]');
      panel?.remove();
    }).catch(() => {});
  }
  await sleep(300);
}

async function createButton(page) {
  const form = await modalScope(page);
  const inModal = form.getByRole('button', { name: /^Create Template$/i });
  if (await inModal.count()) return inModal.last();
  return page.getByRole('button', { name: /^Create Template$/i }).last();
}

async function waitCreateEnabled(page, timeoutMs = 8000) {
  const submit = await createButton(page);
  await submit.waitFor({ state: 'visible', timeout: 8000 });
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (!(await submit.isDisabled().catch(() => true))) return submit;
    await sleep(200);
  }
  return submit;
}

async function submitTemplate(page) {
  const submit = await waitCreateEnabled(page, 6000);
  if (await submit.isDisabled().catch(() => true)) {
    await dumpCreateForm(page, 'create-disabled');
    throw new Error('Create Template stayed disabled — a required field is empty or invalid');
  }
  await submit.click();

  const heading = page.getByRole('heading', { name: /Create New Template/i });
  try {
    await heading.waitFor({ state: 'hidden', timeout: 45000 });
  } catch {
    const errText = await page.locator('.text-red-600, .text-red-500, [class*="error"]').first().innerText().catch(() => '');
    throw new Error(errText || 'Create Template did not close — CampaignBot may have rejected the template');
  }
}

async function repairDisabledForm(page, form, variant, name, category, body) {
  cbLog('repairing disabled Create Template');
  await setVueInput(page.locator('#name'), name);
  await pickCategory(page, category);
  await setSelectValue(page, '#templateFormat', 'STANDARD');
  await setSelectValue(page, '#headerType', 'NONE');
  await fillBody(form, page, body);
  await fillVariableExamples(form, body, variant.variableExamples || { 1: 'Rahul' });

  // Prefer BUTTONS; if button fields never appear, fall back to NONE so Create can enable
  await setSelectValue(page, '#footerType', 'BUTTONS');
  await sleep(400);
  const hasBtn = await form.locator('label').filter({ hasText: /button text/i }).first().isVisible().catch(() => false);
  if (hasBtn) {
    await fillButtons(form, variant);
  } else {
    cbLog('button fields missing — falling back to footer NONE');
    await setSelectValue(page, '#footerType', 'NONE');
  }

  await applyUnsubscribeFooter(page, category);

  // Marketing must have Stop checked; click the label if check() no-ops
  if (category === 'MARKETING') {
    const unsub = page.locator('#includeUnsubscribeFooter');
    if (await unsub.count() && !(await unsub.isChecked().catch(() => false))) {
      await page.locator('label[for="includeUnsubscribeFooter"]').click().catch(() => {});
      await unsub.check({ force: true }).catch(() => {});
    }
  }

  // Nudge Vue validation by touching body again
  await page.locator('[contenteditable="true"]').first().click().catch(() => {});
  await sleep(300);
}

async function fillAndSubmit(page, variant, attempt = 0) {
  await openCreateModal(page);
  const form = await modalScope(page);
  const category = resolvedCategory(variant);
  const body = safeBody(variant);
  const name = uniqueTemplateName(variant, attempt);
  const examples = variant.variableExamples || { 1: 'Rahul' };

  cbLog('fillAndSubmit start', {
    label: variant.label,
    variantNumber: variant.variantNumber,
    category,
    name,
    attempt,
    bodyLen: body.length,
  });

  const nameField = page.locator('#name');
  await nameField.waitFor({ state: 'visible', timeout: 10000 });
  await setVueInput(nameField, name);
  if ((await nameField.inputValue().catch(() => '')) !== name) {
    await nameField.fill(name);
  }

  await pickCategory(page, category);
  await setSelectValue(page, '#templateFormat', 'STANDARD');
  await selectLanguage(form, variant.language || 'en_US');

  // Always NONE header — IMAGE/VIDEO blocks Create without media upload
  await setSelectValue(page, '#headerType', 'NONE');
  await sleep(200);

  await fillBody(form, page, body);
  await fillVariableExamples(form, body, examples);

  // Buttons with URL — most reliable CTA path on CampaignBot
  await fillButtons(form, variant);
  await applyUnsubscribeFooter(page, category);

  if (category === 'MARKETING') {
    const unsub = page.locator('#includeUnsubscribeFooter');
    for (let i = 0; i < 10; i++) {
      if (await unsub.isEnabled().catch(() => false) && await unsub.isChecked().catch(() => false)) break;
      await page.locator('label[for="includeUnsubscribeFooter"]').click().catch(() => {});
      await unsub.check({ force: true }).catch(() => {});
      await sleep(150);
    }
  }

  await dumpCreateForm(page, `pre-submit-${variant.label || variant.variantNumber}-a${attempt}`);

  let submit = await waitCreateEnabled(page, 5000);
  if (await submit.isDisabled().catch(() => true)) {
    await repairDisabledForm(page, form, variant, name, category, body);
    await dumpCreateForm(page, `repaired-${variant.label || variant.variantNumber}-a${attempt}`);
    submit = await waitCreateEnabled(page, 5000);
  }

  if (await submit.isDisabled().catch(() => true)) {
    // Last resort: drop buttons so only name+body+category(+stop) are required
    await setSelectValue(page, '#footerType', 'NONE');
    await applyUnsubscribeFooter(page, category);
    if (category === 'MARKETING') {
      await page.locator('#includeUnsubscribeFooter').check({ force: true }).catch(() => {});
    }
    await fillBody(form, page, body);
    await fillVariableExamples(form, body, examples);
    await dumpCreateForm(page, `fallback-none-${variant.label || variant.variantNumber}-a${attempt}`);
  }

  await submitTemplate(page);
  return name;
}

async function patchVariant(experimentId, variantNumber, fields) {
  const set = {};
  for (const [k, v] of Object.entries(fields)) set[`variants.$.${k}`] = v;
  await WpExperiment.updateOne(
    { _id: experimentId, 'variants.variantNumber': variantNumber },
    { $set: { ...set, updatedAt: new Date() } },
  );
}

export async function publishVariantsToCampaignBot(experimentId, variantNumbers = null) {
  cbLog('publish job requested', { experimentId, variantNumbers, busy });
  const waitUntil = Date.now() + 3 * 60 * 1000;
  while (busy && Date.now() < waitUntil) await sleep(1500);
  if (busy) {
    cbLog('publish job rejected: already running');
    throw new Error('A CampaignBot publish job is already running');
  }
  busy = true;
  cbAuth.resetCbAuth();
  cbAuth.setCbAuth({ phase: 'launching', experimentId, message: 'Starting CampaignBot on the server' });

  try {
    const experiment = await WpExperiment.findById(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    const variants = experiment.variants.filter((v) => {
      if (variantNumbers?.length) return variantNumbers.includes(v.variantNumber);
      return v.waPublishStatus !== 'published';
    });

    if (!variants.length) {
      return { published: 0, failed: 0, skipped: experiment.variants.length, results: [] };
    }

    for (const v of variants) {
      await patchVariant(experimentId, v.variantNumber, {
        waPublishStatus: 'publishing',
        waPublishError: '',
      });
    }

    const results = [];
    let context;
    cbAuth.setCbAuth({
      phase: 'launching',
      experimentId,
      message: 'Starting CampaignBot on the server',
    });
    try {
      context = await getPersistentContext();
      cbLog('browser launched');
    } catch (err) {
      cbLog('browser launch FAILED', { error: err.message });
      cbAuth.setCbAuth({ phase: 'error', message: err.message });
      for (const v of variants) {
        await patchVariant(experimentId, v.variantNumber, {
          waPublishStatus: 'failed',
          waPublishError: err.message,
        });
      }
      throw err;
    }

    const page = context.pages()[0] || await context.newPage();
    await ensureLoggedIn(page, experimentId);

    const MAX_ATTEMPTS = 5;

    async function tryPublishOne(v, attemptOffset = 0) {
      const plain = v.toObject ? v.toObject() : v;
      let lastErr = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          if (!(await isLoggedIn(page))) {
            await ensureLoggedIn(page, experimentId);
          }
          await closeModalIfOpen(page);
          if (!page.url().includes('/templates')) {
            await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
            await sleep(800);
          }
          const name = await fillAndSubmit(page, plain, attempt + attemptOffset);
          await patchVariant(experimentId, v.variantNumber, {
            waPublishStatus: 'published',
            waPublishError: '',
            waPublishedAt: new Date(),
            templateName: name,
          });
          console.log(`[CB Templates] published ${v.label} as ${name}`);
          return { variantNumber: v.variantNumber, ok: true, templateName: name };
        } catch (err) {
          lastErr = err;
          const needLogin = /LOGIN_REQUIRED|not logged in|login did not complete/i.test(err.message);
          console.error(`[CB Templates] ${v.label} attempt ${attempt + 1}/${MAX_ATTEMPTS}: ${err.message}`);
          await closeModalIfOpen(page);
          if (needLogin) {
            await ensureLoggedIn(page, experimentId);
          }
          await sleep(700 + attempt * 400);
        }
      }
      await patchVariant(experimentId, v.variantNumber, {
        waPublishStatus: 'failed',
        waPublishError: lastErr?.message || 'unknown',
      });
      return { variantNumber: v.variantNumber, ok: false, error: lastErr?.message || 'unknown' };
    }

    for (const v of variants) {
      results.push(await tryPublishOne(v));
      await sleep(800);
    }

    // Second sweep — anything still failed gets another full pass with unique names
    const failedNums = results.filter((r) => !r.ok).map((r) => r.variantNumber);
    if (failedNums.length) {
      cbLog('second sweep for failed variants', { failedNums });
      cbAuth.setCbAuth({
        phase: 'ready',
        experimentId,
        message: `Retrying ${failedNums.length} failed template(s)…`,
      });
      const fresh = await WpExperiment.findById(experimentId);
      for (const num of failedNums) {
        const v = fresh.variants.find((x) => x.variantNumber === num);
        if (!v || v.waPublishStatus === 'published') continue;
        await patchVariant(experimentId, num, { waPublishStatus: 'publishing', waPublishError: '' });
        const idx = results.findIndex((r) => r.variantNumber === num);
        const again = await tryPublishOne(v, 10);
        if (idx >= 0) results[idx] = again;
        else results.push(again);
      }
    }

    const published = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    cbAuth.setCbAuth({
      phase: failed ? 'error' : 'ready',
      experimentId,
      message: failed
        ? `Created ${published}/${results.length} templates — ${failed} still failed`
        : `All ${published} templates created on CampaignBot`,
    });

    return { published, failed, skipped: 0, results };
  } catch (err) {
    cbLog('publish job FAILED', { error: err.message, stack: err.stack?.split('\n').slice(0, 8) });
    cbAuth.setCbAuth({ phase: 'error', message: err.message });
    try {
      const exp = await WpExperiment.findById(experimentId);
      for (const v of exp?.variants || []) {
        if (v.waPublishStatus === 'publishing') {
          await patchVariant(experimentId, v.variantNumber, {
            waPublishStatus: 'failed',
            waPublishError: err.message,
          });
        }
      }
    } catch { /* ignore */ }
    throw err;
  } finally {
    busy = false;
  }
}
