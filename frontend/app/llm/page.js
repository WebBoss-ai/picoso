'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock,
  Sparkles,
  Send,
  Loader2,
  LogOut,
  ChevronRight,
  Calculator,
  Users,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Database,
  Brain,
  CheckCircle2,
  Link2,
  Play,
  Download,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
  Minimize2,
  Table2,
  FileJson,
  FileText,
  Phone,
  Copy,
  Check,
  X,
  Eye,
  Layers,
} from 'lucide-react';

const PIN_KEY = 'picoso_llm_pin';
const CONV_KEY = 'picoso_llm_conversation';
const EDITOR_W_KEY = 'picoso_llm_editor_w';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';

const SUGGESTIONS = [
  '2 km ke andar Paneer Tikka Rice kitne customers ne order kiya, aur unmein se kitne repeat customers hain?',
  'Last month total sales',
  'Total orders of yesterday',
  'What products sell the most?',
  'Which customers are inactive for 60 days?',
  'List customers with more than 5 orders — include name and phone',
  'Export top 50 customers by spend this month',
];

function getPin() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(PIN_KEY) || '';
}

function apiHeaders(pin, json = true) {
  const h = { 'x-llm-pin': pin };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function formatMetricValue(m) {
  if (!m) return '—';
  if (m.display) return m.display;
  if (m.id === 'repeat_rate' && typeof m.value === 'number') {
    const v = m.value <= 1 ? m.value * 100 : m.value;
    return `${v.toFixed(1)}%`;
  }
  if (m.unit === 'INR' || m.id === 'revenue' || m.id === 'aov' || m.id === 'spend') {
    return `₹${Number(m.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  if (typeof m.value === 'number') {
    return Number(m.value).toLocaleString('en-IN');
  }
  return String(m.value ?? '—');
}

function stageLabel(stage, tool) {
  const map = {
    received: 'Received…',
    classifying: 'Understanding…',
    planning: 'Planning…',
    waiting_for_tool: 'Selecting tools…',
    executing: tool ? `Running ${String(tool).replace(/_/g, ' ')}…` : 'Querying…',
    validating: 'Validating…',
    answering: 'Writing answer…',
    resolving_product: 'Finding product…',
    querying: 'Analytics query…',
    understanding: 'Understanding…',
    deterministic_mode: 'Tools engine…',
    tools_engine: 'Completing with tools…',
    fallback: 'Recovering…',
    completing_tools: 'Finishing metrics…',
  };
  return map[stage] || stage || 'Working…';
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows = []) {
  if (!rows.length) return '';
  const keySet = new Set();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keySet.add(k)));
  const keys = Array.from(keySet);
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCsv(row?.[k])).join(','));
  }
  return lines.join('\n');
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function exportResult(result, format = 'json') {
  if (!result) return;
  const base = `picoso-export-${stamp()}`;

  if (format === 'json') {
    downloadBlob(
      `${base}.json`,
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          headline: result.headline,
          explanation: result.explanation,
          metrics: result.metrics,
          primaryMetric: result.primaryMetric,
          dimensions: result.dimensions,
          filters: result.filters,
          products: result.products || [],
          customers: result.customers || [],
          sources: result.sources,
          calculationSteps: result.calculationSteps,
        },
        null,
        2
      ),
      'application/json'
    );
    return;
  }

  // CSV — customers preferred, else products, else metrics
  if (result.customers?.length) {
    downloadBlob(`${base}-customers.csv`, rowsToCsv(result.customers), 'text/csv;charset=utf-8');
  } else if (result.products?.length) {
    downloadBlob(`${base}-products.csv`, rowsToCsv(result.products), 'text/csv;charset=utf-8');
  } else if (result.metrics?.length) {
    downloadBlob(
      `${base}-metrics.csv`,
      rowsToCsv(
        result.metrics.map((m) => ({
          id: m.id,
          label: m.label,
          value: m.value,
          unit: m.unit,
          display: m.display || formatMetricValue(m),
        }))
      ),
      'text/csv;charset=utf-8'
    );
  } else {
    downloadBlob(
      `${base}-summary.csv`,
      rowsToCsv([
        {
          headline: result.headline,
          explanation: result.explanation || result.narrative || '',
          period: result.period || '',
        },
      ]),
      'text/csv;charset=utf-8'
    );
  }
}

function buildReportText(result) {
  if (!result) return '';
  const lines = [];
  lines.push(result.headline || 'Analysis');
  lines.push('');
  if (result.explanation || result.narrative) {
    lines.push(result.explanation || result.narrative);
    lines.push('');
  }
  if (result.primaryMetric) {
    lines.push(`Primary: ${result.primaryMetric.label || result.primaryMetric.id} = ${formatMetricValue(result.primaryMetric)}`);
  }
  if (result.metrics?.length) {
    lines.push('');
    lines.push('Metrics');
    result.metrics.forEach((m) => {
      lines.push(`- ${m.label || m.id}: ${formatMetricValue(m)}`);
    });
  }
  if (result.customers?.length) {
    lines.push('');
    lines.push(`Customers (${result.customers.length})`);
    result.customers.forEach((c, i) => {
      lines.push(
        `${i + 1}. ${c.name || '—'} | ${c.phone || '—'} | orders ${c.orders ?? '—'} | spend ${c.spend != null ? c.spend : '—'}`
      );
    });
  }
  if (result.products?.length) {
    lines.push('');
    lines.push(`Products (${result.products.length})`);
    result.products.forEach((p, i) => {
      lines.push(
        `${i + 1}. ${p.name || '—'} | units ${p.units ?? p.orders ?? '—'} | ₹${p.revenue ?? 0}`
      );
    });
  }
  if (result.calculationSteps?.length) {
    lines.push('');
    lines.push('How calculated');
    result.calculationSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  return lines.join('\n');
}

export default function LlmPage() {
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [authing, setAuthing] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('ask');
  const [brainView, setBrainView] = useState('text');
  const [brainPack, setBrainPack] = useState(null);

  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const abortRef = useRef(null);

  // Live studio (right panel)
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioExpanded, setStudioExpanded] = useState(false);
  const [studioTab, setStudioTab] = useState('table'); // table | json | report
  const [studioResult, setStudioResult] = useState(null);
  const [studioWidth, setStudioWidth] = useState(420);
  const [editorText, setEditorText] = useState('');
  const [compact, setCompact] = useState(false);
  const [copied, setCopied] = useState(false);
  const dragRef = useRef(null);

  // Train
  const [workspace, setWorkspace] = useState(null);
  const [trainBusy, setTrainBusy] = useState(false);
  const [trainError, setTrainError] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [draftModel, setDraftModel] = useState(null);
  const [hintQ, setHintQ] = useState('');
  const [hintA, setHintA] = useState('');
  const [externalUri, setExternalUri] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasteLabel, setPasteLabel] = useState('Order ops paste');
  const [mergeLearning, setMergeLearning] = useState(true);
  const [mongoCatalog, setMongoCatalog] = useState(null);
  const [selectedCols, setSelectedCols] = useState({});
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [includeEmpty, setIncludeEmpty] = useState(true);
  const [previewName, setPreviewName] = useState(null);
  const [previewDocs, setPreviewDocs] = useState(null);
  const [trainNote, setTrainNote] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('');

  useEffect(() => {
    const saved = getPin();
    if (saved) {
      setPin(saved);
      verifyPin(saved, true);
    }
    const cid = sessionStorage.getItem(CONV_KEY);
    if (cid) setConversationId(cid);
    const w = Number(sessionStorage.getItem(EDITOR_W_KEY));
    if (w >= 320 && w <= 900) setStudioWidth(w);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns, status, loading]);

  useEffect(() => {
    if (ready && pin) {
      loadWorkspace(pin);
      loadBrain(pin);
    }
  }, [ready, pin]);

  useEffect(() => {
    if (!studioResult) {
      setEditorText('');
      return;
    }
    if (studioTab === 'json') {
      setEditorText(
        JSON.stringify(
          {
            headline: studioResult.headline,
            metrics: studioResult.metrics,
            customers: studioResult.customers || [],
            products: studioResult.products || [],
            dimensions: studioResult.dimensions,
            filters: studioResult.filters,
          },
          null,
          2
        )
      );
    } else if (studioTab === 'report') {
      setEditorText(buildReportText(studioResult));
    }
  }, [studioResult, studioTab]);

  function openStudio(result) {
    if (!result) return;
    setStudioResult(result);
    setStudioOpen(true);
    if (!result.customers?.length && !result.products?.length) {
      setStudioTab('report');
    } else {
      setStudioTab('table');
    }
  }

  async function loadWorkspace(p = pin) {
    try {
      const res = await fetch(`${API_BASE}/llm/workspace`, {
        headers: apiHeaders(p, false),
      });
      if (!res.ok) return;
      const data = await res.json();
      setWorkspace(data);
      if (data.model) setDraftModel(data.model);
      if (data.brain) {
        setBrainPack((prev) => ({ ...(prev || {}), brain: data.brain, model: data.model }));
      }
    } catch {
      /* ignore */
    }
  }

  async function loadBrain(p = pin) {
    try {
      const res = await fetch(`${API_BASE}/llm/brain`, {
        headers: apiHeaders(p, false),
      });
      if (!res.ok) return;
      const data = await res.json();
      setBrainPack(data);
      if (data.model) setDraftModel(data.model);
    } catch {
      /* ignore */
    }
  }

  async function verifyPin(value, silent = false) {
    setAuthing(true);
    setPinError('');
    try {
      const res = await fetch(`${API_BASE}/llm/auth`, {
        method: 'POST',
        headers: apiHeaders(value),
        body: JSON.stringify({ pin: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid access code');
      }
      sessionStorage.setItem(PIN_KEY, value);
      setPin(value);
      setReady(true);
    } catch (err) {
      sessionStorage.removeItem(PIN_KEY);
      setPin('');
      setReady(false);
      if (!silent) setPinError(err.message || 'Invalid access code');
    } finally {
      setAuthing(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(CONV_KEY);
    setPin('');
    setReady(false);
    setTurns([]);
    setConversationId(null);
    setStudioOpen(false);
    setStudioResult(null);
  }

  async function connectSelf() {
    setTrainBusy(true);
    setTrainError('');
    try {
      await fetch(`${API_BASE}/llm/connections`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({ mode: 'self' }),
      });
      await loadWorkspace();
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function connectExternal() {
    if (!externalUri.trim()) return;
    setTrainBusy(true);
    setTrainError('');
    try {
      const res = await fetch(`${API_BASE}/llm/connections`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          mode: 'mongodb_uri',
          name: 'External MongoDB',
          uri: externalUri.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Connect failed');
      setExternalUri('');
      await loadWorkspace();
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function loadMongoCatalog() {
    setCatalogBusy(true);
    setTrainError('');
    try {
      const q = new URLSearchParams({
        includeEmpty: includeEmpty ? '1' : '0',
        withSamples: '1',
      });
      const res = await fetch(`${API_BASE}/llm/explore/collections?${q}`, {
        headers: apiHeaders(pin, false),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not list collections');
      setMongoCatalog(data);
      // Default-select collections that have data (or all if empty filter)
      const next = {};
      for (const c of data.collections || []) {
        next[c.name] = c.hasData !== false && (c.estimatedCount || 0) > 0;
      }
      // if nothing selected (all empty), select none so user chooses
      const any = Object.values(next).some(Boolean);
      if (!any) {
        for (const c of data.collections || []) next[c.name] = false;
      }
      setSelectedCols(next);
      setTrainNote(
        `Loaded ${data.total || 0} collections (${data.withData || 0} with data) from ${data.dbName || 'Mongo'}`
      );
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setCatalogBusy(false);
    }
  }

  function selectedCollectionNames() {
    return Object.entries(selectedCols)
      .filter(([, on]) => on)
      .map(([name]) => name);
  }

  function toggleCol(name) {
    setSelectedCols((s) => ({ ...s, [name]: !s[name] }));
  }

  function selectAllCols(onlyWithData = false) {
    const next = {};
    for (const c of mongoCatalog?.collections || []) {
      next[c.name] = onlyWithData ? Boolean(c.hasData) : true;
    }
    setSelectedCols(next);
  }

  function clearCols() {
    const next = {};
    for (const c of mongoCatalog?.collections || []) next[c.name] = false;
    setSelectedCols(next);
  }

  async function previewCollection(name) {
    setPreviewName(name);
    setPreviewDocs(null);
    try {
      const res = await fetch(
        `${API_BASE}/llm/explore/collections/${encodeURIComponent(name)}?limit=4`,
        { headers: apiHeaders(pin, false) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreviewDocs(data.sampleDocs || []);
    } catch (e) {
      setPreviewDocs([{ error: e.message }]);
    }
  }

  async function runDiscover(forceAll = false) {
    setTrainBusy(true);
    setTrainError('');
    setTrainNote('');
    try {
      const collections = forceAll ? [] : selectedCollectionNames();
      const res = await fetch(`${API_BASE}/llm/train/discover`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          sampleSize: 40,
          businessContext:
            businessContext ||
            'Food delivery / commerce. Prefer customers, orders, products when present.',
          modelName: 'Business brain',
          mergeLearning,
          collections: collections.length ? collections : undefined,
          skipEmpty: !includeEmpty,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setSnapshot(data.snapshot);
      setDraftModel(data.model);
      setTrainNote(
        data.merged
          ? `Merged Mongo training into brain v${data.model?.version} (prior learning kept). ${collections.length || 'default'} collection(s).`
          : `Draft brain v${data.model?.version} from Mongo discovery.`
      );
      await loadWorkspace();
      await loadBrain();
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function runUnstructuredTrain(andActivate = false) {
    if (!pasteText.trim() || pasteText.trim().length < 20) {
      setTrainError('Paste at least one order card / dump (min ~20 characters).');
      return;
    }
    setTrainBusy(true);
    setTrainError('');
    setTrainNote('');
    try {
      const collections = selectedCollectionNames();
      const res = await fetch(`${API_BASE}/llm/train/unstructured`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          text: pasteText,
          label: pasteLabel || 'Operations paste',
          businessContext:
            businessContext ||
            'Picoso food delivery ops. Order cards show status, COD, distance, items, totals, customer pin.',
          modelName: pasteLabel || 'Ops paste brain',
          activate: andActivate,
          mergeLearning,
          collections: collections.length ? collections : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unstructured training failed');
      setDraftModel(data.model);
      setBrainPack({
        trained: data.trained || false,
        model: data.model,
        corpus: data.corpus,
        brain: data.brain,
        history: data.history,
      });
      setTrainNote(
        data.merged
          ? `Merged training — prior learning kept · ${data.brain?.recordCount ?? '—'} cumulative records · v${data.model?.version}`
          : `New draft brain v${data.model?.version}`
      );
      await loadWorkspace();
      await loadBrain();
      setTab('brain');
      setBrainView('history');
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function activateModel() {
    if (!draftModel?.id) return;
    setTrainBusy(true);
    setTrainError('');
    try {
      await fetch(`${API_BASE}/llm/models/${draftModel.id}`, {
        method: 'PUT',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          businessContext: businessContext || draftModel.businessContext,
          glossary: draftModel.glossary,
          entities: (draftModel.entities || []).map((e) => ({ ...e, confirmed: true })),
          metrics: (draftModel.metrics || []).map((m) => ({ ...m, confirmed: true })),
        }),
      });
      const res = await fetch(`${API_BASE}/llm/models/${draftModel.id}/activate`, {
        method: 'POST',
        headers: apiHeaders(pin),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Activate failed');
      setDraftModel(data.model);
      await loadWorkspace();
      await loadBrain();
      setTab('ask');
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function teachHint() {
    if (!draftModel?.id || !hintQ.trim() || !hintA.trim()) return;
    setTrainBusy(true);
    try {
      const res = await fetch(`${API_BASE}/llm/models/${draftModel.id}/hints`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({ question: hintQ.trim(), answer: hintA.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Hint failed');
      setDraftModel(data.model);
      setHintQ('');
      setHintA('');
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  const ask = useCallback(
    async (text) => {
      const q = (text || message).trim();
      if (!q || loading || !pin) return;

      setLoading(true);
      setError('');
      setStatus({ stage: 'received' });
      setMessage('');
      setTurns((t) => [...t, { role: 'user', content: q }]);
      setTab('ask');

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/llm/chat`, {
          method: 'POST',
          headers: {
            ...apiHeaders(pin),
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            message: q,
            conversationId: conversationId || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult = null;
        let streamError = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          for (const chunk of chunks) {
            const lines = chunk.split('\n');
            let event = 'message';
            let dataLine = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              if (line.startsWith('data:')) dataLine += line.slice(5).trim();
            }
            if (!dataLine) continue;
            let data;
            try {
              data = JSON.parse(dataLine);
            } catch {
              continue;
            }

            if (event === 'status') setStatus(data);
            else if (event === 'result') {
              finalResult = data;
              setTurns((t) => [
                ...t,
                {
                  role: 'assistant',
                  content: data.headline || data.error || 'Done',
                  result: data,
                  error: Boolean(data.error),
                },
              ]);
              // Auto-open studio when tabular data arrives
              if (
                (data.customers?.length || data.products?.length) &&
                !data.error
              ) {
                openStudio(data);
              }
            } else if (event === 'error') {
              streamError = data.message || 'Error';
              setError(streamError);
            } else if (event === 'complete') {
              if (data.conversationId) {
                setConversationId(data.conversationId);
                sessionStorage.setItem(CONV_KEY, data.conversationId);
              }
              setStatus(null);
            }
          }
        }

        if (!finalResult) {
          setTurns((t) => [
            ...t,
            {
              role: 'assistant',
              content: streamError || 'No result returned.',
              result: null,
              error: Boolean(streamError),
            },
          ]);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Request failed');
        setTurns((t) => [
          ...t,
          { role: 'assistant', content: err.message || 'Request failed', error: true },
        ]);
      } finally {
        setLoading(false);
        setStatus(null);
      }
    },
    [message, loading, pin, conversationId]
  );

  function onStudioResizeStart(e) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: studioWidth };
    function onMove(ev) {
      if (!dragRef.current) return;
      const dx = dragRef.current.startX - ev.clientX;
      const next = Math.min(900, Math.max(320, dragRef.current.startW + dx));
      setStudioWidth(next);
    }
    function onUp(ev) {
      const finalW = dragRef.current
        ? Math.min(900, Math.max(320, dragRef.current.startW + (dragRef.current.startX - ev.clientX)))
        : studioWidth;
      setStudioWidth(finalW);
      sessionStorage.setItem(EDITOR_W_KEY, String(finalW));
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function copyEditor() {
    try {
      await navigator.clipboard.writeText(editorText || buildReportText(studioResult));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  if (!ready) {
    return (
      <div className="llm-root min-h-screen flex items-center justify-center px-4">
        <style dangerouslySetInnerHTML={{ __html: LLM_CSS }} />
        <div className="llm-pin-card w-full max-w-md">
          <div className="llm-brand-mark">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="llm-pin-title">Intelligence Partner</h1>
          <p className="llm-pin-sub">
            Private ops console for your business data — full customer detail, live queries, export.
          </p>
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--llm-muted)]" />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyPin(pinInput);
                  }
                }}
                placeholder="Access code"
                className="llm-input pl-10"
              />
            </div>
            {pinError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {pinError}
              </p>
            )}
            <button
              type="button"
              disabled={authing || !pinInput}
              className="llm-btn-primary w-full"
              onClick={() => verifyPin(pinInput)}
            >
              {authing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter workspace'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const trained = Boolean(workspace?.trained || workspace?.activeModel);
  const brain = brainPack?.brain || workspace?.brain;
  const corpusRecords = brainPack?.corpus?.records || [];

  const paneWidth = studioExpanded
    ? 'min(100%, 100vw)'
    : studioOpen
      ? `${studioWidth}px`
      : '0px';

  return (
    <div className={`llm-root min-h-screen flex flex-col ${studioExpanded ? 'llm-expanded' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: LLM_CSS }} />

      <header className="llm-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="llm-brand-mark sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="llm-header-title">Intelligence Partner</div>
            <div className="llm-header-sub truncate">
              {trained
                ? `Live · ${workspace?.activeModel?.name || draftModel?.name || 'brain online'}`
                : draftModel
                  ? 'Draft brain — activate or train more'
                  : 'Train, ask, export your ops data'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="llm-tabs">
            <button type="button" className={tab === 'ask' ? 'on' : ''} onClick={() => setTab('ask')}>
              Ask
            </button>
            <button
              type="button"
              className={tab === 'train' ? 'on' : ''}
              onClick={() => setTab('train')}
            >
              Train
            </button>
            <button
              type="button"
              className={tab === 'brain' ? 'on' : ''}
              onClick={() => {
                setTab('brain');
                loadBrain();
              }}
            >
              Brain
            </button>
          </div>
          {tab === 'ask' && (
            <button
              type="button"
              className="llm-btn-ghost"
              onClick={() => {
                if (studioOpen) {
                  setStudioOpen(false);
                  setStudioExpanded(false);
                } else {
                  setStudioOpen(true);
                  if (!studioResult) {
                    const last = [...turns].reverse().find((t) => t.result);
                    if (last?.result) setStudioResult(last.result);
                  }
                }
              }}
              title="Data studio"
            >
              {studioOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
              Studio
            </button>
          )}
          <button type="button" onClick={logout} className="llm-btn-ghost">
            <LogOut className="w-4 h-4" /> Exit
          </button>
        </div>
      </header>

      {tab === 'train' ? (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 space-y-5 overflow-y-auto">
          <section className="llm-card">
            <h2 className="llm-section-h">
              <Layers className="w-4 h-4" /> Continuous learning
            </h2>
            <p className="llm-muted">
              Each train session adds to the brain — entities, parameters, glossary, corpus, and
              session history stay intact. Uncheck only if you want a fresh brain.
            </p>
            <label className="llm-check mt-3" style={{ display: 'inline-flex' }}>
              <input
                type="checkbox"
                checked={mergeLearning}
                onChange={(e) => setMergeLearning(e.target.checked)}
              />
              Merge into existing brain (recommended)
            </label>
            {trainNote && <p className="llm-meta mt-2" style={{ color: 'var(--llm-blue)' }}>{trainNote}</p>}
          </section>

          <section className="llm-card">
            <h2 className="llm-section-h">
              <Database className="w-4 h-4" /> 1. Browse Mongo & choose collections
            </h2>
            <p className="llm-muted">
              Load the full database catalog, preview sample documents, and pick exactly which
              collections to include in training.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="llm-btn-primary"
                disabled={trainBusy || catalogBusy}
                onClick={loadMongoCatalog}
              >
                {catalogBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                Load catalog
              </button>
              <button type="button" className="llm-btn-ghost" disabled={trainBusy} onClick={connectSelf}>
                <Link2 className="w-4 h-4" /> Use app database
              </button>
              <label className="llm-check">
                <input
                  type="checkbox"
                  checked={includeEmpty}
                  onChange={(e) => setIncludeEmpty(e.target.checked)}
                />
                Show empty
              </label>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="llm-input"
                placeholder="mongodb+srv://… (optional external)"
                value={externalUri}
                onChange={(e) => setExternalUri(e.target.value)}
              />
              <button
                type="button"
                className="llm-btn-ghost"
                disabled={trainBusy || !externalUri.trim()}
                onClick={connectExternal}
              >
                Connect external
              </button>
            </div>

            {workspace?.primaryConnection && (
              <p className="llm-meta mt-2">
                Connection: {workspace.primaryConnection.mode} ·{' '}
                {workspace.primaryConnection.meta?.dbName ||
                  workspace.primaryConnection.meta?.host ||
                  '—'}{' '}
                · {workspace.primaryConnection.status}
              </p>
            )}

            {mongoCatalog && (
              <div className="llm-catalog mt-4">
                <div className="llm-catalog-bar">
                  <input
                    className="llm-input"
                    placeholder="Filter collections…"
                    value={catalogFilter}
                    onChange={(e) => setCatalogFilter(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className="llm-btn-ghost sm" onClick={() => selectAllCols(false)}>
                      All
                    </button>
                    <button type="button" className="llm-btn-ghost sm" onClick={() => selectAllCols(true)}>
                      With data
                    </button>
                    <button type="button" className="llm-btn-ghost sm" onClick={clearCols}>
                      None
                    </button>
                  </div>
                </div>
                <p className="llm-meta mt-2">
                  {mongoCatalog.dbName || 'Database'} · {mongoCatalog.total} collections ·{' '}
                  {selectedCollectionNames().length} selected · {mongoCatalog.withData} with data
                </p>
                <div className="llm-catalog-list">
                  {(mongoCatalog.collections || [])
                    .filter((c) =>
                      !catalogFilter.trim()
                        ? true
                        : c.name.toLowerCase().includes(catalogFilter.trim().toLowerCase())
                    )
                    .map((c) => (
                      <div
                        key={c.name}
                        className={`llm-catalog-row ${selectedCols[c.name] ? 'on' : ''} ${!c.hasData ? 'empty' : ''}`}
                      >
                        <label className="llm-catalog-check">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedCols[c.name])}
                            onChange={() => toggleCol(c.name)}
                          />
                          <span className="name">{c.name}</span>
                        </label>
                        <span className="count">
                          {(c.estimatedCount || 0).toLocaleString()} docs
                        </span>
                        <button
                          type="button"
                          className="llm-icon-btn"
                          title="Preview"
                          onClick={() => previewCollection(c.name)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
                {previewName && (
                  <div className="llm-preview mt-3">
                    <div className="llm-section-title">
                      Preview · {previewName}
                      <button
                        type="button"
                        className="llm-btn-ghost sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => {
                          setPreviewName(null);
                          setPreviewDocs(null);
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <pre className="llm-pre">
                      {previewDocs
                        ? JSON.stringify(previewDocs, null, 2)
                        : 'Loading samples…'}
                    </pre>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    className="llm-btn-primary"
                    disabled={trainBusy || selectedCollectionNames().length === 0}
                    onClick={() => runDiscover(false)}
                  >
                    {trainBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Train on selected ({selectedCollectionNames().length})
                  </button>
                  <button
                    type="button"
                    className="llm-btn-ghost"
                    disabled={trainBusy}
                    onClick={() => runDiscover(true)}
                    title="Sample default collections without selection filter"
                  >
                    Discover default set
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="llm-card">
            <h2 className="llm-section-h">
              <Brain className="w-4 h-4" /> 2. Paste unorganized data
            </h2>
            <p className="llm-muted">
              Drop order dumps, notes, CSV, or JSON. New knowledge merges into the brain. If you
              selected Mongo collections above, live mapping uses only those.
            </p>
            <input
              className="llm-input mt-3"
              placeholder="Label (e.g. Aug order cards)"
              value={pasteLabel}
              onChange={(e) => setPasteLabel(e.target.value)}
            />
            <textarea
              className="llm-textarea mt-2"
              rows={2}
              placeholder="Business context (optional)"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
            />
            <textarea
              className="llm-textarea mt-2 font-mono text-sm"
              rows={10}
              placeholder={`Paste like:\n#A47C9AFD\ndelivered\nCOD\n…`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="llm-btn-primary"
                disabled={trainBusy || pasteText.trim().length < 20}
                onClick={() => runUnstructuredTrain(false)}
              >
                {trainBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {mergeLearning ? 'Merge & draft' : 'Extract & draft'}
              </button>
              <button
                type="button"
                className="llm-btn-ghost"
                disabled={trainBusy || pasteText.trim().length < 20}
                onClick={() => runUnstructuredTrain(true)}
              >
                Train & activate
              </button>
            </div>
          </section>

          {(snapshot || draftModel) && (
            <section className="llm-card">
              <h2 className="llm-section-h">
                <CheckCircle2 className="w-4 h-4" /> 3. Review & activate
              </h2>
              {draftModel && (
                <>
                  <p className="llm-meta">
                    {draftModel.source || 'model'} · v{draftModel.version} ·{' '}
                    {(draftModel.parameters || []).length} params ·{' '}
                    {(draftModel.entities || []).length} entities
                  </p>
                  <div className="llm-tag-row mt-3">
                    {(draftModel.entities || []).slice(0, 16).map((e) => (
                      <span key={e.id || e.name} className="llm-tag">
                        {e.name}
                        <em>{e.role}</em>
                      </span>
                    ))}
                  </div>
                </>
              )}
              {snapshot?.collections?.length > 0 && (
                <p className="llm-meta mt-2">
                  Snapshot: {snapshot.collections.length} collections sampled
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  className="llm-btn-primary"
                  disabled={trainBusy || !draftModel?.id}
                  onClick={activateModel}
                >
                  <CheckCircle2 className="w-4 h-4" /> Activate for chat
                </button>
                <button
                  type="button"
                  className="llm-btn-ghost"
                  onClick={() => {
                    setTab('brain');
                    loadBrain();
                  }}
                >
                  Open trained brain
                </button>
              </div>
            </section>
          )}

          {draftModel?.id && (
            <section className="llm-card">
              <h2 className="llm-section-h">4. Teach (optional)</h2>
              <input
                className="llm-input mt-2"
                placeholder="Definition question"
                value={hintQ}
                onChange={(e) => setHintQ(e.target.value)}
              />
              <textarea
                className="llm-textarea mt-2"
                rows={2}
                placeholder="Your definition / rule"
                value={hintA}
                onChange={(e) => setHintA(e.target.value)}
              />
              <button type="button" className="llm-btn-ghost mt-2" disabled={trainBusy} onClick={teachHint}>
                Save teaching
              </button>
            </section>
          )}

          {trainError && (
            <div className="llm-error">
              <AlertCircle className="w-4 h-4" /> {trainError}
            </div>
          )}
        </div>
      ) : tab === 'brain' ? (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 space-y-4 overflow-y-auto">
          <section className="llm-card">
            <h2 className="llm-section-h">
              <Brain className="w-4 h-4" /> Trained brain
            </h2>
            <p className="llm-muted">
              Accumulated learning across every train session — history is append-only while merge
              is on.
            </p>
            <div className="llm-tabs mt-3" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
              {[
                ['history', 'Learning'],
                ['text', 'Text'],
                ['json', 'JSON schema'],
                ['live', 'Live map'],
                ['params', 'Parameters'],
                ['records', 'Records'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={brainView === id ? 'on' : ''}
                  onClick={() => setBrainView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="llm-btn-ghost mt-3 ml-2" onClick={() => loadBrain()}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {!brain && !draftModel && (
              <p className="llm-muted mt-4">No brain yet — train from paste or Mongo first.</p>
            )}
            {brainView === 'history' && (
              <div className="mt-3 space-y-3">
                <div className="llm-metrics-grid">
                  <div className="llm-metric">
                    <div className="llm-metric-label">Version</div>
                    <div className="llm-metric-value">{draftModel?.version || brainPack?.model?.version || '—'}</div>
                  </div>
                  <div className="llm-metric">
                    <div className="llm-metric-label">Status</div>
                    <div className="llm-metric-value" style={{ fontSize: '1rem' }}>
                      {draftModel?.status || brainPack?.model?.status || '—'}
                    </div>
                  </div>
                  <div className="llm-metric">
                    <div className="llm-metric-label">Records</div>
                    <div className="llm-metric-value">
                      {brain?.recordCount ?? corpusRecords.length ?? '—'}
                    </div>
                  </div>
                  <div className="llm-metric">
                    <div className="llm-metric-label">Entities</div>
                    <div className="llm-metric-value">
                      {(brain?.entities || draftModel?.entities || []).length}
                    </div>
                  </div>
                </div>

                <div className="llm-section-title">Training sessions</div>
                {(brain?.learningSessions || brainPack?.brain?.learningSessions || []).length ? (
                  <ul className="llm-session-list">
                    {[...(brain?.learningSessions || brainPack?.brain?.learningSessions || [])]
                      .slice()
                      .reverse()
                      .map((s, i) => (
                        <li key={i}>
                          <strong>{s.label || s.source || 'Session'}</strong>
                          <span className="llm-muted">
                            {s.at ? new Date(s.at).toLocaleString() : ''}
                            {s.note ? ` · ${s.note}` : ''}
                            {s.recordCount != null ? ` · +${s.recordCount} records` : ''}
                            {s.cumulativeRecords != null
                              ? ` · ${s.cumulativeRecords} total`
                              : ''}
                          </span>
                          {s.collections?.length > 0 && (
                            <div className="llm-tag-row mt-1">
                              {s.collections.slice(0, 12).map((n) => (
                                <span key={n} className="llm-tag">
                                  {n}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="llm-muted">No sessions logged yet — train to grow the history.</p>
                )}

                {(brainPack?.history || []).length > 0 && (
                  <>
                    <div className="llm-section-title mt-3">Brain versions</div>
                    <ul className="llm-session-list">
                      {brainPack.history.map((h) => (
                        <li key={h.id}>
                          <strong>
                            v{h.version} · {h.name}
                          </strong>
                          <span className="llm-muted">
                            {h.status} · {h.source} · {h.sessions || 0} sessions
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {brainView === 'text' && (
              <pre className="llm-pre mt-3">{brain?.textBrain || draftModel?.textBrain || '—'}</pre>
            )}
            {brainView === 'json' && (
              <pre className="llm-pre mt-3">
                {JSON.stringify(brain?.jsonSchema || draftModel?.jsonSchema || {}, null, 2)}
              </pre>
            )}
            {brainView === 'live' && (
              <pre className="llm-pre mt-3">
                {JSON.stringify(
                  brain?.liveFieldMap ||
                    draftModel?.liveFieldMap ||
                    brain?.queryPlan ||
                    { note: 'Train from paste / Mongo to build field map' },
                  null,
                  2
                )}
              </pre>
            )}
            {brainView === 'params' && (
              <div className="mt-3 space-y-2">
                {(brain?.parameters || draftModel?.parameters || []).map((p) => (
                  <div key={p.name} className="llm-param">
                    <div className="font-semibold">
                      {p.name} <em className="opacity-50 font-normal">{p.type}</em>
                    </div>
                    <div className="llm-muted text-sm">{p.description}</div>
                  </div>
                ))}
              </div>
            )}
            {brainView === 'records' && (
              <pre className="llm-pre mt-3">
                {JSON.stringify(
                  corpusRecords.length
                    ? corpusRecords
                    : brainPack?.corpus?.records || draftModel?.extractionMeta || [],
                  null,
                  2
                )}
              </pre>
            )}
          </section>
        </div>
      ) : (
        <div className="llm-workspace">
          {!studioExpanded && (
            <div className="llm-chat-pane">
              {!trained && (
                <button type="button" className="llm-banner" onClick={() => setTab('train')}>
                  <Brain className="w-4 h-4" />
                  No active brain — open Train to paste data. Built-in tools still answer live
                  questions.
                </button>
              )}

              <div ref={listRef} className="llm-chat-scroll">
                {turns.length === 0 && !loading && (
                  <div className="llm-hero animate-llm-in">
                    <p className="llm-eyebrow">Company data · full visibility · export ready</p>
                    <h2 className="llm-hero-title">Ask anything about your operations</h2>
                    <p className="llm-hero-sub">
                      Live Mongo metrics, customer names & phones, and one-click CSV/JSON export in
                      the Data Studio.
                    </p>
                    <div className="llm-suggestions">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" className="llm-chip" onClick={() => ask(s)}>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {turns.map((t, i) =>
                  t.role === 'user' ? (
                    <div key={i} className="llm-bubble-user">
                      <p>{t.content}</p>
                    </div>
                  ) : (
                    <div key={i} className="llm-bubble-ai">
                      <AnswerCard
                        turn={t}
                        onOpenStudio={openStudio}
                        onExport={(fmt) => exportResult(t.result, fmt)}
                      />
                    </div>
                  )
                )}

                {loading && status && (
                  <div className="llm-status animate-llm-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{stageLabel(status.stage, status.tool)}</span>
                  </div>
                )}

                {error && !loading && (
                  <div className="llm-error">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
              </div>

              <div className="llm-composer">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      ask();
                    }
                  }}
                  placeholder="Ask for metrics, customers, rankings — or “export list of…”"
                  rows={2}
                  className="llm-textarea"
                  disabled={loading}
                />
                <button
                  type="button"
                  disabled={loading || !message.trim()}
                  className="llm-btn-primary llm-send"
                  aria-label="Ask"
                  onClick={() => ask()}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {studioOpen && (
            <aside
              className={`llm-studio ${studioExpanded ? 'expanded' : ''}`}
              style={studioExpanded ? undefined : { width: paneWidth }}
            >
              {!studioExpanded && (
                <div className="llm-studio-resizer" onMouseDown={onStudioResizeStart} />
              )}
              <div className="llm-studio-head">
                <div>
                  <div className="llm-studio-title">Data studio</div>
                  <div className="llm-studio-sub">
                    {studioResult
                      ? studioResult.customers?.length
                        ? `${studioResult.customers.length} customers · live edit & export`
                        : studioResult.products?.length
                          ? `${studioResult.products.length} products · live edit & export`
                          : 'Result inspector'
                      : 'Results open here after a data query'}
                  </div>
                </div>
                <div className="llm-studio-actions">
                  <button
                    type="button"
                    className="llm-icon-btn"
                    title={studioExpanded ? 'Dock' : 'Expand'}
                    onClick={() => setStudioExpanded((v) => !v)}
                  >
                    {studioExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="llm-icon-btn"
                    title="Close"
                    onClick={() => {
                      setStudioOpen(false);
                      setStudioExpanded(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="llm-studio-toolbar">
                <div className="llm-tabs sm">
                  <button
                    type="button"
                    className={studioTab === 'table' ? 'on' : ''}
                    onClick={() => setStudioTab('table')}
                  >
                    <Table2 className="w-3.5 h-3.5" /> Table
                  </button>
                  <button
                    type="button"
                    className={studioTab === 'json' ? 'on' : ''}
                    onClick={() => setStudioTab('json')}
                  >
                    <FileJson className="w-3.5 h-3.5" /> JSON
                  </button>
                  <button
                    type="button"
                    className={studioTab === 'report' ? 'on' : ''}
                    onClick={() => setStudioTab('report')}
                  >
                    <FileText className="w-3.5 h-3.5" /> Report
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <label className="llm-check">
                    <input
                      type="checkbox"
                      checked={compact}
                      onChange={(e) => setCompact(e.target.checked)}
                    />
                    Compact
                  </label>
                  <button
                    type="button"
                    className="llm-btn-ghost sm"
                    disabled={!studioResult}
                    onClick={() => exportResult(studioResult, 'csv')}
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button
                    type="button"
                    className="llm-btn-ghost sm"
                    disabled={!studioResult}
                    onClick={() => exportResult(studioResult, 'json')}
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </button>
                  <button
                    type="button"
                    className="llm-btn-ghost sm"
                    disabled={!studioResult && !editorText}
                    onClick={copyEditor}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>

              <div className="llm-studio-body">
                {!studioResult ? (
                  <div className="llm-studio-empty">
                    <PanelRightOpen className="w-8 h-8 opacity-30" />
                    <p>Ask a question that returns customers or products. Open any answer with
                      “Open in studio”.</p>
                  </div>
                ) : studioTab === 'table' ? (
                  <StudioTable result={studioResult} compact={compact} />
                ) : (
                  <textarea
                    className="llm-studio-editor"
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    spellCheck={false}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function StudioTable({ result, compact }) {
  const customers = result.customers || [];
  const products = result.products || [];
  const metrics = result.metrics || [];

  if (customers.length) {
    return (
      <div className={`llm-table-wrap ${compact ? 'compact' : ''}`}>
        <table className="llm-table sticky-head">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Orders</th>
              <th>Spend</th>
              <th>Distance</th>
              <th>Customer ID</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td className="strong">{c.name || '—'}</td>
                <td className="mono">{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.orders ?? '—'}</td>
                <td>
                  {c.spend != null ? `₹${Number(c.spend).toLocaleString('en-IN')}` : '—'}
                </td>
                <td>{c.distanceKm != null ? `${c.distanceKm} km` : '—'}</td>
                <td className="mono muted">{c.customerId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (products.length) {
    return (
      <div className={`llm-table-wrap ${compact ? 'compact' : ''}`}>
        <table className="llm-table sticky-head">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Units</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td className="strong">{p.name || '—'}</td>
                <td>{p.units ?? p.orders ?? '—'}</td>
                <td>₹{Number(p.revenue || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (metrics.length) {
    return (
      <div className={`llm-table-wrap ${compact ? 'compact' : ''}`}>
        <table className="llm-table sticky-head">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id}>
                <td className="strong">{m.label || m.id}</td>
                <td>{formatMetricValue(m)}</td>
                <td className="muted">{m.unit || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="llm-studio-empty">
      <p>{result.headline || 'No tabular rows in this answer.'}</p>
    </div>
  );
}

function AnswerCard({ turn, onOpenStudio, onExport }) {
  const r = turn.result;
  if (turn.error || !r) {
    return <p className={turn.error ? 'text-red-600' : ''}>{turn.content}</p>;
  }

  const primary = r.primaryMetric || r.metrics?.[0];
  const others = (r.metrics || []).filter((m) => m.id !== primary?.id).slice(0, 10);
  const dims = r.dimensions || {};
  const dimEntries = Object.entries(dims).filter(
    ([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)
  );
  const hasExport =
    (r.customers?.length || 0) + (r.products?.length || 0) + (r.metrics?.length || 0) > 0;
  const isChat = r.kind === 'chat' || r.kind === 'greeting';

  return (
    <div className="space-y-4">
      <div className="llm-ai-head">
        <div className="llm-ai-badge">
          <Sparkles className="w-3.5 h-3.5" /> Intelligence
        </div>
        {hasExport && (
          <div className="llm-ai-tools">
            <button type="button" className="llm-btn-ghost sm" onClick={() => onOpenStudio(r)}>
              <PanelRightOpen className="w-3.5 h-3.5" /> Studio
            </button>
            <button type="button" className="llm-btn-ghost sm" onClick={() => onExport('csv')}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" className="llm-btn-ghost sm" onClick={() => onExport('json')}>
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        )}
      </div>

      {!isChat && primary && (
        <div className="llm-hero-metric">
          <div className="llm-answer-label">{primary.label || primary.id || 'Answer'}</div>
          <div className="llm-answer-value">{formatMetricValue(primary)}</div>
        </div>
      )}

      {(isChat || !primary) && (
        <div className="llm-answer-value chat">{r.headline}</div>
      )}

      {(r.explanation || r.narrative) && (
        <p className="llm-narrative">{r.explanation || r.narrative}</p>
      )}

      {!isChat && primary && r.headline && r.headline !== formatMetricValue(primary) && (
        <p className="llm-narrative soft">{r.headline}</p>
      )}

      <div className="llm-chip-row">
        {r.period && <span className="llm-pill">Period · {r.period}</span>}
        <span className="llm-pill">Data · {r.freshness || 'live'}</span>
        {dims.status && <span className="llm-pill strong">Status · {dims.status}</span>}
        {dims.product && <span className="llm-pill">Product · {dims.product}</span>}
        {dims.radius_km != null && (
          <span className="llm-pill">Radius · {dims.radius_km} km</span>
        )}
        {r.customers?.length > 0 && (
          <span className="llm-pill strong">{r.customers.length} customers</span>
        )}
      </div>

      {r.clarification?.candidates?.length > 0 && (
        <div className="llm-clarify">
          <p className="font-medium mb-2">{r.headline}</p>
          <ul className="space-y-1">
            {r.clarification.candidates.map((c) => (
              <li key={c.productId} className="llm-clarify-item">
                {c.name}
                <span className="opacity-50 text-xs ml-2">
                  {Math.round((c.score || 0) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {others.length > 0 && (
        <div className="llm-metrics-grid">
          {others.map((m) => (
            <div key={m.id} className="llm-metric">
              <div className="llm-metric-label">{m.label || m.id}</div>
              <div className="llm-metric-value">{formatMetricValue(m)}</div>
            </div>
          ))}
        </div>
      )}

      {r.products?.length > 0 && (
        <div>
          <div className="llm-section-title">
            <BarChart3 className="w-4 h-4" /> Top products
            <span className="llm-section-count">{r.products.length}</span>
          </div>
          <div className="llm-table-wrap inline">
            <table className="llm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {r.products.slice(0, 12).map((p, i) => (
                  <tr key={i}>
                    <td>{p.name || '—'}</td>
                    <td>{p.units ?? p.orders}</td>
                    <td>₹{Number(p.revenue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.products.length > 12 && (
            <button type="button" className="llm-link-btn" onClick={() => onOpenStudio(r)}>
              View all {r.products.length} in studio →
            </button>
          )}
        </div>
      )}

      {r.customers?.length > 0 && (
        <div>
          <div className="llm-section-title">
            <Users className="w-4 h-4" /> Customers
            <span className="llm-section-count">{r.customers.length}</span>
          </div>
          <div className="llm-table-wrap inline">
            <table className="llm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </span>
                  </th>
                  <th>Orders</th>
                  <th>Spend</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {r.customers.slice(0, 12).map((c, i) => (
                  <tr key={i}>
                    <td className="strong">{c.name || '—'}</td>
                    <td className="mono">{c.phone || '—'}</td>
                    <td>{c.orders ?? '—'}</td>
                    <td>
                      {c.spend != null ? `₹${Number(c.spend).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>{c.distanceKm != null ? `${c.distanceKm} km` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.customers.length > 12 && (
            <button type="button" className="llm-link-btn" onClick={() => onOpenStudio(r)}>
              Open full list in studio →
            </button>
          )}
        </div>
      )}

      {r.sources?.length > 0 && (
        <div className="llm-panel">
          <div className="llm-section-title">Sources</div>
          <ul className="llm-source-list">
            {r.sources.map((s, i) => (
              <li key={i}>
                <span className="llm-source-kind">{s.kind || 'data'}</span>
                <strong>{s.name}</strong>
                {s.detail && <span className="llm-muted"> — {s.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dimEntries.length > 0 && (
        <div className="llm-panel">
          <div className="llm-section-title">Dimensions</div>
          <div className="llm-dim-grid">
            {dimEntries.map(([k, v]) => (
              <div key={k} className="llm-dim">
                <div className="llm-dim-k">{k.replace(/_/g, ' ')}</div>
                <div className="llm-dim-v">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.calculationSteps?.length > 0 && (
        <details className="llm-calc">
          <summary>
            <Calculator className="w-4 h-4" /> How this was calculated
          </summary>
          <ol>
            {r.calculationSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}

      {r.confidence?.overall != null && (
        <p className="llm-meta">
          Confidence {Math.round(r.confidence.overall * 100)}%
          {r.confidence.product != null &&
            ` · Product match ${Math.round(r.confidence.product * 100)}%`}
        </p>
      )}
    </div>
  );
}

const LLM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --llm-ink: #0f172a;
    --llm-muted: #64748b;
    --llm-bg: #f8fafc;
    --llm-bg-soft: #f1f5f9;
    --llm-card: #ffffff;
    --llm-line: #e2e8f0;
    --llm-line-strong: #cbd5e1;
    --llm-blue: #2563eb;
    --llm-blue-deep: #1d4ed8;
    --llm-blue-soft: #eff6ff;
    --llm-blue-mid: #dbeafe;
    --llm-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04);
    --llm-shadow-lg: 0 12px 40px rgba(15, 23, 42, 0.08);
    --llm-radius: 14px;
  }

  .llm-root {
    font-family: "DM Sans", "Segoe UI", system-ui, sans-serif;
    color: var(--llm-ink);
    background:
      radial-gradient(900px 420px at 0% 0%, rgba(37, 99, 235, 0.07) 0%, transparent 55%),
      radial-gradient(700px 380px at 100% 0%, rgba(148, 163, 184, 0.18) 0%, transparent 50%),
      linear-gradient(180deg, #ffffff 0%, var(--llm-bg) 40%, var(--llm-bg-soft) 100%);
  }

  .llm-header {
    display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
    padding: 0.75rem 1.15rem; border-bottom: 1px solid var(--llm-line);
    background: rgba(255, 255, 255, 0.86); backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 20; flex-wrap: wrap;
  }
  .llm-header-title {
    font-size: 0.98rem; font-weight: 700; letter-spacing: -0.025em; color: var(--llm-ink);
  }
  .llm-header-sub { font-size: 0.72rem; color: var(--llm-muted); }
  .llm-brand-mark {
    width: 2.6rem; height: 2.6rem; border-radius: 12px; display: grid; place-items: center;
    color: #fff;
    background: linear-gradient(145deg, var(--llm-blue) 0%, var(--llm-blue-deep) 100%);
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
  }
  .llm-brand-mark.sm { width: 2rem; height: 2rem; border-radius: 10px; }

  .llm-tabs {
    display: inline-flex; border: 1px solid var(--llm-line); border-radius: 999px; overflow: hidden;
    background: var(--llm-bg);
  }
  .llm-tabs.sm button { padding: 0.3rem 0.65rem; font-size: 0.72rem; gap: 0.3rem; display: inline-flex; align-items: center; }
  .llm-tabs button {
    border: 0; background: transparent; padding: 0.35rem 0.85rem; font-size: 0.8rem;
    cursor: pointer; color: var(--llm-muted); font-weight: 500; font-family: inherit;
  }
  .llm-tabs button.on {
    background: var(--llm-blue); color: #fff; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  }

  .llm-pin-card {
    background: var(--llm-card); border: 1px solid var(--llm-line); border-radius: 20px;
    padding: 2rem 1.5rem; box-shadow: var(--llm-shadow-lg); text-align: center;
    animation: llm-in 0.4s ease both;
  }
  .llm-pin-card .llm-brand-mark { margin: 0 auto 1rem; }
  .llm-pin-title { font-size: 1.45rem; font-weight: 700; letter-spacing: -0.03em; }
  .llm-pin-sub { color: var(--llm-muted); font-size: 0.9rem; margin: 0.4rem 0 1.25rem; line-height: 1.5; }

  .llm-input, .llm-textarea {
    width: 100%; border: 1px solid var(--llm-line); background: #fff; border-radius: 12px;
    padding: 0.72rem 0.9rem; font: inherit; color: var(--llm-ink); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .llm-input:focus, .llm-textarea:focus {
    border-color: rgba(37, 99, 235, 0.55);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .llm-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    background: linear-gradient(145deg, var(--llm-blue), var(--llm-blue-deep));
    color: #fff; border: none; border-radius: 12px; padding: 0.72rem 1rem; font-weight: 600;
    cursor: pointer; font-family: inherit; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.22);
  }
  .llm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
  .llm-btn-ghost {
    display: inline-flex; align-items: center; gap: 0.35rem; background: #fff;
    border: 1px solid var(--llm-line); border-radius: 999px; padding: 0.38rem 0.75rem;
    font-size: 0.78rem; color: var(--llm-muted); cursor: pointer; font-family: inherit; font-weight: 500;
  }
  .llm-btn-ghost:hover { border-color: var(--llm-line-strong); color: var(--llm-ink); background: var(--llm-bg); }
  .llm-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
  .llm-btn-ghost.sm { padding: 0.28rem 0.55rem; font-size: 0.72rem; }

  .llm-card {
    background: var(--llm-card); border: 1px solid var(--llm-line); border-radius: var(--llm-radius);
    padding: 1.1rem 1.2rem; box-shadow: var(--llm-shadow);
  }
  .llm-section-h {
    display: flex; align-items: center; gap: 0.45rem; font-size: 1rem; font-weight: 650; margin-bottom: 0.35rem;
    color: var(--llm-ink);
  }
  .llm-muted { color: var(--llm-muted); font-size: 0.9rem; line-height: 1.5; }
  .llm-tag-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .llm-tag {
    font-size: 0.75rem; border: 1px solid var(--llm-line); border-radius: 999px; padding: 0.25rem 0.6rem;
    background: var(--llm-bg);
  }
  .llm-tag em { font-style: normal; opacity: 0.55; margin-left: 0.35rem; font-size: 0.65rem; }
  .llm-banner {
    display: flex; align-items: flex-start; gap: 0.5rem; text-align: left; width: 100%;
    border: 1px solid var(--llm-blue-mid); background: var(--llm-blue-soft);
    border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.85rem; margin-bottom: 0.75rem; cursor: pointer;
    color: #1e3a8a;
  }

  .llm-workspace {
    flex: 1; display: flex; min-height: 0; overflow: hidden;
  }
  .llm-chat-pane {
    flex: 1; min-width: 0; display: flex; flex-direction: column;
    max-width: 820px; width: 100%; margin: 0 auto; padding: 1rem 1.15rem 1rem;
  }
  .llm-chat-scroll {
    flex: 1; overflow-y: auto; space-y: 0; display: flex; flex-direction: column; gap: 1rem;
    padding-bottom: 0.5rem; scroll-behavior: smooth;
  }

  .llm-hero { padding: 1.75rem 0.25rem 1rem; }
  .llm-eyebrow {
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--llm-blue); margin-bottom: 0.55rem;
  }
  .llm-hero-title {
    font-size: clamp(1.55rem, 3.5vw, 2.05rem); font-weight: 700; letter-spacing: -0.035em; line-height: 1.15;
  }
  .llm-hero-sub { color: var(--llm-muted); margin-top: 0.55rem; max-width: 34rem; line-height: 1.55; font-size: 0.95rem; }
  .llm-suggestions { margin-top: 1.35rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .llm-chip {
    display: flex; align-items: flex-start; gap: 0.5rem; text-align: left; padding: 0.8rem 0.95rem;
    border-radius: 14px; border: 1px solid var(--llm-line); background: #fff;
    font-size: 0.88rem; color: var(--llm-ink); cursor: pointer; box-shadow: var(--llm-shadow);
    transition: border-color 0.15s, transform 0.15s;
  }
  .llm-chip:hover { border-color: var(--llm-blue-mid); transform: translateY(-1px); }

  .llm-bubble-user {
    margin-left: auto; max-width: min(92%, 560px);
    background: linear-gradient(145deg, var(--llm-blue), var(--llm-blue-deep));
    color: #fff; padding: 0.85rem 1.05rem; border-radius: 16px 16px 4px 16px;
    animation: llm-in 0.28s ease both; font-size: 0.95rem; line-height: 1.45;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
  }
  .llm-bubble-ai {
    max-width: 100%; background: #fff; border: 1px solid var(--llm-line);
    padding: 1.1rem 1.2rem; border-radius: 16px 16px 16px 4px;
    animation: llm-in 0.32s ease both; box-shadow: var(--llm-shadow);
  }

  .llm-ai-head {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;
  }
  .llm-ai-badge {
    display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--llm-blue);
    background: var(--llm-blue-soft); border: 1px solid var(--llm-blue-mid);
    padding: 0.25rem 0.55rem; border-radius: 999px;
  }
  .llm-ai-tools { display: flex; flex-wrap: wrap; gap: 0.35rem; }

  .llm-hero-metric {
    padding: 0.85rem 1rem; border-radius: 14px;
    background: linear-gradient(135deg, var(--llm-blue-soft), #fff 60%);
    border: 1px solid var(--llm-blue-mid);
  }
  .llm-answer-label {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--llm-muted); font-weight: 600;
  }
  .llm-answer-value {
    font-size: clamp(1.85rem, 4.5vw, 2.45rem); font-weight: 700; letter-spacing: -0.035em;
    line-height: 1.1; margin-top: 0.15rem; color: var(--llm-ink);
  }
  .llm-answer-value.chat {
    font-size: clamp(1.15rem, 2.5vw, 1.35rem); font-weight: 650; letter-spacing: -0.02em; line-height: 1.35;
  }
  .llm-narrative {
    margin-top: 0.15rem; color: #475569; font-size: 0.94rem; line-height: 1.6; white-space: pre-wrap;
  }
  .llm-narrative.soft { color: var(--llm-muted); font-size: 0.88rem; }
  .llm-meta { margin-top: 0.35rem; font-size: 0.75rem; color: var(--llm-muted); }

  .llm-metrics-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;
  }
  .llm-metric {
    border: 1px solid var(--llm-line); border-radius: 12px; padding: 0.65rem 0.75rem; background: var(--llm-bg);
  }
  .llm-metric-label { font-size: 0.68rem; color: var(--llm-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  .llm-metric-value { font-size: 1.08rem; font-weight: 700; margin-top: 0.15rem; }

  .llm-section-title {
    display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; font-weight: 650;
    margin-bottom: 0.45rem; color: var(--llm-ink);
  }
  .llm-section-count {
    margin-left: auto; font-size: 0.7rem; font-weight: 600; color: var(--llm-blue);
    background: var(--llm-blue-soft); padding: 0.15rem 0.45rem; border-radius: 999px;
  }

  .llm-table-wrap {
    border: 1px solid var(--llm-line); border-radius: 12px; overflow: auto; background: #fff;
    max-height: 100%;
  }
  .llm-table-wrap.inline { max-height: 280px; }
  .llm-table-wrap.compact .llm-table td,
  .llm-table-wrap.compact .llm-table th { padding: 0.28rem 0.45rem; font-size: 0.78rem; }
  .llm-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  .llm-table.sticky-head thead th { position: sticky; top: 0; background: var(--llm-bg); z-index: 1; }
  .llm-table th {
    text-align: left; font-weight: 650; color: var(--llm-muted); font-size: 0.68rem;
    text-transform: uppercase; letter-spacing: 0.04em; padding: 0.55rem 0.65rem;
    border-bottom: 1px solid var(--llm-line); white-space: nowrap;
  }
  .llm-table td {
    padding: 0.55rem 0.65rem; border-bottom: 1px solid var(--llm-line); vertical-align: middle;
  }
  .llm-table tr:last-child td { border-bottom: 0; }
  .llm-table tr:hover td { background: var(--llm-blue-soft); }
  .llm-table td.strong { font-weight: 600; }
  .llm-table td.mono, .llm-table .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.78rem;
  }
  .llm-table td.muted, .llm-table .muted { color: var(--llm-muted); }

  .llm-link-btn {
    margin-top: 0.45rem; border: 0; background: none; color: var(--llm-blue); font-weight: 600;
    font-size: 0.82rem; cursor: pointer; font-family: inherit; padding: 0;
  }
  .llm-link-btn:hover { text-decoration: underline; }

  .llm-calc { border-top: 1px solid var(--llm-line); padding-top: 0.65rem; font-size: 0.85rem; }
  .llm-calc summary {
    display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-weight: 600; list-style: none;
  }
  .llm-calc summary::-webkit-details-marker { display: none; }
  .llm-calc ol, .llm-calc ul { margin: 0.5rem 0 0 1.1rem; color: var(--llm-muted); }

  .llm-clarify {
    border: 1px solid var(--llm-blue-mid); background: var(--llm-blue-soft);
    border-radius: 12px; padding: 0.75rem;
  }
  .llm-status {
    display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.9rem;
    border-radius: 999px; border: 1px solid var(--llm-line); background: #fff;
    font-size: 0.85rem; color: var(--llm-muted); box-shadow: var(--llm-shadow); width: fit-content;
  }
  .llm-error { display: flex; align-items: center; gap: 0.4rem; color: #b91c1c; font-size: 0.9rem; }

  .llm-composer {
    display: grid; grid-template-columns: 1fr auto; gap: 0.55rem; align-items: end;
    padding-top: 0.65rem; background: linear-gradient(to top, var(--llm-bg) 65%, transparent);
  }
  .llm-send { width: 3rem; height: 3rem; padding: 0; border-radius: 14px; }

  .llm-pre {
    max-height: 28rem; overflow: auto; font-size: 0.78rem; line-height: 1.45;
    background: var(--llm-bg); border: 1px solid var(--llm-line);
    border-radius: 12px; padding: 0.85rem 1rem; white-space: pre-wrap; word-break: break-word;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .llm-param {
    border: 1px solid var(--llm-line); border-radius: 12px; padding: 0.65rem 0.8rem; background: var(--llm-bg);
  }
  .llm-chip-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .llm-pill {
    font-size: 0.7rem; border: 1px solid var(--llm-line); border-radius: 999px;
    padding: 0.22rem 0.55rem; color: var(--llm-muted); background: var(--llm-bg); font-weight: 500;
  }
  .llm-pill.strong {
    border-color: var(--llm-blue-mid); color: var(--llm-blue-deep); background: var(--llm-blue-soft);
  }
  .llm-panel {
    border: 1px solid var(--llm-line); border-radius: 12px; padding: 0.75rem 0.9rem; background: var(--llm-bg);
  }
  .llm-source-list { list-style: none; margin: 0.35rem 0 0; padding: 0; font-size: 0.85rem; }
  .llm-source-list li {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.35rem;
    padding: 0.3rem 0; border-top: 1px solid var(--llm-line);
  }
  .llm-source-list li:first-child { border-top: 0; }
  .llm-source-kind {
    font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--llm-muted); min-width: 3.2rem; font-weight: 600;
  }
  .llm-dim-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.45rem; margin-top: 0.35rem;
  }
  .llm-dim {
    border: 1px solid var(--llm-line); border-radius: 10px; padding: 0.45rem 0.55rem; background: #fff;
  }
  .llm-dim-k { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--llm-muted); font-weight: 600; }
  .llm-dim-v { font-size: 0.82rem; font-weight: 600; margin-top: 0.1rem; word-break: break-word; }

  /* ── Data studio (right panel) ─────────────────────────────── */
  .llm-studio {
    position: relative; display: flex; flex-direction: column;
    border-left: 1px solid var(--llm-line); background: #fff;
    box-shadow: -8px 0 32px rgba(15, 23, 42, 0.04);
    min-height: 0; flex-shrink: 0;
    animation: llm-slide 0.28s ease both;
  }
  .llm-studio.expanded {
    position: absolute; inset: 0; top: 0; z-index: 30; width: 100% !important;
    border-left: 0; animation: llm-in 0.25s ease both;
  }
  .llm-expanded .llm-workspace { position: relative; }
  .llm-studio-resizer {
    position: absolute; left: -3px; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 2;
  }
  .llm-studio-resizer:hover { background: rgba(37, 99, 235, 0.15); }
  .llm-studio-head {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;
    padding: 0.85rem 1rem; border-bottom: 1px solid var(--llm-line); background: linear-gradient(180deg, #fff, var(--llm-bg));
  }
  .llm-studio-title { font-size: 0.92rem; font-weight: 700; letter-spacing: -0.02em; }
  .llm-studio-sub { font-size: 0.72rem; color: var(--llm-muted); margin-top: 0.15rem; }
  .llm-studio-actions { display: flex; gap: 0.3rem; }
  .llm-icon-btn {
    width: 2rem; height: 2rem; border-radius: 8px; border: 1px solid var(--llm-line);
    background: #fff; display: grid; place-items: center; cursor: pointer; color: var(--llm-muted);
  }
  .llm-icon-btn:hover { color: var(--llm-ink); border-color: var(--llm-line-strong); }
  .llm-studio-toolbar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem;
    padding: 0.55rem 0.85rem; border-bottom: 1px solid var(--llm-line); background: #fff;
  }
  .llm-check {
    display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; color: var(--llm-muted);
    cursor: pointer; user-select: none;
  }
  .llm-studio-body { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
  .llm-studio-empty {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.75rem; padding: 2rem; text-align: center; color: var(--llm-muted); font-size: 0.88rem;
  }
  .llm-studio-editor {
    flex: 1; width: 100%; border: 0; resize: none; padding: 1rem 1.1rem;
    font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.8rem; line-height: 1.55;
    color: var(--llm-ink); background: #fafbfc; outline: none;
  }
  .llm-studio .llm-table-wrap { border: 0; border-radius: 0; flex: 1; }

  .llm-catalog-bar {
    display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
  }
  .llm-catalog-bar .llm-input { flex: 1; min-width: 160px; }
  .llm-catalog-list {
    margin-top: 0.65rem; max-height: 320px; overflow: auto;
    border: 1px solid var(--llm-line); border-radius: 12px; background: var(--llm-bg);
  }
  .llm-catalog-row {
    display: grid; grid-template-columns: 1fr auto auto; gap: 0.5rem; align-items: center;
    padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--llm-line); font-size: 0.85rem;
  }
  .llm-catalog-row:last-child { border-bottom: 0; }
  .llm-catalog-row.on { background: var(--llm-blue-soft); }
  .llm-catalog-row.empty .name { opacity: 0.55; }
  .llm-catalog-check {
    display: flex; align-items: center; gap: 0.5rem; cursor: pointer; min-width: 0;
  }
  .llm-catalog-check .name {
    font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .llm-catalog-row .count {
    font-size: 0.72rem; color: var(--llm-muted); font-variant-numeric: tabular-nums;
  }
  .llm-session-list {
    list-style: none; margin: 0; padding: 0; border: 1px solid var(--llm-line);
    border-radius: 12px; overflow: hidden;
  }
  .llm-session-list li {
    padding: 0.7rem 0.85rem; border-bottom: 1px solid var(--llm-line);
    display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.88rem;
  }
  .llm-session-list li:last-child { border-bottom: 0; }
  .llm-preview { border-top: 1px solid var(--llm-line); padding-top: 0.75rem; }

  @keyframes llm-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes llm-slide {
    from { opacity: 0.6; transform: translateX(12px); }
    to { opacity: 1; transform: none; }
  }
  .animate-llm-in { animation: llm-in 0.4s ease both; }
  @keyframes llm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
  .animate-llm-pulse { animation: llm-pulse 1.4s ease infinite; }

  @media (max-width: 860px) {
    .llm-studio:not(.expanded) {
      position: fixed; right: 0; top: 0; bottom: 0; z-index: 40; width: min(100vw, 420px) !important;
      box-shadow: -12px 0 40px rgba(15, 23, 42, 0.12);
    }
  }
`;
