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

function attachNetworkLogger(page) {
  if (page._cbNetLog) return;
  page._cbNetLog = true;
  page.on('response', async (res) => {
    const url = res.url();
    if (!/campaignbot\.online/i.test(url)) return;
    if (!/otp|verify|login|signup|auth|user|session|template/i.test(url)) return;
    let body = '';
    try { body = String(await res.text()).slice(0, 400); } catch { /* ignore */ }
    cbLog('http', { status: res.status(), url, body });
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

async function fillOtpViaDom(page, digits) {
  return page.evaluate((code) => {
    const form = document.querySelector('div.fixed.inset-0 form') || document.querySelector('form');
    if (!form) return { ok: false, reason: 'no form' };
    const boxes = [...form.querySelectorAll('input.otp-box')];
    if (!boxes.length) return { ok: false, reason: 'no boxes' };

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const fire = (el, digit) => {
      el.disabled = false;
      el.removeAttribute('disabled');
      el.focus();
      setter?.call(el, digit);
      const keyOpts = {
        key: digit,
        code: `Digit${digit}`,
        keyCode: 48 + Number(digit),
        which: 48 + Number(digit),
        bubbles: true,
        cancelable: true,
      };
      el.dispatchEvent(new KeyboardEvent('keydown', keyOpts));
      el.dispatchEvent(new KeyboardEvent('keypress', keyOpts));
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: digit,
        inputType: 'insertText',
      }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', keyOpts));
    };

    const vueOf = (el) => {
      let n = el;
      while (n) {
        const inst = n.__vueParentComponent;
        if (inst) return inst;
        if (n.__vue__) return n.__vue__;
        n = n.parentElement;
      }
      return null;
    };

    const inst = vueOf(form);
    const bags = [];
    if (inst) {
      bags.push(inst.setupState, inst.ctx, inst.proxy, inst.data, inst);
    }
    const writeBag = (bag) => {
      for (const key of Object.keys(bag)) {
        const val = bag[key];
        if (val && typeof val === 'object' && 'value' in val && !Array.isArray(val)) {
          const inner = val.value;
          if (Array.isArray(inner) && inner.length >= 4 && inner.length <= 8) {
            val.value = code.split('').concat(Array(Math.max(0, inner.length - code.length)).fill(''));
          } else if (typeof inner === 'string' && /otp|code|pin/i.test(key)) {
            val.value = code;
          }
          continue;
        }
        if (Array.isArray(val) && val.length >= 4 && val.length <= 8) {
          for (let i = 0; i < val.length; i++) val[i] = code[i] || '';
        } else if (typeof val === 'string' && /otp|code|pin/i.test(key) && val.length <= 8) {
          bag[key] = code;
        }
      }
    };
    for (const bag of bags.filter(Boolean)) {
      try { writeBag(bag); } catch { /* ignore */ }
    }

    code.split('').forEach((d, i) => {
      if (boxes[i]) fire(boxes[i], d);
    });

    return {
      ok: true,
      values: boxes.map((el) => ({ value: el.value, disabled: el.disabled })),
      vueFound: Boolean(inst),
      vueKind: inst?.setupState ? 'vue3' : (inst?.$data ? 'vue2' : (inst ? 'unknown' : null)),
      vueKeys: (() => {
        const keys = [];
        for (const bag of bags.filter(Boolean)) {
          try { keys.push(...Object.keys(bag).filter((k) => !k.startsWith('_') && !k.startsWith('$'))); } catch { /* ignore */ }
        }
        return [...new Set(keys)].slice(0, 40);
      })(),
    };
  }, digits);
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

  const first = page.locator('input.otp-box').first();
  await first.waitFor({ state: 'visible', timeout: 20000 });
  await dumpPage(page, 'otp-boxes-ready');

  for (let i = 0; i < digits.length; i++) {
    const box = page.locator('input.otp-box').nth(i);
    const unlock = Date.now() + 8000;
    let disabled = await box.isDisabled().catch(() => true);
    while (Date.now() < unlock && disabled) {
      await sleep(80);
      disabled = await box.isDisabled().catch(() => true);
    }
    cbLog(`fillLoginOtp box ${i}`, { disabled, digit: '*' });
    await box.click({ force: true });
    await box.focus();
    await page.keyboard.press('ControlOrMeta+A').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});
    await page.keyboard.type(digits[i], { delay: 40 });
    await sleep(220);
    const val = await box.inputValue().catch(() => '');
    cbLog(`fillLoginOtp box ${i} after type`, { valueLen: val.length, value: val ? '*' : '', stillDisabled: await box.isDisabled().catch(() => null) });
  }
  await sleep(400);
  await dumpPage(page, 'after-keyboard-otp');

  const result = await fillOtpViaDom(page, digits);
  cbLog('fillLoginOtp Vue/DOM fill', result);
  await sleep(250);
  await dumpPage(page, 'after-vue-otp');
  await submitLoginForm(page);

  const goneBy = Date.now() + 25000;
  while (Date.now() < goneBy) {
    const modal = await loginModalVisible(page);
    const url = page.url();
    cbLog('fillLoginOtp waiting for modal close', { modal, url });
    if (!modal && !url.includes('/login')) {
      cbLog('fillLoginOtp success: left login');
      return;
    }
    if (!url.includes('/login') && !(await pageLooksLikeOtp(page))) {
      cbLog('fillLoginOtp success: OTP UI gone');
      return;
    }
    await sleep(1000);
  }

  if (await loginModalVisible(page)) {
    cbLog('fillLoginOtp modal still open, clicking Sign Up again');
    await submitLoginForm(page);
    await sleep(1500);
    await dumpPage(page, 'after-second-signup');
  }
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
    cbAuth.setCbAuth({
      phase: 'otp',
      message: 'Enter the 6-digit OTP from your phone in the card on this page, then Verify OTP.',
    });
    const otp = await cbAuth.waitForOtp();
    if (!otp) throw new Error('OTP was not entered in time. Enter it in the sign-in card and retry.');
    await fillLoginOtp(page, otp);
  } else {
    cbLog('login screen is phone');
    cbAuth.setCbAuth({
      phase: 'phone',
      message: 'Enter the 10-digit CampaignBot mobile number in the card, then Send OTP.',
    });
    const phone = await cbAuth.waitForPhone();
    if (!phone) throw new Error('CampaignBot number was not entered in time. Enter it in the sign-in card and retry.');
    await fillLoginPhone(page, phone);
    cbAuth.setCbAuth({
      phase: 'otp',
      message: 'Enter the 6-digit OTP from your phone in the card on this page, then Verify OTP.',
    });
    const otp = await cbAuth.waitForOtp();
    if (!otp) throw new Error('OTP was not entered in time. Enter it in the sign-in card and retry.');
    await fillLoginOtp(page, otp);
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

async function openCreateModal(page) {
  const heading = page.getByRole('heading', { name: /Create New Template/i });
  if (await heading.isVisible().catch(() => false)) return;

  if (!(await hasTemplatesUi(page))) {
    throw new Error('LOGIN_REQUIRED');
  }

  const newTpl = page.locator('button[title="Create a new template"]');
  if (await newTpl.count()) {
    await newTpl.first().click();
  } else {
    const byText = page.locator('button').filter({ hasText: /^\s*New Template\s*$/i }).first();
    await byText.click();
  }
  await heading.waitFor({ state: 'visible', timeout: 25000 });
  await page.locator('#name').waitFor({ state: 'visible', timeout: 10000 });
}

async function selectLanguage(page, code) {
  const trigger = page.locator('#languageTrigger');
  if (!(await trigger.count())) return;
  await trigger.click();
  const label = LANG_LABEL[code] || 'English (US)';
  const option = page.getByText(new RegExp(label.replace(/[()]/g, '\\$&'), 'i')).first();
  await option.waitFor({ state: 'visible', timeout: 8000 });
  await option.click();
}

async function fillBody(page, body) {
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ state: 'visible', timeout: 10000 });
  await editor.click();
  await editor.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText(body || '');

  const hidden = page.locator('#body');
  if (await hidden.count()) {
    await hidden.evaluate((el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, body || '');
  }
}

