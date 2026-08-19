/**
 * Create CampaignBot WhatsApp templates by driving the live UI.
 * Launches Microsoft Edge (persistent profile) automatically — no CDP / debug flag.
 * Session is saved in backend/.campaignbot-profile so later runs stay logged in.
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { WpExperiment } from '../models/wpMarketingModels.js';

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
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  };

  try {
    return await chromium.launchPersistentContext(PROFILE_DIR, common);
  } catch (err) {
    if (/Executable doesn't exist/i.test(err.message)) {
      throw new Error('Playwright Chromium is not installed on the server. In the backend folder run: npx playwright install chromium');
    }
    throw err;
  }
}

async function isLoggedIn(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  if (LOGIN_RE.test(text)) return false;
  if (await page.getByRole('heading', { name: /Create New Template/i }).isVisible().catch(() => false)) return true;
  if (await page.getByRole('button', { name: /new template/i }).count()) return true;
  if (await page.locator('button[title="Create a new template"]').count()) return true;
  if (await page.locator('#name').isVisible().catch(() => false)) return true;
  const url = page.url();
  return url.includes('campaignbot.online') && !/signup|login|auth/i.test(url) && text.length > 80;
}

async function ensureLoggedIn(page) {
  if (!page.url().includes('campaignbot.online')) {
    await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else if (!page.url().includes('/templates')) {
    await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  if (await isLoggedIn(page)) return;

  throw new Error('CampaignBot session is not logged in on the server. An admin needs to log in once using the saved server profile (backend/.campaignbot-profile). After that, templates are created in the background from this app.');
}

async function openCreateModal(page) {
  const heading = page.getByRole('heading', { name: /Create New Template/i });
  if (await heading.isVisible().catch(() => false)) return;

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
    try {
      context = await getPersistentContext();
    } catch (err) {
      for (const v of variants) {
        await patchVariant(experimentId, v.variantNumber, {
          waPublishStatus: 'failed',
          waPublishError: err.message,
        });
      }
      throw err;
    }

    const page = context.pages()[0] || await context.newPage();
    await ensureLoggedIn(page);

    for (const v of variants) {
      try {
        const name = await fillAndSubmit(page, v.toObject ? v.toObject() : v);
        await patchVariant(experimentId, v.variantNumber, {
          waPublishStatus: 'published',
          waPublishError: '',
          waPublishedAt: new Date(),
          templateName: name,
        });
        results.push({ variantNumber: v.variantNumber, ok: true, templateName: name });
        console.log(`[CB Templates] published ${v.label} as ${name}`);
        await sleep(1000);
      } catch (err) {
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

    return {
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => r.ok === false).length,
      skipped: 0,
      results,
    };
  } catch (err) {
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
