/**
 * Drive CampaignBot's template UI via Playwright → existing Edge (CDP).
 * Target: https://campaignbot.online/templates
 *
 * Edge must already be running with:
 *   msedge.exe --remote-debugging-port=9222 --user-data-dir="C:\edge-automation"
 */

import { chromium } from 'playwright';
import { WpExperiment } from '../models/wpMarketingModels.js';

const CDP_URL     = process.env.EDGE_CDP_URL || 'http://localhost:9222';
const TEMPLATES   = 'https://campaignbot.online/templates';
const LANG_LABEL  = {
  en_US: 'English (US)',
  en_GB: 'English (UK)',
  hi:    'Hindi',
};

let busy = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function checkEdgeCdp() {
  try {
    const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 4000 });
    const ctx = browser.contexts()[0];
    const pages = ctx?.pages() || [];
    const urls = pages.map((p) => p.url());
    const onTemplates = urls.some((u) => u.includes('campaignbot.online'));
    try { await browser.close(); } catch { /* disconnect only */ }
    return {
      connected: true,
      pageCount: pages.length,
      onCampaignBot: onTemplates,
      urls,
    };
  } catch {
    return {
      connected: false,
      pageCount: 0,
      onCampaignBot: false,
      error: `Cannot reach Edge at ${CDP_URL}. Close extra Edge windows, then run backend/scripts/start-edge-cdp.ps1 and log in to CampaignBot.`,
    };
  }
}

async function attachPage() {
  const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 8000 });
  const context = browser.contexts()[0];
  if (!context) throw new Error('Edge is open but has no context — relaunch with start-edge-cdp.ps1');

  let page = context.pages().find((p) => p.url().includes('campaignbot.online')) || context.pages()[0];
  if (!page) page = await context.newPage();

  if (!page.url().includes('campaignbot.online/templates')) {
    await page.goto(TEMPLATES, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/Business Sign Up|Start with Mobile Number/i.test(bodyText)) {
    throw new Error('CampaignBot login screen is showing in Edge. Log in on that Edge window, then retry.');
  }

  return { browser, page };
}

async function openCreateModal(page) {
  const heading = page.getByRole('heading', { name: /Create New Template/i });
  if (await heading.isVisible().catch(() => false)) return;

  const candidates = [
    page.getByRole('button', { name: /create new template/i }),
    page.getByRole('button', { name: /^create template$/i }),
    page.getByRole('button', { name: /new template/i }),
    page.locator('button').filter({ hasText: /create/i }).first(),
  ];
  for (const btn of candidates) {
    if (await btn.count() && await btn.first().isVisible().catch(() => false)) {
      await btn.first().click();
      break;
    }
  }
  await heading.waitFor({ state: 'visible', timeout: 20000 });
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
  await page.keyboard.press('Control+A');
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

async function fillOptionalByLabel(page, labelRe, value) {
  if (!value) return;
  const input = page.getByLabel(labelRe).first();
  if (await input.count() && await input.isVisible().catch(() => false)) {
    await input.fill(String(value));
  }
}

async function submitTemplate(page) {
  const submit = page.getByRole('button', { name: /^Create Template$/i }).last();
  await submit.waitFor({ state: 'visible', timeout: 8000 });
  for (let i = 0; i < 12; i++) {
    if (!(await submit.isDisabled())) break;
    await sleep(250);
  }
  if (await submit.isDisabled()) {
    throw new Error('Create Template stayed disabled — a required field is empty or invalid');
  }
  await submit.click();

  const heading = page.getByRole('heading', { name: /Create New Template/i });
  try {
    await heading.waitFor({ state: 'hidden', timeout: 25000 });
  } catch {
    const errText = await page.locator('.text-red-600, .text-red-500, [class*="error"]').first().innerText().catch(() => '');
    throw new Error(errText || 'Create Template did not close — check the Edge window for a validation error');
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

  await selectLanguage(page, variant.language || 'en_US');

  const headerType = variant.headerType || 'NONE';
  if (await page.locator('#headerType').count()) {
    await page.selectOption('#headerType', headerType);
    await sleep(300);
  }
  if (headerType === 'TEXT') {
    await fillOptionalByLabel(page, /header text/i, variant.headerText);
  }

  await fillBody(page, variant.body || variant.message || '');

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

/**
 * Sequentially create each variant as a CampaignBot template in the attached Edge tab.
 */
export async function publishVariantsToCampaignBot(experimentId, variantNumbers = null) {
  if (busy) throw new Error('A CampaignBot publish job is already running');
  busy = true;

  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) {
    busy = false;
    throw new Error('Experiment not found');
  }

  const variants = experiment.variants.filter((v) => {
    if (variantNumbers?.length) return variantNumbers.includes(v.variantNumber);
    return v.waPublishStatus !== 'published';
  });

  if (!variants.length) {
    busy = false;
    return { published: 0, failed: 0, skipped: experiment.variants.length, results: [] };
  }

  for (const v of variants) {
    await patchVariant(experimentId, v.variantNumber, {
      waPublishStatus: 'publishing',
      waPublishError: '',
    });
  }

  const results = [];
  try {
    const { page } = await attachPage();

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
        console.log(`[CB Templates] ✓ ${v.label} → ${name}`);
        await sleep(1200);
      } catch (err) {
        await patchVariant(experimentId, v.variantNumber, {
          waPublishStatus: 'failed',
          waPublishError: err.message,
        });
        results.push({ variantNumber: v.variantNumber, ok: false, error: err.message });
        console.error(`[CB Templates] ✗ ${v.label}: ${err.message}`);
        // Close modal if it got stuck so the next variant can start
        const closeBtn = page.getByRole('button', { name: /close modal/i });
        if (await closeBtn.count()) await closeBtn.click().catch(() => {});
        const cancel = page.getByRole('button', { name: /^cancel$/i });
        if (await cancel.count() && await cancel.first().isVisible().catch(() => false)) {
          await cancel.first().click().catch(() => {});
        }
        await sleep(800);
      }
    }

    const published = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    return { published, failed, skipped: 0, results };
  } finally {
    busy = false;
  }
}
