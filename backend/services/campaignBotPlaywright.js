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
const PROFILE_DIR = process.env.CB_PROFILE_DIR
  || path.join(process.cwd(), '.campaignbot-profile');

const LANG_LABEL = {
  en_US: 'English (US)',
  en_GB: 'English (UK)',
  hi:    'Hindi',
};

const LOGIN_RE = /Business Sign Up|Start with Mobile Number|ONLY 3 STEPS TO START|Enter OTP|Verify OTP/i;

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

async function pageLooksLikeLogin(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  if (LOGIN_RE.test(text)) return true;
  if (/Start with Mobile Number|Business Sign Up|ONLY 3 STEPS/i.test(text)) return true;
  if (await page.locator('input[type="tel"]').first().isVisible().catch(() => false)) return true;
  return false;
}

async function isLoggedIn(page) {
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
    if (await pageLooksLikeLogin(page)) return 'login';
    await sleep(400);
  }
  return 'login';
}

async function fillLoginPhone(page, phone) {
  const startBtn = page.getByRole('button', { name: /start with mobile|mobile number|get started/i }).first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await sleep(600);
  } else {
    const startText = page.getByText(/Start with Mobile Number/i).first();
    if (await startText.isVisible().catch(() => false)) {
      await startText.click();
      await sleep(600);
    }
  }

  const candidates = [
    page.locator('input[type="tel"]'),
    page.locator('input[placeholder*="obile" i]'),
    page.locator('input[placeholder*="phone" i]'),
    page.locator('input[placeholder*="number" i]'),
    page.locator('input[name*="phone" i]'),
    page.locator('input[id*="phone" i]'),
    page.locator('input[inputmode="numeric"]'),
    page.locator('input[type="text"]'),
  ];
  let input = null;
  const findEnd = Date.now() + 20000;
  while (Date.now() < findEnd && !input) {
    for (const loc of candidates) {
      if (await loc.first().isVisible().catch(() => false)) {
        input = loc.first();
        break;
      }
    }
    if (!input) await sleep(400);
  }
  if (!input) throw new Error('Could not find the CampaignBot mobile number field');
  await input.click();
  await input.fill('');
  await input.fill(phone);
  await sleep(300);
  const send = page.getByRole('button', { name: /otp|continue|start|send|next|submit|get started/i }).first();
  if (await send.isVisible().catch(() => false)) await send.click();
  else await input.press('Enter');
}

async function fillLoginOtp(page, otp) {
  const digits = String(otp).replace(/\D/g, '');
  const boxes = page.locator('input[maxlength="1"]');
  const boxCount = await boxes.count();
  if (boxCount >= 4) {
    for (let i = 0; i < Math.min(boxCount, digits.length); i++) {
      await boxes.nth(i).fill(digits[i]);
    }
  } else {
    const otpInput = page.locator('input[placeholder*="OTP" i], input[autocomplete="one-time-code"], input[name*="otp" i], input[id*="otp" i]').first();
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await otpInput.fill(digits);
  }
  const verify = page.getByRole('button', { name: /verify|continue|submit|login|confirm/i }).first();
  if (await verify.count()) await verify.click();
}

async function pageLooksLikeOtp(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  return /Enter OTP|Verify OTP|OTP sent|one.?time/i.test(text);
}

async function ensureLoggedIn(page, experimentId) {
  cbAuth.setCbAuth({
    phase: 'launching',
    experimentId: experimentId || null,
    message: 'Opening CampaignBot — enter the number and OTP in the sign-in card on this page.',
  });

  await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1200);

  const screen = await waitForLoginOrApp(page);
  if (screen === 'app' && await isLoggedIn(page)) {
    cbAuth.setCbAuth({ phase: 'ready', message: 'CampaignBot session ready' });
    return;
  }

  if (screen === 'otp' || await pageLooksLikeOtp(page)) {
    cbAuth.setCbAuth({
      phase: 'otp',
      message: 'Enter the OTP sent to your CampaignBot number in the card on this page.',
    });
    const otp = await cbAuth.waitForOtp();
    if (!otp) throw new Error('OTP was not entered in time. Enter it in the sign-in card and retry.');
    await fillLoginOtp(page, otp);
  } else {
    cbAuth.setCbAuth({
      phase: 'phone',
      message: 'Enter the CampaignBot mobile number in the card on this page, then Send OTP.',
    });
    const phone = await cbAuth.waitForPhone();
    if (!phone) throw new Error('CampaignBot number was not entered in time. Enter it in the sign-in card and retry.');
    await fillLoginPhone(page, phone);
    const otpScreenDeadline = Date.now() + 20000;
    while (Date.now() < otpScreenDeadline && !(await pageLooksLikeOtp(page)) && !(await isLoggedIn(page))) {
      await sleep(400);
    }
    if (!(await isLoggedIn(page))) {
      cbAuth.setCbAuth({
        phase: 'otp',
        message: 'Enter the OTP from your phone in the card on this page, then Verify OTP.',
      });
      const otp = await cbAuth.waitForOtp();
      if (!otp) throw new Error('OTP was not entered in time. Enter it in the sign-in card and retry.');
      await fillLoginOtp(page, otp);
    }
  }

  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (await isLoggedIn(page)) {
      if (!page.url().includes('/templates')) {
        await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
        await sleep(800);
      }
      if (await hasTemplatesUi(page)) {
        cbAuth.setCbAuth({ phase: 'ready', message: 'CampaignBot session saved. Creating templates.' });
        return;
      }
    }
    await sleep(1000);
  }
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
  const waitUntil = Date.now() + 3 * 60 * 1000;
  while (busy && Date.now() < waitUntil) await sleep(1500);
  if (busy) throw new Error('A CampaignBot publish job is already running');
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
    } catch (err) {
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
