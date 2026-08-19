/**
 * Runs on campaignbot.online. Claims queued Picoso templates and fills
 * the Create Template form in this tab. Status is reported to the API
 * so WP Marketing can show progress without opening extra windows.
 */

const LANG_LABEL = {
  en_US: 'English (US)',
  en_GB: 'English (UK)',
  hi: 'Hindi',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}) {
  const { pin, apiBase } = await chrome.storage.local.get(['pin', 'apiBase']);
  if (!pin || !apiBase) throw new Error('Open WP Marketing in this Chrome first so the helper can pick up your PIN.');
  const res = await fetch(`${apiBase.replace(/\/$/, '')}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-wp-pin': pin,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function heartbeat() {
  try {
    await api('/wp-marketing/helper/heartbeat', { method: 'POST', body: { onCampaignBot: true } });
  } catch { /* ignore */ }
}

function q(sel) {
  return document.querySelector(sel);
}

function setNativeValue(el, value) {
  if (!el) return;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function waitFor(fn, timeout = 25000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(200);
  }
  return null;
}

function headingCreateVisible() {
  return [...document.querySelectorAll('h1,h2,h3,h4')].some((h) => /Create New Template/i.test(h.textContent || ''));
}

async function openCreateModal() {
  if (headingCreateVisible()) return;
  const btns = [...document.querySelectorAll('button, a')];
  const match = btns.find((b) => /create (new )?template/i.test((b.textContent || '').trim()));
  if (match) match.click();
  const ok = await waitFor(headingCreateVisible, 20000);
  if (!ok) throw new Error('Could not open Create Template on CampaignBot. Stay on /templates and logged in.');
}

async function selectLanguage(code) {
  const trigger = q('#languageTrigger');
  if (!trigger) return;
  trigger.click();
  await sleep(250);
  const label = LANG_LABEL[code] || 'English (US)';
  const opt = [...document.querySelectorAll('button, [role="option"], li, div')].find((el) => {
    const t = (el.textContent || '').trim();
    return t.includes(label) || (code === 'en_US' && /English \(US\)/i.test(t));
  });
  if (opt) opt.click();
  await sleep(200);
}

async function fillBody(body) {
  const editor = document.querySelector('[contenteditable="true"]');
  if (editor) {
    editor.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, body || '');
  }
  const hidden = q('#body');
  if (hidden) {
    hidden.value = body || '';
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function fillByLabel(re, value) {
  if (!value) return;
  const labels = [...document.querySelectorAll('label')];
  const lab = labels.find((l) => re.test(l.textContent || ''));
  if (!lab) return;
  const id = lab.getAttribute('for');
  const input = (id && document.getElementById(id)) || lab.parentElement?.querySelector('input, textarea');
  if (input) setNativeValue(input, value);
}

async function submitTemplate() {
  const btns = [...document.querySelectorAll('button')];
  const submit = [...btns].reverse().find((b) => /^Create Template$/i.test((b.textContent || '').trim()));
  if (!submit) throw new Error('Create Template button not found');
  for (let i = 0; i < 20; i++) {
    if (!submit.disabled) break;
    await sleep(250);
  }
  if (submit.disabled) throw new Error('Create Template stayed disabled — a required field is empty');
  submit.click();
  const closed = await waitFor(() => !headingCreateVisible(), 30000);
  if (!closed) {
    const err = document.querySelector('.text-red-600, .text-red-500, [class*="error"]');
    throw new Error(err?.innerText || 'CampaignBot did not accept the template');
  }
}

async function fillAndSubmit(variant) {
  await openCreateModal();
  const name = String(variant.templateName || `picoso_var_${variant.variantNumber || Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 512);

  const nameEl = q('#name');
  if (!nameEl) throw new Error('Template name field (#name) not found');
  setNativeValue(nameEl, name);

  const cat = q('#category');
  if (cat) {
    cat.value = variant.category || 'MARKETING';
    cat.dispatchEvent(new Event('change', { bubbles: true }));
  }

  await selectLanguage(variant.language || 'en_US');

  const headerType = variant.headerType || 'NONE';
  const ht = q('#headerType');
  if (ht) {
    ht.value = headerType;
    ht.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(250);
  }
  if (headerType === 'TEXT') fillByLabel(/header text/i, variant.headerText);

  await fillBody(variant.body || variant.message || '');

  const footerType = variant.footerType || 'BUTTONS';
  const ft = q('#footerType');
  if (ft) {
    ft.value = footerType;
    ft.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(350);
  }
  if (footerType === 'TEXT') fillByLabel(/footer text/i, variant.footerText);
  if (footerType === 'BUTTONS') {
    const btn = (variant.buttons && variant.buttons[0]) || { type: 'URL', text: variant.cta || 'Order Now', url: 'https://picoso.in' };
    fillByLabel(/button text/i, btn.text);
    fillByLabel(/^(url|website|link)/i, btn.url || 'https://picoso.in');
    const urlInput = document.querySelector('input[placeholder*="http"], input[placeholder*="URL"], input[placeholder*="url"]');
    if (urlInput) setNativeValue(urlInput, btn.url || 'https://picoso.in');
  }

  await submitTemplate();
  return name;
}

let running = false;

async function loop() {
  if (running) return;
  running = true;
  try {
    await heartbeat();
    if (!/campaignbot\.online/i.test(location.hostname)) return;
    const { job } = await api('/wp-marketing/publish-queue/claim', { method: 'POST', body: {} });
    if (!job) return;
    try {
      const templateName = await fillAndSubmit(job.variant);
      await api(`/wp-marketing/experiments/${job.experimentId}/variants/${job.variantNumber}/publish-result`, {
        method: 'POST',
        body: { ok: true, templateName },
      });
    } catch (err) {
      await api(`/wp-marketing/experiments/${job.experimentId}/variants/${job.variantNumber}/publish-result`, {
        method: 'POST',
        body: { ok: false, error: err.message || String(err) },
      });
      const closeBtn = [...document.querySelectorAll('button')].find((b) => /close modal|^cancel$/i.test(b.textContent || '') || b.getAttribute('aria-label') === 'Close modal');
      closeBtn?.click();
      await sleep(400);
    }
  } catch {
    /* no pin yet, or network */
  } finally {
    running = false;
  }
}

heartbeat();
setInterval(heartbeat, 8000);
setInterval(loop, 2500);
loop();
