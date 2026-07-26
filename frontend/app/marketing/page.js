'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock, MessageCircle, Send, Users, History, Zap, RefreshCw, LogOut,
  QrCode, CheckCircle2, XCircle, Image as ImageIcon, Play, Pause,
  Square, Trash2, ShieldCheck, Clock, AlertTriangle, Loader2,
} from 'lucide-react';
import { marketing } from '@/lib/api';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve({ base64: result.split(',')[1], mime: file.type, preview: result });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PIN_KEY = 'picoso_marketing_pin';

/* ════════════════════════════════════════════════════════════════════════════
   PIN GATE
   ════════════════════════════════════════════════════════════════════════════ */
function PinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = useCallback(async (pin) => {
    setLoading(true);
    setError('');
    try {
      await marketing.verifyPin(pin);
      sessionStorage.setItem(PIN_KEY, pin);
      onSuccess();
    } catch {
      setError('Incorrect PIN. Access denied.');
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) submit(next.join(''));
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length) {
      const next = paste.split('').concat(['', '', '', '', '', '']).slice(0, 6);
      setDigits(next);
      if (paste.length === 6) submit(paste);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 p-4">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl shadow-modal p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Suite</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the 6-digit access PIN</p>
        </div>

        <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={loading}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              className="w-11 h-14 text-center text-2xl font-bold border-2 border-surface-200 rounded-xl focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center gap-2 text-sm text-red-600">
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CONNECTION PANEL
   ════════════════════════════════════════════════════════════════════════════ */
function ConnectionPanel() {
  const [state, setState] = useState({ status: 'unknown', qr: null, me: null, lastError: null });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await marketing.waStatus();
      setState(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const connect = async () => {
    setBusy(true);
    try { await marketing.waInit(); await load(); } finally { setBusy(false); }
  };
  const logout = async () => {
    if (!confirm('Disconnect WhatsApp and wipe the session? You will need to scan the QR again.')) return;
    setBusy(true);
    try { await marketing.waLogout(); await load(); } finally { setBusy(false); }
  };
  const restart = async () => {
    setBusy(true);
    try { await marketing.waRestart(); await load(); } finally { setBusy(false); }
  };

  const connected = state.status === 'ready';
  const statusMeta = {
    ready:          { label: 'Connected', color: 'text-brand-600', bg: 'bg-brand-50', icon: CheckCircle2 },
    authenticated:  { label: 'Authenticating…', color: 'text-amber-600', bg: 'bg-amber-50', icon: Loader2 },
    qr:             { label: 'Scan QR to link', color: 'text-blue-600', bg: 'bg-blue-50', icon: QrCode },
    initializing:   { label: 'Starting browser…', color: 'text-amber-600', bg: 'bg-amber-50', icon: Loader2 },
    disconnected:   { label: 'Disconnected', color: 'text-gray-500', bg: 'bg-gray-100', icon: XCircle },
    auth_failure:   { label: 'Auth failed', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
    unknown:        { label: 'Loading…', color: 'text-gray-400', bg: 'bg-gray-100', icon: Loader2 },
  }[state.status] || { label: state.status, color: 'text-gray-500', bg: 'bg-gray-100', icon: MessageCircle };
  const StatusIcon = statusMeta.icon;

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">WhatsApp Connection</h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${['initializing', 'authenticated', 'unknown'].includes(state.status) ? 'animate-spin' : ''}`} />
            {statusMeta.label}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Business number: <span className="font-semibold text-gray-800">+91 81670 80111</span>
        </p>

        {connected && state.me && (
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 mb-4">
            <p className="text-sm font-semibold text-brand-800">{state.me.pushname || 'Linked device'}</p>
            <p className="text-xs text-brand-600">+{state.me.number}</p>
          </div>
        )}

        {state.lastError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {state.lastError}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!connected && (
            <button className="btn-primary" onClick={connect} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Connect
            </button>
          )}
          <button className="btn-secondary" onClick={restart} disabled={busy}>
            <RefreshCw className="w-4 h-4" /> Restart
          </button>
          {connected && (
            <button className="btn-secondary text-red-600" onClick={logout} disabled={busy}>
              <LogOut className="w-4 h-4" /> Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="card p-6 flex flex-col items-center justify-center text-center">
        {state.qr ? (
          <>
            <img src={state.qr} alt="WhatsApp QR" className="w-56 h-56 rounded-xl border border-surface-200" />
            <p className="text-sm text-gray-500 mt-4 max-w-xs">
              Open WhatsApp on <b>+91 81670 80111</b> → <b>Linked Devices</b> → <b>Link a Device</b> and scan this code.
            </p>
          </>
        ) : connected ? (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10 text-brand-500" />
            </div>
            <p className="font-semibold text-gray-800">Session active</p>
            <p className="text-sm text-gray-500">Ready to send messages.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <QrCode className="w-16 h-16 mb-3" />
            <p className="text-sm">Click <b>Connect</b> to generate a pairing QR.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WELCOME AUTOMATION PANEL
   ════════════════════════════════════════════════════════════════════════════ */
function WelcomePanel() {
  const [cfg, setCfg] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    marketing.getWelcome().then(({ data }) => {
      setCfg(data);
      if (data.imageBase64) setPreview(`data:${data.imageMime};base64,${data.imageBase64}`);
    });
  }, []);

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mime, preview } = await fileToBase64(file);
    setCfg((c) => ({ ...c, imageBase64: base64, imageMime: mime, imageUrl: '' }));
    setPreview(preview);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await marketing.updateWelcome({
        enabled: cfg.enabled,
        message: cfg.message,
        imageBase64: cfg.imageBase64 || '',
        imageMime: cfg.imageMime || 'image/png',
        imageUrl: cfg.imageUrl || '',
        delaySec: cfg.delaySec ?? 20,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="grid md:grid-cols-3 gap-5">
      <div className="md:col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Welcome Message Automation</h2>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-500">{cfg.enabled ? 'On' : 'Off'}</span>
            <button
              onClick={() => setCfg((c) => ({ ...c, enabled: !c.enabled }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${cfg.enabled ? 'bg-brand-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${cfg.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Sent automatically the moment a new user registers on Picoso. Supports spintax
          <code className="mx-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">{'{Hi|Hello|Hey}'}</code>
          and tokens <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{'{{name}}'}</code>.
        </p>

        <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
        <textarea
          className="input-field min-h-[140px] mb-4"
          value={cfg.message}
          onChange={(e) => setCfg((c) => ({ ...c, message: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Send delay (seconds)</label>
            <input
              type="number" min="0" className="input-field"
              value={cfg.delaySec ?? 20}
              onChange={(e) => setCfg((c) => ({ ...c, delaySec: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Image URL (optional)</label>
            <input
              type="text" className="input-field" placeholder="https://…"
              value={cfg.imageUrl || ''}
              onChange={(e) => setCfg((c) => ({ ...c, imageUrl: e.target.value }))}
            />
          </div>
        </div>

        <label className="btn-secondary cursor-pointer w-fit">
          <ImageIcon className="w-4 h-4" /> Upload image attachment
          <input type="file" accept="image/*" className="hidden" onChange={onImage} />
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save
          </button>
          {saved && <span className="text-sm text-brand-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Preview</h3>
        <div className="rounded-2xl bg-[#e5ddd5] p-3">
          <div className="bg-white rounded-xl rounded-tl-none shadow-sm p-3 max-w-[240px]">
            {(preview || cfg.imageUrl) && (
              <img src={preview || cfg.imageUrl} alt="attachment" className="rounded-lg mb-2 w-full object-cover" />
            )}
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {cfg.message.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, b) => b.split('|')[0]).replace(/\{\{name\}\}/gi, 'Aman')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MASS SENDER PANEL
   ════════════════════════════════════════════════════════════════════════════ */
const DEFAULT_CONFIG = {
  minDelaySec: 18, maxDelaySec: 55, batchSize: 20, batchCooldownMin: 12,
  dailyCap: 250, warmup: true, validateNumbers: true, typingSim: true,
  activeHourStart: 8, activeHourEnd: 22,
};

function MassSenderPanel({ onCreated }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('{Hi|Hello|Hey} {{name}}! 🌱 {Fresh|Healthy} bowls from *Picoso* are just a tap away. {Order now|Grab yours} & eat clean! 💚');
  const [numbersText, setNumbersText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);

  const numberCount = numbersText.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean).length;

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mime, preview } = await fileToBase64(file);
    setImage({ base64, mime });
    setPreview(preview);
  };

  const create = async (startNow) => {
    setCreating(true);
    setMsg(null);
    try {
      const { data } = await marketing.createCampaign({
        name: name || `Campaign ${new Date().toLocaleString()}`,
        message,
        numbersText,
        imageBase64: image?.base64 || '',
        imageMime: image?.mime || 'image/png',
        config,
        shuffleOrder: true,
      });
      if (startNow) await marketing.startCampaign(data.id);
      setMsg({ type: 'ok', text: `Campaign created with ${data.total} recipients${data.invalidCount ? ` (${data.invalidCount} invalid)` : ''}.${startNow ? ' Sending started.' : ''}` });
      setNumbersText('');
      onCreated?.();
    } catch (e) {
      setMsg({ type: 'err', text: e?.response?.data?.error || 'Failed to create campaign' });
    } finally {
      setCreating(false);
    }
  };

  const setCfg = (k, v) => setConfig((c) => ({ ...c, [k]: v }));

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Mass WhatsApp Sender</h2>

          <label className="block text-xs font-semibold text-gray-600 mb-1">Campaign name</label>
          <input className="input-field mb-4" value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Offer Blast" />

          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Recipients — one number per line <span className="text-gray-400">(optional name after a comma: 9876543210, Aman)</span>
          </label>
          <textarea
            className="input-field min-h-[140px] font-mono text-xs mb-1"
            value={numbersText}
            onChange={(e) => setNumbersText(e.target.value)}
            placeholder={"9876543210, Aman\n9123456789\n+91 90000 00000, Priya"}
          />
          <p className="text-xs text-gray-400 mb-4">{numberCount} number{numberCount !== 1 ? 's' : ''} detected</p>

          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Message <span className="text-gray-400">(spintax {'{a|b}'} + {'{{name}}'} supported — keeps every message unique)</span>
          </label>
          <textarea className="input-field min-h-[120px] mb-4" value={message} onChange={(e) => setMessage(e.target.value)} />

          <label className="btn-secondary cursor-pointer w-fit">
            <ImageIcon className="w-4 h-4" /> {image ? 'Change attachment' : 'Add image attachment'}
            <input type="file" accept="image/*" className="hidden" onChange={onImage} />
          </label>
          {preview && <img src={preview} alt="attachment" className="mt-3 rounded-xl max-h-40 border border-surface-200" />}

          {msg && (
            <div className={`mt-4 flex items-center gap-2 text-sm rounded-lg p-3 ${msg.type === 'ok' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>
              {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {msg.text}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => create(true)} disabled={creating || !numberCount}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Create & Start Sending
            </button>
            <button className="btn-secondary" onClick={() => create(false)} disabled={creating || !numberCount}>
              Save as Draft
            </button>
          </div>
        </div>
      </div>

      {/* Anti-ban settings */}
      <div className="card p-6 h-fit">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-brand-500" />
          <h3 className="text-base font-bold text-gray-900">Anti-Ban Engine</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Human-like pacing to protect the number. Defaults are safe.</p>

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Min delay (s)" value={config.minDelaySec} onChange={(v) => setCfg('minDelaySec', v)} />
          <NumField label="Max delay (s)" value={config.maxDelaySec} onChange={(v) => setCfg('maxDelaySec', v)} />
          <NumField label="Batch size" value={config.batchSize} onChange={(v) => setCfg('batchSize', v)} />
          <NumField label="Batch cooldown (min)" value={config.batchCooldownMin} onChange={(v) => setCfg('batchCooldownMin', v)} />
          <NumField label="Daily cap" value={config.dailyCap} onChange={(v) => setCfg('dailyCap', v)} />
          <div />
          <NumField label="Active from (h)" value={config.activeHourStart} onChange={(v) => setCfg('activeHourStart', v)} />
          <NumField label="Active to (h)" value={config.activeHourEnd} onChange={(v) => setCfg('activeHourEnd', v)} />
        </div>

        <div className="mt-4 space-y-2">
          <Toggle label="Warmup ramp (start slow)" checked={config.warmup} onChange={(v) => setCfg('warmup', v)} />
          <Toggle label="Validate numbers on WhatsApp" checked={config.validateNumbers} onChange={(v) => setCfg('validateNumbers', v)} />
          <Toggle label="Simulate typing" checked={config.typingSim} onChange={(v) => setCfg('typingSim', v)} />
        </div>

        <div className="mt-4 text-xs text-gray-400 leading-relaxed">
          <p className="flex gap-1"><Clock className="w-3.5 h-3.5 shrink-0" /> Also uses spintax rotation, randomized order, random long pauses & a failure circuit-breaker automatically.</p>
        </div>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
      <input type="number" className="input-field !py-2 text-sm" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-600">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-brand-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CAMPAIGN HISTORY PANEL
   ════════════════════════════════════════════════════════════════════════════ */
function HistoryPanel({ refreshKey }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    const { data } = await marketing.listCampaigns();
    setCampaigns(data);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const openDetail = async (id) => {
    setSelected(id);
    const { data } = await marketing.getCampaign(id);
    setDetail(data);
  };

  useEffect(() => {
    if (!selected) return;
    const t = setInterval(async () => {
      try { const { data } = await marketing.getCampaign(selected); setDetail(data); } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(t);
  }, [selected]);

  const control = async (fn, id) => {
    await fn(id);
    await load();
    if (selected === id) { const { data } = await marketing.getCampaign(id); setDetail(data); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await marketing.deleteCampaign(id);
    if (selected === id) { setSelected(null); setDetail(null); }
    load();
  };

  const statusColor = {
    running: 'bg-brand-50 text-brand-700', paused: 'bg-amber-50 text-amber-700',
    completed: 'bg-blue-50 text-blue-700', stopped: 'bg-gray-100 text-gray-600',
    draft: 'bg-gray-100 text-gray-600', failed: 'bg-red-50 text-red-600',
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Campaigns</h2>
        {!campaigns.length && <p className="text-sm text-gray-400">No campaigns yet.</p>}
        <div className="space-y-3">
          {campaigns.map((c) => {
            const done = c.sentCount + c.failedCount + c.invalidCount;
            const pct = c.total ? Math.round((done / c.total) * 100) : 0;
            return (
              <div
                key={c._id}
                onClick={() => openDetail(c._id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${selected === c._id ? 'border-brand-400 bg-brand-50/40' : 'border-surface-200 hover:border-surface-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${statusColor[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-surface-100 overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="text-brand-600 font-semibold">{c.sentCount} sent</span>
                  <span className="text-red-500">{c.failedCount} failed</span>
                  <span className="text-gray-400">{c.invalidCount} invalid</span>
                  <span className="ml-auto">{done}/{c.total}</span>
                </div>
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {(c.status === 'draft' || c.status === 'paused' || c.status === 'stopped') && done < c.total && (
                    <button className="text-xs flex items-center gap-1 text-brand-600 font-semibold" onClick={() => control(marketing.startCampaign, c._id)}>
                      <Play className="w-3.5 h-3.5" /> {c.status === 'draft' ? 'Start' : 'Resume'}
                    </button>
                  )}
                  {c.status === 'running' && (
                    <button className="text-xs flex items-center gap-1 text-amber-600 font-semibold" onClick={() => control(marketing.pauseCampaign, c._id)}>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {(c.status === 'running' || c.status === 'paused') && (
                    <button className="text-xs flex items-center gap-1 text-gray-500 font-semibold" onClick={() => control(marketing.stopCampaign, c._id)}>
                      <Square className="w-3.5 h-3.5" /> Stop
                    </button>
                  )}
                  {c.status !== 'running' && (
                    <button className="text-xs flex items-center gap-1 text-red-500 font-semibold ml-auto" onClick={() => remove(c._id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Details</h2>
        {!detail ? (
          <p className="text-sm text-gray-400">Select a campaign to view recipient status.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Total" value={detail.total} />
              <Stat label="Sent" value={detail.sentCount} color="text-brand-600" />
              <Stat label="Failed" value={detail.failedCount} color="text-red-500" />
              <Stat label="Invalid" value={detail.invalidCount} color="text-gray-400" />
            </div>
            {detail.lastError && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {detail.lastError}
              </div>
            )}
            <div className="max-h-[420px] overflow-y-auto no-scrollbar">
              <table className="w-full text-xs">
                <thead className="text-gray-400 text-left sticky top-0 bg-white">
                  <tr><th className="py-1">#</th><th>Number</th><th>Name</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {detail.recipients?.map((r, i) => (
                    <tr key={i} className="border-t border-surface-100">
                      <td className="py-1.5 text-gray-400">{i + 1}</td>
                      <td className="font-mono">{r.phone}</td>
                      <td className="text-gray-500">{r.name || '—'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          r.status === 'sent' ? 'bg-brand-50 text-brand-600'
                          : r.status === 'failed' ? 'bg-red-50 text-red-500'
                          : r.status === 'invalid' ? 'bg-gray-100 text-gray-400'
                          : 'bg-amber-50 text-amber-600'}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-gray-800' }) {
  return (
    <div className="rounded-xl bg-surface-50 p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════════════ */
export default function MarketingPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('connection');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem(PIN_KEY) : null;
    if (!pin) return;
    marketing.verifyPin(pin).then(() => setAuthed(true)).catch(() => sessionStorage.removeItem(PIN_KEY));
  }, []);

  if (!authed) return <PinGate onSuccess={() => setAuthed(true)} />;

  const tabs = [
    { id: 'connection', label: 'Connection', icon: MessageCircle },
    { id: 'welcome', label: 'Welcome Bot', icon: Zap },
    { id: 'sender', label: 'Mass Sender', icon: Users },
    { id: 'history', label: 'Campaigns', icon: History },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Picoso Marketing</h1>
              <p className="text-[11px] text-gray-400 leading-tight">WhatsApp Automation Suite</p>
            </div>
          </div>
          <button
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
            onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }}
          >
            <LogOut className="w-4 h-4" /> Lock
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'connection' && <ConnectionPanel />}
        {tab === 'welcome' && <WelcomePanel />}
        {tab === 'sender' && <MassSenderPanel onCreated={() => { setRefreshKey((k) => k + 1); setTab('history'); }} />}
        {tab === 'history' && <HistoryPanel refreshKey={refreshKey} />}
      </main>
    </div>
  );
}
