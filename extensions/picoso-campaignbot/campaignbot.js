/**
 * Fills CampaignBot's "Create New Template" Headless UI modal
 * (fields: #name, #category, #templateFormat, #languageTrigger,
 *  #headerType, contenteditable body + #body, #footerType,
 *  #includeUnsubscribeFooter, Create Template).
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

function fire(el, type, extra = {}) {
  const Ev = type === 'input' ? InputEvent : Event;
  el.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true, ...extra }));
}

function setNativeValue(el, value) {
  if (!el) return;
  el.focus();
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  fire(el, 'input', { inputType: 'insertText', data: String(value) });
  fire(el, 'change');
  fire(el, 'blur');
}

function setSelect(el, value) {
  if (!el) return;
  const next = String(value);
  const opt = [...el.options].find((o) => o.value === next);
  if (opt) opt.selected = true;
  el.value = next;
  fire(el, 'input');
  fire(el, 'change');
}

async function waitFor(fn, timeout = 25000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(150);
  }
  return null;
}

function modalRoot() {
  const title = [...document.querySelectorAll('h3')].find((h) => /Create New Template/i.test(h.textContent || ''));
  return title?.closest('div.inline-block') || title?.parentElement?.parentElement || null;
}

function headingCreateVisible() {
  return !!modalRoot() || [...document.querySelectorAll('h3')].some((h) => /Create New Template/i.test(h.textContent || ''));
}

function createSubmitBtn() {
  const root = modalRoot() || document;
  return [...root.querySelectorAll('button')].find((b) => {
    const t = (b.textContent || '').replace(/\s+/g, ' ').trim();
    return t === 'Create Template';
  });
}

async function openCreateModal() {
  if (headingCreateVisible() && q('#name')) return;

  const byTitle = document.querySelector('button[title="Create a new template"]');
  const byText = [...document.querySelectorAll('button')].find((b) =>
    /\bNew Template\b/i.test((b.textContent || '').replace(/\s+/g, ' ').trim())
  );
  const btn = byTitle || byText;
  if (!btn) throw new Error('New Template button not found on CampaignBot.');
  if (btn.disabled) throw new Error('New Template is disabled on CampaignBot.');
  btn.click();

  const ok = await waitFor(() => headingCreateVisible() && q('#name'), 20000);
  if (!ok) throw new Error('Create New Template modal did not open.');
  await sleep(300);
}

async function selectLanguage(code) {
  const trigger = q('#languageTrigger');
  if (!trigger) return;
  const shown = (trigger.textContent || '').replace(/\s+/g, ' ');
  const label = LANG_LABEL[code] || 'English (US)';
  if (shown.includes(label) || shown.includes(`(${code})`)) return;

  trigger.click();
  await sleep(300);
  const opt = [...document.querySelectorAll('[role="option"], li, button, div')].find((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.includes(label) && t.length < 80;
  });
  if (opt) opt.click();
  await sleep(200);
}

function addVariableButton() {
  const root = modalRoot() || document;
  return [...root.querySelectorAll('button')].find((b) => /^\s*Add Variable\s*$/i.test((b.textContent || '').replace(/\s+/g, ' ').trim()));
}

function addExampleButton() {
  const root = modalRoot() || document;
  return [...root.querySelectorAll('button')].find((b) =>
    /\+\s*Add Example|Add Example/i.test((b.textContent || '').replace(/\s+/g, ' ').trim())
  );
}

function exampleInputFor(n) {
  const root = modalRoot() || document;
  return root.querySelector(`input[placeholder="Example value for variable ${n}"]`)
    || document.querySelector(`input[placeholder="Example value for variable ${n}"]`);
}

async function fillVariableExamples(body, examples = {}) {
  const max = [...String(body || '').matchAll(/\{\{(\d+)\}\}/g)].reduce((m, x) => Math.max(m, parseInt(x[1], 10)), 0);
  if (!max) return;

  let appeared = await waitFor(() => /Variable\s*1\s*Examples/i.test((modalRoot() || document).innerText || ''), 4000);
  if (!appeared) {
    addVariableButton()?.click();
    await sleep(400);
    appeared = await waitFor(() => /Variable\s*1\s*Examples/i.test((modalRoot() || document).innerText || ''), 4000);
  }

  for (let n = 1; n <= max; n++) {
    let input = exampleInputFor(n);
    if (!input) {
      addExampleButton()?.click();
      await sleep(300);
      input = await waitFor(() => exampleInputFor(n), 3000);
    }
    const value = examples[n] || examples[String(n)] || (n === 1 ? 'Rahul' : 'your order');
    if (input) setNativeValue(input, String(value).slice(0, 60));
  }

  const leftovers = [...(modalRoot() || document).querySelectorAll('input')].filter((el) =>
    /example value for variable/i.test(el.placeholder || '') && !el.value
  );
  leftovers.forEach((el, i) => {
    const n = i + 1;
    setNativeValue(el, examples[n] || examples[String(n)] || (n === 1 ? 'Rahul' : 'your order'));
  });
}

async function fillBody(body) {
  const text = body || '';
  const editor = (modalRoot() || document).querySelector('[contenteditable="true"]');
  if (editor) {
    editor.focus();
    document.execCommand('selectAll', false, null);
    const ok = document.execCommand('insertText', false, text);
    if (!ok) editor.textContent = text;
    fire(editor, 'input', { inputType: 'insertText', data: text });
    fire(editor, 'change');
  }
  const hidden = q('#body');
  if (hidden) setNativeValue(hidden, text);
  await sleep(250);
}

function fillInputNearLabel(re, value) {
  if (!value) return false;
  const labels = [...(modalRoot() || document).querySelectorAll('label')];
  const lab = labels.find((l) => re.test((l.textContent || '').replace(/\s+/g, ' ')));
  if (!lab) return false;
  const id = lab.getAttribute('for');
  const input = (id && document.getElementById(id))
    || lab.parentElement?.querySelector('input, textarea, select')
    || lab.nextElementSibling?.querySelector?.('input, textarea, select');
  if (!input) return false;
  if (input.tagName === 'SELECT') setSelect(input, value);
  else setNativeValue(input, value);
  return true;
}

async function submitTemplate() {
  const submit = await waitFor(() => {
    const b = createSubmitBtn();
    return b && !b.disabled ? b : null;
  }, 8000);
  if (!submit) {
    const stuck = createSubmitBtn();
    throw new Error(stuck?.disabled
      ? 'Create Template stayed disabled — name, body, or marketing unsubscribe is missing'
      : 'Create Template button not found in the modal');
  }
  submit.click();
  const closed = await waitFor(() => !headingCreateVisible(), 30000);
  if (!closed) {
    const err = (modalRoot() || document).querySelector('.text-red-600, .text-red-500, [class*="error"]');
    throw new Error((err?.innerText || '').trim() || 'Modal stayed open — CampaignBot may have rejected the template');
  }
}

function closeModal() {
  const close = document.querySelector('button[aria-label="Close modal"]');
  if (close) {
    close.click();
    return;
  }
  const cancel = [...document.querySelectorAll('button')].find((b) => /^\s*Cancel\s*$/i.test(b.textContent || ''));
  cancel?.click();
}

async function fillAndSubmit(variant) {
  await openCreateModal();

  const name = String(variant.templateName || `picoso_var_${variant.variantNumber || Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 512);

  const nameEl = q('#name');
  if (!nameEl) throw new Error('Template Name (#name) not found');
  setNativeValue(nameEl, name);

  const category = variant.category || 'MARKETING';
  setSelect(q('#category'), category);
  setSelect(q('#templateFormat'), 'STANDARD');
  await selectLanguage(variant.language || 'en_US');

  let headerType = variant.headerType || 'NONE';
  if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) headerType = 'NONE';
  setSelect(q('#headerType'), headerType);
  await sleep(250);
  if (headerType === 'TEXT' && variant.headerText) {
    const header = String(variant.headerText)
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/[^A-Za-z0-9 .,'!?-]/g, '')
      .slice(0, 60);
    fillInputNearLabel(/Header Text/i, header);
    const headerInput = [...(modalRoot() || document).querySelectorAll('input')].find((el) => {
      const lab = el.closest('div')?.querySelector('label');
      return /Header Text/i.test(lab?.textContent || '');
    });
    if (headerInput && header) setNativeValue(headerInput, header);
  }

  const body = variant.body || variant.message || '';
  await fillBody(body);
  await fillVariableExamples(body, variant.variableExamples || { 1: 'Rahul' });

  const footerType = variant.footerType || 'BUTTONS';
  setSelect(q('#footerType'), footerType);
  await sleep(400);

  if (footerType === 'TEXT' && variant.footerText) {
    fillInputNearLabel(/Footer Text/i, variant.footerText);
  }

  if (footerType === 'BUTTONS') {
    const btn = (variant.buttons && variant.buttons[0]) || {
      type: 'URL',
      text: variant.cta || 'Order Now',
      url: 'https://picoso.in',
    };
    await waitFor(() => {
      const labels = [...(modalRoot() || document).querySelectorAll('label')];
      return labels.some((l) => /button text/i.test(l.textContent || ''));
    }, 4000);
    fillInputNearLabel(/Button Text/i, btn.text);
    fillInputNearLabel(/\bURL\b/i, btn.url || 'https://picoso.in');
    const urlInput = (modalRoot() || document).querySelector('input[placeholder*="http"], input[placeholder*="URL"], input[placeholder*="url"]');
    if (urlInput && btn.url) setNativeValue(urlInput, btn.url || 'https://picoso.in');
  }

  const unsub = q('#includeUnsubscribeFooter');
  if (unsub && category === 'MARKETING' && !unsub.checked) {
    unsub.click();
    await sleep(150);
  }
  if (unsub && category !== 'MARKETING' && unsub.checked) {
    unsub.click();
    await sleep(150);
  }

  await sleep(200);
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
      closeModal();
      await sleep(500);
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