async function fillVariableExamples(page, variant) {
  const body = variant.body || variant.message || '';
  const max = [...String(body).matchAll(/\{\{(\d+)\}\}/g)].reduce((m, x) => Math.max(m, parseInt(x[1], 10)), 0);
  if (!max) return;

  const examples = variant.variableExamples || { 1: 'Rahul' };

  for (let n = 1; n <= max; n++) {
    const input = page.locator(`input[placeholder="Example value for variable ${n}"]`);
    const heading = page.getByText(new RegExp(`Variable\\s*${n}\\s*Examples`, 'i')).first();

    const hasSection = await heading.isVisible().catch(() => false);
    if (!hasSection) {
      const addVar = page.getByRole('button', { name: /^Add Variable$/i });
      if (await addVar.count()) await addVar.first().click();
      await heading.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    }

    if (!(await input.first().isVisible().catch(() => false))) {
      const addEx = page.getByRole('button', { name: /Add Example/i });
      if (await addEx.count()) await addEx.first().click();
      await input.first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    }

    if (await input.first().isVisible().catch(() => false)) {
      const value = String(examples[n] || examples[String(n)] || (n === 1 ? 'Rahul' : 'your order')).slice(0, 60);
      await input.first().click();
      await input.first().fill('');
      await input.first().fill(value);
      await input.first().evaluate((el, val) => {
        const proto = HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    }
  }
}

async function fillOptionalByLabel(page, labelRe, value) {
  if (!value) return;
  const input = page.getByLabel(labelRe).first();
  if (await input.count() && await input.isVisible().catch(() => false)) {
    await input.fill(String(value));
  }
}

async function closeModalIfOpen(page) {
  const closeBtn = page.getByRole('button', { name: /close modal/i });
  if (await closeBtn.count()) await closeBtn.click().catch(() => {});
  const cancel = page.getByRole('button', { name: /^cancel$/i });
  if (await cancel.count() && await cancel.first().isVisible().catch(() => false)) {
    await cancel.first().click().catch(() => {});
  }
}

async function submitTemplate(page) {
  const submit = page.getByRole('button', { name: /^Create Template$/i }).last();
  await submit.waitFor({ state: 'visible', timeout: 8000 });
  for (let i = 0; i < 16; i++) {
    if (!(await submit.isDisabled())) break;
    await sleep(250);
  }
  if (await submit.isDisabled()) {
    throw new Error('Create Template stayed disabled — a required field is empty or invalid');
  }
  await submit.click();

  const heading = page.getByRole('heading', { name: /Create New Template/i });
  try {
    await heading.waitFor({ state: 'hidden', timeout: 30000 });
  } catch {
    const errText = await page.locator('.text-red-600, .text-red-500, [class*="error"]').first().innerText().catch(() => '');
    throw new Error(errText || 'Create Template did not close — CampaignBot may have rejected the template');
  }
}

async function fillAndSubmit(page, variant) {
  await openCreateModal(page);

  const name = (variant.templateName || `picoso_var_${variant.variantNumber || Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 512);

  await page.locator('#name').fill(name);

  if (await page.locator('#category').count()) {
    await page.selectOption('#category', variant.category || 'MARKETING');
  }
  if (await page.locator('#templateFormat').count()) {
    await page.selectOption('#templateFormat', 'STANDARD');
  }

  await selectLanguage(page, variant.language || 'en_US');

  let headerType = variant.headerType || 'NONE';
  if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) headerType = 'NONE';
  if (await page.locator('#headerType').count()) {
    await page.selectOption('#headerType', headerType);
    await sleep(300);
  }
  if (headerType === 'TEXT' && variant.headerText) {
    const header = String(variant.headerText).replace(/[^A-Za-z0-9 .,'!?-]/g, '').slice(0, 60);
    await fillOptionalByLabel(page, /header text/i, header);
  }

  await fillBody(page, variant.body || variant.message || '');
  await fillVariableExamples(page, variant);

  const footerType = variant.footerType || 'BUTTONS';
  if (await page.locator('#footerType').count()) {
    await page.selectOption('#footerType', footerType);
    await sleep(400);
  }

  if (footerType === 'TEXT') {
    await fillOptionalByLabel(page, /footer text/i, variant.footerText);
  }

  if (footerType === 'BUTTONS') {
    const btn = (variant.buttons && variant.buttons[0]) || {
      type: 'URL',
      text: variant.cta || 'Order Now',
      url: 'https://picoso.in',
    };
    await fillOptionalByLabel(page, /button text/i, btn.text);
    await fillOptionalByLabel(page, /^(url|website|link)/i, btn.url || 'https://picoso.in');
    const urlInput = page.locator('input[placeholder*="http"], input[placeholder*="URL"], input[placeholder*="url"]').first();
    if (await urlInput.count() && await urlInput.isVisible().catch(() => false)) {
      await urlInput.fill(btn.url || 'https://picoso.in');
    }
  }

  const unsub = page.locator('#includeUnsubscribeFooter');
  if (await unsub.count()) {
    const checked = await unsub.isChecked();
    const marketing = (variant.category || 'MARKETING') === 'MARKETING';
    if (marketing && !checked) await unsub.check();
    if (!marketing && checked) await unsub.uncheck();
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

    for (const v of variants) {
      let published = false;
      for (let attempt = 0; attempt < 2 && !published; attempt++) {
        try {
          if (!(await isLoggedIn(page))) {
            await ensureLoggedIn(page, experimentId);
          }
          const name = await fillAndSubmit(page, v.toObject ? v.toObject() : v);
          await patchVariant(experimentId, v.variantNumber, {
            waPublishStatus: 'published',
            waPublishError: '',
            waPublishedAt: new Date(),
            templateName: name,
          });
          results.push({ variantNumber: v.variantNumber, ok: true, templateName: name });
          console.log(`[CB Templates] published ${v.label} as ${name}`);
          published = true;
          await sleep(1000);
        } catch (err) {
          const needLogin = /LOGIN_REQUIRED|not logged in|login did not complete/i.test(err.message);
          if (needLogin && attempt === 0) {
            console.warn(`[CB Templates] ${v.label} needs login, waiting for number/OTP on WP Marketing`);
            await closeModalIfOpen(page);
            await ensureLoggedIn(page, experimentId);
            continue;
          }
          await patchVariant(experimentId, v.variantNumber, {
            waPublishStatus: 'failed',
            waPublishError: err.message,
          });
          results.push({ variantNumber: v.variantNumber, ok: false, error: err.message });
          console.error(`[CB Templates] failed ${v.label}: ${err.message}`);
          await closeModalIfOpen(page);
          await sleep(600);
        }
      }
    }

    return {
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => r.ok === false).length,
      skipped: 0,
      results,
    };
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
