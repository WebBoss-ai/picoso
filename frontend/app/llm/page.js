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
  ChevronDown,
  Key,
  Hash,
  Calendar,
  MapPin,
  Server,
  Boxes,
  Tag,
  DollarSign,
  ToggleLeft,
  Link as LinkIcon,
  Mail,
  Type,
  ListTree,
  LayoutDashboard,
  Plus,
  Trash2,
  Pencil,
  Wand2,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Save,
  HelpCircle,
} from 'lucide-react';

const PIN_KEY = 'picoso_llm_pin';
const CONV_KEY = 'picoso_llm_conversation';
const EDITOR_W_KEY = 'picoso_llm_editor_w';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';

const SUGGESTIONS = [
  'Total orders last month within 2km radius',
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

function stageLabel(stage, tool, data = {}) {
  if (data.label) return data.label;
  const map = {
    received: 'Received…',
    classifying: 'Understanding…',
    understanding: 'Understanding…',
    orchestrating: 'Orchestrating live steps…',
    planning: 'Planning…',
    waiting_for_tool: 'Selecting tools…',
    executing: tool ? `Running ${String(tool).replace(/_/g, ' ')}…` : 'Querying…',
    validating: 'Validating…',
    answering: 'Writing answer…',
    resolving_product: 'Finding product…',
    querying: 'Analytics query…',
    deterministic_mode: 'Tools engine…',
    tools_engine: 'Completing with tools…',
    fallback: 'Recovering…',
    completing_tools: 'Finishing metrics…',
    live: 'Exploring live data…',
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
  const head = String(result.headline || 'Analysis')
    .replace(/\*\*/g, '')
    .split('\n')[0]
    .slice(0, 200);
  if (head.includes('|---') || ((head.match(/\|/g) || []).length >= 4)) {
    lines.push(
      result.primaryMetric
        ? `${result.primaryMetric.label || result.primaryMetric.id}: ${formatMetricValue(result.primaryMetric)}`
        : 'Analysis'
    );
  } else {
    lines.push(head);
  }
  lines.push('');
  const expl = String(result.explanation || '').trim();
  if (expl && !expl.includes('|---') && (expl.match(/\|/g) || []).length < 4) {
    lines.push(expl);
    lines.push('');
  }
  if (result.primaryMetric) {
    lines.push(
      `Primary: ${result.primaryMetric.label || result.primaryMetric.id} = ${formatMetricValue(result.primaryMetric)}`
    );
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
        `${i + 1}. ${c.name || '—'} | ${c.phone || '—'} | orders ${c.orders ?? '—'} | spend ${c.spend != null ? c.spend : '—'} | ${c.distanceKm != null ? c.distanceKm + ' km' : '—'}`
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

// ── Semantic role → icon + color, used across cluster analysis views ──────────
const ROLE_META = {
  primary_key:      { icon: Key,        color: '#7c3aed', label: 'Primary key' },
  foreign_key:      { icon: LinkIcon,   color: '#2563eb', label: 'Reference' },
  identifier:       { icon: Hash,       color: '#6366f1', label: 'Identifier' },
  money:            { icon: DollarSign, color: '#059669', label: 'Money' },
  numeric:          { icon: Hash,       color: '#0891b2', label: 'Number' },
  quantity:         { icon: Hash,       color: '#0891b2', label: 'Quantity' },
  timestamp:        { icon: Calendar,   color: '#d97706', label: 'Date/Time' },
  status:           { icon: Tag,        color: '#db2777', label: 'Status' },
  category:         { icon: Tag,        color: '#db2777', label: 'Category' },
  label:            { icon: Type,       color: '#0f172a', label: 'Label' },
  email:            { icon: Mail,       color: '#0284c7', label: 'Email' },
  contact_phone:    { icon: Phone,      color: '#0284c7', label: 'Phone' },
  address:          { icon: MapPin,     color: '#ea580c', label: 'Address' },
  geo:              { icon: MapPin,     color: '#ea580c', label: 'Geo' },
  url:              { icon: LinkIcon,   color: '#0284c7', label: 'URL/Media' },
  boolean_flag:     { icon: ToggleLeft, color: '#65a30d', label: 'Flag' },
  collection_array: { icon: ListTree,   color: '#9333ea', label: 'List' },
  embedded_object:  { icon: Boxes,      color: '#9333ea', label: 'Object' },
  text:             { icon: Type,       color: '#64748b', label: 'Text' },
  unknown:          { icon: Type,       color: '#94a3b8', label: 'Unknown' },
};

const ENTITY_ROLE_META = {
  people:       { color: '#2563eb', label: 'People' },
  transaction:  { color: '#059669', label: 'Transactions' },
  catalog:      { color: '#d97706', label: 'Catalog' },
  ledger:       { color: '#7c3aed', label: 'Ledger' },
  event:        { color: '#db2777', label: 'Events' },
  config:       { color: '#64748b', label: 'Config' },
  other:        { color: '#94a3b8', label: 'General' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.unknown;
  const Icon = meta.icon;
  return (
    <span className="llm-role-badge" style={{ color: meta.color, background: `${meta.color}14`, borderColor: `${meta.color}33` }}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

/** One collection card — field profiles + full sample doc + learnings */
function CollectionCard({ coll }) {
  const [open, setOpen] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const entMeta = ENTITY_ROLE_META[coll.entityRole] || ENTITY_ROLE_META.other;

  return (
    <div className="llm-coll-card">
      <button type="button" className="llm-coll-head" onClick={() => setOpen((o) => !o)}>
        <ChevronDown className={`w-4 h-4 llm-coll-chevron ${open ? 'open' : ''}`} />
        <Table2 className="w-4 h-4 shrink-0" style={{ color: entMeta.color }} />
        <span className="llm-coll-name">{coll.name}</span>
        <span className="llm-coll-role" style={{ color: entMeta.color, background: `${entMeta.color}14` }}>
          {entMeta.label}
        </span>
        <span className="llm-coll-meta">
          {(coll.estimatedCount || 0).toLocaleString()} docs · {coll.fieldCount} fields
        </span>
      </button>

      {open && (
        <div className="llm-coll-body">
          {coll.entityReason && (
            <p className="llm-coll-reason">
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: entMeta.color }} />
              {coll.entityReason}
            </p>
          )}

          {/* Learnings */}
          {coll.learnings?.length > 0 && (
            <ul className="llm-learn-list">
              {coll.learnings.map((l, i) => (
                <li key={i}>
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Field table */}
          <div className="llm-field-table">
            <div className="llm-field-row llm-field-head">
              <span>Field</span>
              <span>Role</span>
              <span>Type</span>
              <span>Fill</span>
              <span>Sample values</span>
            </div>
            {coll.fields.map((f) => (
              <div key={f.path} className="llm-field-row">
                <span className="llm-field-path" title={f.path}>{f.path}</span>
                <span><RoleBadge role={f.role} /></span>
                <span className="llm-field-type">{f.type}</span>
                <span className="llm-field-fill">
                  <span className="llm-fill-bar">
                    <span style={{ width: `${Math.round((f.fillRate || 0) * 100)}%` }} />
                  </span>
                  {Math.round((f.fillRate || 0) * 100)}%
                </span>
                <span className="llm-field-samples">
                  {f.numeric
                    ? `min ${f.numeric.min} · max ${f.numeric.max} · avg ${f.numeric.avg}`
                    : f.dateRange
                    ? `${String(f.dateRange.earliest).slice(0, 10)} → ${String(f.dateRange.latest).slice(0, 10)}`
                    : (f.sampleValues || []).slice(0, 4).join('  ·  ') || '—'}
                  {f.distinctInSample != null && f.distinctInSample > 0 && (
                    <em className="llm-distinct"> ({f.distinctInSample} distinct)</em>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Full representative document */}
          {coll.fullSampleDoc && (
            <div className="llm-sample-doc">
              <button type="button" className="llm-sample-toggle" onClick={() => setShowDoc((s) => !s)}>
                <ChevronDown className={`w-3.5 h-3.5 llm-coll-chevron ${showDoc ? 'open' : ''}`} />
                Complete sample record
              </button>
              {showDoc && (
                <pre className="llm-pre llm-sample-pre">
                  {JSON.stringify(coll.fullSampleDoc, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One cluster card — summary + collections + relationships */
function ClusterCard({ cluster, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const roleTally = cluster.summary?.roleTally || {};

  return (
    <div className="llm-cluster-card">
      <button type="button" className="llm-cluster-head" onClick={() => setOpen((o) => !o)}>
        <ChevronDown className={`w-4 h-4 llm-coll-chevron ${open ? 'open' : ''}`} />
        <Server className="w-4 h-4 shrink-0" style={{ color: 'var(--llm-blue)' }} />
        <div className="llm-cluster-title">
          <span className="llm-cluster-name">{cluster.label}</span>
          <span className="llm-cluster-sub">
            {cluster.mode === 'self' ? 'app database' : cluster.host || 'external'}
            {cluster.dbName ? ` · ${cluster.dbName}` : ''}
          </span>
        </div>
        <span className={`llm-cluster-status ${cluster.status === 'error' ? 'err' : 'ok'}`}>
          {cluster.status === 'error' ? 'error' : 'connected'}
        </span>
      </button>

      {open && (
        <div className="llm-cluster-body">
          {cluster.error ? (
            <p className="llm-error-inline">
              <AlertCircle className="w-4 h-4" /> {cluster.error}
            </p>
          ) : (
            <>
              <div className="llm-cluster-stats">
                <div className="llm-cstat">
                  <span className="llm-cstat-v">{cluster.summary?.collectionCount || 0}</span>
                  <span className="llm-cstat-l">Collections</span>
                </div>
                <div className="llm-cstat">
                  <span className="llm-cstat-v">
                    {(cluster.summary?.totalDocuments || 0).toLocaleString()}
                  </span>
                  <span className="llm-cstat-l">Documents</span>
                </div>
                <div className="llm-cstat">
                  <span className="llm-cstat-v">{cluster.summary?.relationshipCount || 0}</span>
                  <span className="llm-cstat-l">Relationships</span>
                </div>
              </div>

              {/* Entity role tally */}
              {Object.keys(roleTally).length > 0 && (
                <div className="llm-tag-row" style={{ marginBottom: '0.5rem' }}>
                  {Object.entries(roleTally).map(([role, n]) => {
                    const m = ENTITY_ROLE_META[role] || ENTITY_ROLE_META.other;
                    return (
                      <span key={role} className="llm-role-badge" style={{ color: m.color, background: `${m.color}14`, borderColor: `${m.color}33` }}>
                        {m.label} · {n}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Relationships */}
              {cluster.relationships?.length > 0 && (
                <div className="llm-rel-box">
                  <div className="llm-section-title">Inferred relationships</div>
                  {cluster.relationships.map((r, i) => (
                    <div key={i} className="llm-rel-row">
                      <code>{r.from}.{r.fromField}</code>
                      <ChevronRight className="w-3 h-3 opacity-40" />
                      <code>{r.to}._id</code>
                    </div>
                  ))}
                </div>
              )}

              {/* Collections */}
              <div className="llm-coll-list">
                {(cluster.collections || []).map((c) => (
                  <CollectionCard key={c.name} coll={c} />
                ))}
                {(cluster.collections || []).length === 0 && (
                  <p className="llm-muted">No collections with data in this cluster.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Full clusters analysis panel — reused in Train + Brain tabs */
function ClusterAnalysisPanel({ clusters, busy, error, steps, onRefresh }) {
  return (
    <section className="llm-card">
      <h2 className="llm-section-h">
        <Boxes className="w-4 h-4" /> Connected clusters — deep analysis
        <button
          type="button"
          className="llm-btn-ghost sm"
          style={{ marginLeft: 'auto' }}
          onClick={onRefresh}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Re-analyze
        </button>
      </h2>
      <p className="llm-muted">
        Every connected MongoDB cluster is profiled automatically — collections, all fields with
        inferred roles, real sample records, and relationships. This is exactly what the AI uses to
        answer questions on live data.
      </p>

      {busy && (
        <div className="llm-live" style={{ marginTop: '0.75rem' }}>
          <ul className="llm-live-steps">
            {steps.map((s, i) => {
              const isLast = i === steps.length - 1;
              return (
                <li key={i} className={isLast ? 'active' : 'done'}>
                  {isLast ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  <span>{s}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <div className="llm-error" style={{ marginTop: '0.75rem' }}>
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {clusters && !busy && (
        <>
          <div className="llm-cluster-topline">
            <span>
              <strong>{clusters.clusterCount}</strong> cluster{clusters.clusterCount !== 1 ? 's' : ''}
            </span>
            <span>
              <strong>{clusters.totals?.collections || 0}</strong> collections
            </span>
            <span>
              <strong>{(clusters.totals?.documents || 0).toLocaleString()}</strong> documents
            </span>
          </div>
          <div className="llm-cluster-list">
            {clusters.clusters.map((c, i) => (
              <ClusterCard key={c.connectionId} cluster={c} defaultOpen={i === 0} />
            ))}
          </div>
        </>
      )}

      {!clusters && !busy && !error && (
        <p className="llm-muted" style={{ marginTop: '0.75rem' }}>
          No analysis yet — connect a cluster or press Re-analyze.
        </p>
      )}
    </section>
  );
}

// ── Dashboard: value formatting + dependency-free SVG charts ─────────────────
const CHART_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777', '#0891b2', '#65a30d', '#e11d48'];

function formatValue(n, spec = {}) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const num = Number(n);
  const { format = 'number', unit = '', currency = 'INR' } = spec;
  try {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(num);
    }
    if (format === 'percent') {
      return `${(Math.round(num * 100) / 100).toLocaleString()}%`;
    }
    if (format === 'compact') {
      return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
    }
    const rounded = Number.isInteger(num) ? num : Math.round(num * 100) / 100;
    const s = rounded.toLocaleString('en-IN');
    return unit ? `${s} ${unit}` : s;
  } catch {
    return String(n);
  }
}

function svgPointsMax(points, keys = ['value']) {
  let max = 0;
  let min = 0;
  for (const p of points) {
    for (const k of keys) {
      const v = Number(p[k]);
      if (!Number.isNaN(v)) {
        if (v > max) max = v;
        if (v < min) min = v;
      }
    }
  }
  if (max === min) max = min + 1;
  return { max, min };
}

function LineChart({ points, spec, area = false }) {
  const W = 320;
  const H = 130;
  const pad = { l: 6, r: 6, t: 10, b: 18 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const keys = points.some((p) => p.value2 != null) ? ['value', 'value2'] : ['value'];
  const { max, min } = svgPointsMax(points, keys);
  const n = points.length;
  const xOf = (i) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yOf = (v) => pad.t + ih - ((Number(v) - min) / (max - min)) * ih;

  const line = (key, color) => {
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(p[key]).toFixed(1)}`).join(' ');
    const areaD = `${d} L ${xOf(n - 1).toFixed(1)} ${pad.t + ih} L ${xOf(0).toFixed(1)} ${pad.t + ih} Z`;
    return (
      <g key={key}>
        {area && <path d={areaD} fill={color} opacity="0.12" />}
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={xOf(i)} cy={yOf(p[key])} r="2" fill={color} />
        ))}
      </g>
    );
  };

  const labelIdxs = n <= 4 ? points.map((_, i) => i) : [0, Math.floor(n / 2), n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="llm-chart-svg" preserveAspectRatio="none">
      {keys.map((k, i) => line(k, CHART_COLORS[i]))}
      {labelIdxs.map((i) => (
        <text key={i} x={xOf(i)} y={H - 4} className="llm-chart-xlabel" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
          {String(points[i]?.label ?? '').slice(0, 10)}
        </text>
      ))}
    </svg>
  );
}

function BarChart({ points, spec }) {
  const W = 320;
  const H = 130;
  const pad = { l: 6, r: 6, t: 10, b: 18 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const { max } = svgPointsMax(points, ['value']);
  const n = points.length || 1;
  const bw = Math.max(4, (iw / n) * 0.62);
  const gap = iw / n;
  const yOf = (v) => pad.t + ih - (Number(v) / max) * ih;
  const labelIdxs = n <= 6 ? points.map((_, i) => i) : [0, Math.floor(n / 2), n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="llm-chart-svg" preserveAspectRatio="none">
      {points.map((p, i) => {
        const x = pad.l + i * gap + (gap - bw) / 2;
        const y = yOf(p.value);
        const h = pad.t + ih - y;
        return <rect key={i} x={x} y={y} width={bw} height={Math.max(0, h)} rx="2" fill={CHART_COLORS[i % CHART_COLORS.length]} />;
      })}
      {labelIdxs.map((i) => (
        <text key={i} x={pad.l + i * gap + gap / 2} y={H - 4} className="llm-chart-xlabel" textAnchor="middle">
          {String(points[i]?.label ?? '').slice(0, 8)}
        </text>
      ))}
    </svg>
  );
}

function PieChart({ points, spec }) {
  const size = 130;
  const r = 56;
  const cx = size / 2;
  const cy = size / 2;
  const total = points.reduce((s, p) => s + (Number(p.value) || 0), 0) || 1;
  let acc = 0;
  const arcs = points.slice(0, 8).map((p, i) => {
    const frac = (Number(p.value) || 0) / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return {
      d: `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      color: CHART_COLORS[i % CHART_COLORS.length],
      label: p.label,
      pct: Math.round(frac * 100),
    };
  });
  return (
    <div className="llm-pie-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="llm-pie-svg">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth="1" />
        ))}
      </svg>
      <div className="llm-pie-legend">
        {arcs.map((a, i) => (
          <div key={i} className="llm-pie-legend-item">
            <span className="llm-pie-dot" style={{ background: a.color }} />
            <span className="llm-pie-legend-label">{String(a.label).slice(0, 18)}</span>
            <span className="llm-pie-legend-pct">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTableView({ rows, spec }) {
  const list = (rows || []).slice(0, 50);
  if (!list.length) return <p className="llm-muted">No rows.</p>;
  const cols = Object.keys(list[0]).filter((k) => k !== '_id').slice(0, 6);
  return (
    <div className="llm-dtable-wrap">
      <table className="llm-dtable">
        <thead>
          <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const v = r[c];
                return <td key={c}>{typeof v === 'number' ? v.toLocaleString('en-IN') : String(v ?? '—').slice(0, 40)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders any component spec + its live result. */
function ChartRenderer({ spec, result, loading, error }) {
  if (loading) {
    return (
      <div className="llm-chart-loading">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="llm-chart-error">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }
  if (!result || !result.ok) {
    return <div className="llm-chart-error"><AlertCircle className="w-4 h-4" /> {result?.error || 'No data'}</div>;
  }

  if (spec.viz === 'metric') {
    return (
      <div className="llm-metric-big">
        <div className="llm-metric-big-value">{formatValue(result.value, spec)}</div>
        {spec.unit && spec.format !== 'currency' && spec.format !== 'percent' && (
          <div className="llm-metric-big-unit">{spec.unit}</div>
        )}
      </div>
    );
  }
  if (spec.viz === 'table') {
    return <DataTableView rows={result.rows} spec={spec} />;
  }
  const points = result.points || [];
  if (!points.length) return <p className="llm-muted">No data points.</p>;
  if (spec.viz === 'line') return <LineChart points={points} spec={spec} />;
  if (spec.viz === 'area') return <LineChart points={points} spec={spec} area />;
  if (spec.viz === 'bar') return <BarChart points={points} spec={spec} />;
  if (spec.viz === 'pie') return <PieChart points={points} spec={spec} />;
  return <DataTableView rows={result.rows} spec={spec} />;
}

const VIZ_ICON = {
  metric: Activity,
  line: LineChartIcon,
  area: Activity,
  bar: BarChartIcon,
  pie: PieChartIcon,
  table: Table2,
};

/**
 * In-chat card: shows the freshly built component with a LIVE preview,
 * the model's assumptions, 2–4 clarifying questions (answerable inline),
 * a free-text correction box, and Add / Refine actions.
 */
function ComponentBuilderCard({ build, onRefine, onRun, onAdd }) {
  const [spec, setSpec] = useState(build.spec);
  const [preview, setPreview] = useState(build.preview);
  const [answers, setAnswers] = useState({});
  const [correction, setCorrection] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState('');
  const VizIcon = VIZ_ICON[spec.viz] || Activity;

  async function refine() {
    setBusy(true);
    setErr('');
    try {
      const answered = Object.entries(answers)
        .filter(([, v]) => v && v.trim())
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
      const data = await onRefine({
        prompt: correction,
        priorSpec: spec,
        userAnswers: Object.keys(answered).length ? answered : null,
        mode: 'refine',
      });
      setSpec(data.spec);
      setPreview(data.preview);
      setAnswers({});
      setCorrection('');
    } catch (e) {
      setErr(e.message || 'Refine failed');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setErr('');
    try {
      const r = await onRun(spec);
      setPreview(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="llm-builder-card">
      <div className="llm-builder-head">
        <span className="llm-builder-viz"><VizIcon className="w-3.5 h-3.5" /> {spec.viz}</span>
        <div className="llm-builder-title">
          <strong>{spec.title}</strong>
          {spec.subtitle && <span>{spec.subtitle}</span>}
        </div>
        <button type="button" className="llm-icon-btn" title="Refresh" onClick={refresh} disabled={busy}>
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="llm-builder-preview">
        <ChartRenderer spec={spec} result={preview} loading={busy} error={err} />
      </div>

      {spec.computedNote && <p className="llm-builder-note">{spec.computedNote}</p>}

      {spec.assumptions?.length > 0 && (
        <div className="llm-builder-assume">
          <div className="llm-section-title">Assumptions I made</div>
          <ul>
            {spec.assumptions.map((a, i) => (
              <li key={i}><CheckCircle2 className="w-3 h-3" /> {a}</li>
            ))}
          </ul>
        </div>
      )}

      {spec.clarifyingQuestions?.length > 0 && (
        <div className="llm-builder-q">
          <div className="llm-section-title">
            <HelpCircle className="w-3.5 h-3.5" /> Answer these to make it perfect
          </div>
          {spec.clarifyingQuestions.map((q) => (
            <div key={q.id} className="llm-builder-qrow">
              <label>{q.question}</label>
              {q.why && <span className="llm-builder-why">{q.why}</span>}
              <input
                className="llm-input"
                placeholder={q.exampleAnswer ? `e.g. ${q.exampleAnswer}` : 'Your answer…'}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      <textarea
        className="llm-textarea mt-2"
        rows={2}
        placeholder="Or type a correction — e.g. “group daily, not monthly” or “exclude cancelled orders”…"
        value={correction}
        onChange={(e) => setCorrection(e.target.value)}
      />

      <div className="llm-builder-actions">
        <button
          type="button"
          className="llm-btn-ghost"
          disabled={busy || (!correction.trim() && !Object.values(answers).some((v) => v && v.trim()))}
          onClick={refine}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Refine
        </button>
        <button
          type="button"
          className="llm-btn-primary"
          disabled={busy || added}
          onClick={async () => {
            await onAdd(spec);
            setAdded(true);
          }}
        >
          {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {added ? 'Added to dashboard' : 'Add to dashboard'}
        </button>
      </div>
    </div>
  );
}

/** A single live tile on the dashboard with refresh, edit-refine, remove. */
function DashboardTile({ spec, onRun, onRefine, onRemove, onUpdate }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState('');
  const [busy, setBusy] = useState(false);
  const VizIcon = VIZ_ICON[spec.viz] || Activity;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await onRun(spec);
      setResult(r);
      if (!r.ok) setError(r.error || 'No data');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(spec.pipeline), spec.collection, spec.connectionId]);

  useEffect(() => {
    load();
    if (spec.refreshSeconds > 0) {
      const t = setInterval(load, spec.refreshSeconds * 1000);
      return () => clearInterval(t);
    }
  }, [load, spec.refreshSeconds]);

  async function applyRefine() {
    setBusy(true);
    try {
      const data = await onRefine({ prompt: correction, priorSpec: spec, mode: 'refine' });
      onUpdate(data.spec);
      setResult(data.preview);
      setCorrection('');
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`llm-tile llm-tile-${spec.viz}`}>
      <div className="llm-tile-head">
        <span className="llm-tile-viz"><VizIcon className="w-3.5 h-3.5" /></span>
        <div className="llm-tile-title">
          <strong>{spec.title}</strong>
          {spec.subtitle && <span>{spec.subtitle}</span>}
        </div>
        <div className="llm-tile-tools">
          <button type="button" className="llm-icon-btn" title="Refresh" onClick={load}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" className="llm-icon-btn" title="Edit" onClick={() => setEditing((e) => !e)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="llm-icon-btn danger" title="Remove" onClick={() => onRemove(spec.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="llm-tile-body">
        <ChartRenderer spec={spec} result={result} loading={loading} error={error} />
      </div>

      {result?.meta?.ranAt && !editing && (
        <div className="llm-tile-foot">
          <span className="llm-dot on" /> live · {new Date(result.meta.ranAt).toLocaleTimeString()}
          {spec.refreshSeconds > 0 ? ` · auto ${spec.refreshSeconds}s` : ''}
        </div>
      )}

      {editing && (
        <div className="llm-tile-edit">
          <textarea
            className="llm-textarea"
            rows={2}
            placeholder="Refine — e.g. “make it daily”, “last 7 days”, “as a bar chart”…"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button type="button" className="llm-btn-primary" disabled={busy || !correction.trim()} onClick={applyRefine}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Apply
            </button>
            <button type="button" className="llm-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The dashboard page — futuristic grid of live, editable components. */
function DashboardView({ dashboard, setDashboard, busy, onReload, onSave, onRun, onRefine, goBuild }) {
  const components = dashboard?.components || [];

  async function removeComponent(id) {
    const next = components.filter((c) => c.id !== id);
    await onSave(next);
  }
  async function updateComponent(spec) {
    const next = components.map((c) => (c.id === spec.id ? spec : c));
    await onSave(next);
  }

  return (
    <div className="llm-dashboard">
      <div className="llm-dash-head">
        <div>
          <h2 className="llm-dash-title">{dashboard?.name || 'Dashboard'}</h2>
          <p className="llm-dash-sub">
            {components.length} live element{components.length !== 1 ? 's' : ''} · real-time from your clusters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="llm-btn-ghost" onClick={onReload} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Reload
          </button>
          <button type="button" className="llm-btn-primary" onClick={goBuild}>
            <Plus className="w-4 h-4" /> Build element
          </button>
        </div>
      </div>

      {components.length === 0 ? (
        <div className="llm-dash-empty">
          <div className="llm-dash-empty-icon"><LayoutDashboard className="w-8 h-8" /></div>
          <h3>Your dashboard is a blank canvas</h3>
          <p>
            Switch to Chat → <strong>Build dashboard element</strong> and describe anything —
            “users who joined today”, “daily revenue trend”, “orders by status”. The AI designs it
            live from your data, asks a couple of questions to get it exactly right, then you add it here.
          </p>
          <button type="button" className="llm-btn-primary" onClick={goBuild}>
            <Wand2 className="w-4 h-4" /> Build your first element
          </button>
        </div>
      ) : (
        <div className="llm-dash-grid">
          {components.map((c) => (
            <DashboardTile
              key={c.id}
              spec={c}
              onRun={onRun}
              onRefine={onRefine}
              onRemove={removeComponent}
              onUpdate={updateComponent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LlmPage() {
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [authing, setAuthing] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('ask');
  const [brainView, setBrainView] = useState('clusters');
  const [brainPack, setBrainPack] = useState(null);

  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [status, setStatus] = useState(null);
  const [liveSteps, setLiveSteps] = useState([]);
  const [liveNormalized, setLiveNormalized] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState('');
  const liveStepsRef = useRef([]);
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

  // Deep cluster analysis (transparent per-cluster learning)
  const [clusters, setClusters] = useState(null);
  const [clustersBusy, setClustersBusy] = useState(false);
  const [clustersError, setClustersError] = useState('');
  const [analyzeSteps, setAnalyzeSteps] = useState([]);

  // Dashboard builder
  const [dashboard, setDashboard] = useState(null);
  const [dashboardBusy, setDashboardBusy] = useState(false);
  const [buildMode, setBuildMode] = useState(false);

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
      loadDashboard(pin);
    }
  }, [ready, pin]);

  // Lazily analyze clusters the first time the operator opens Train or Brain
  useEffect(() => {
    if (ready && pin && (tab === 'train' || tab === 'brain') && !clusters && !clustersBusy) {
      loadClusters(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pin, tab]);

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

  // Deep-analyze every connected cluster with staged live progress
  async function loadClusters(p = pin) {
    setClustersBusy(true);
    setClustersError('');
    const stages = [
      'Connecting to clusters…',
      'Enumerating collections…',
      'Sampling documents…',
      'Profiling fields & inferring roles…',
      'Extracting sample records…',
      'Composing learnings…',
    ];
    setAnalyzeSteps(stages.slice(0, 1));
    let stageIdx = 0;
    const ticker = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setAnalyzeSteps(stages.slice(0, stageIdx + 1));
    }, 650);
    try {
      const res = await fetch(`${API_BASE}/llm/clusters`, {
        headers: apiHeaders(p, false),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Cluster analysis failed');
      setClusters(data);
    } catch (e) {
      setClustersError(e.message);
    } finally {
      clearInterval(ticker);
      setAnalyzeSteps([]);
      setClustersBusy(false);
    }
  }

  // ── Dashboard builder API ──────────────────────────────────────────────
  async function loadDashboard(p = pin) {
    setDashboardBusy(true);
    try {
      const res = await fetch(`${API_BASE}/llm/dashboard`, { headers: apiHeaders(p, false) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.dashboards?.length) setDashboard(data.dashboards[0]);
    } catch {
      /* ignore */
    } finally {
      setDashboardBusy(false);
    }
  }

  async function saveDashboard(components, meta = {}) {
    const board = dashboard || {};
    const body = {
      name: meta.name ?? board.name,
      description: meta.description ?? board.description,
      components,
    };
    try {
      const res = await fetch(
        `${API_BASE}/llm/dashboard/${board.id || ''}`.replace(/\/$/, ''),
        {
          method: 'PUT',
          headers: apiHeaders(pin),
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.dashboard) setDashboard(data.dashboard);
      return data.dashboard;
    } catch {
      return null;
    }
  }

  // Build or refine a component spec (returns { spec, preview })
  async function buildComponent({ prompt, priorSpec, userAnswers, mode }) {
    const res = await fetch(`${API_BASE}/llm/dashboard/build`, {
      method: 'POST',
      headers: apiHeaders(pin),
      body: JSON.stringify({ prompt, priorSpec, userAnswers, mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Build failed');
    return data;
  }

  // Execute a spec for live data
  async function runComponent(spec) {
    const res = await fetch(`${API_BASE}/llm/dashboard/run`, {
      method: 'POST',
      headers: apiHeaders(pin),
      body: JSON.stringify({ spec }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Run failed');
    return data;
  }

  // Add a built component to the dashboard + persist
  async function addComponentToDashboard(spec) {
    const existing = dashboard?.components || [];
    const next = [...existing.filter((c) => c.id !== spec.id), spec];
    await saveDashboard(next);
    return next;
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
      await loadClusters();
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
      await loadClusters();
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
      await loadClusters();
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

      // ── Dashboard element building mode ──────────────────────────────
      if (buildMode) {
        setLoading(true);
        setError('');
        setMessage('');
        setTab('ask');
        setTurns((t) => [...t, { role: 'user', content: q }]);
        setStatus({ stage: 'building', label: 'Designing component…' });
        setLiveSteps([
          { id: 'b1', label: 'Reading live schema of connected clusters…' },
          { id: 'b2', label: 'Designing the aggregation & visual…' },
        ]);
        try {
          const data = await buildComponent({ prompt: q, mode: 'create' });
          setTurns((t) => [
            ...t,
            { role: 'assistant', kind: 'component', build: data, prompt: q },
          ]);
        } catch (e) {
          setError(e.message || 'Could not build component');
        } finally {
          setLoading(false);
          setStatus(null);
          setLiveSteps([]);
        }
        return;
      }

      setLoading(true);
      setError('');
      setStatus({ stage: 'received', label: 'Received…' });
      setLiveSteps([{ id: 'received', label: 'Received your question…', at: Date.now() }]);
      liveStepsRef.current = [{ id: 'received', label: 'Received your question…', at: Date.now() }];
      setLiveNormalized('');
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

            if (event === 'status') {
              setStatus(data);
              if (data.normalized) setLiveNormalized(data.normalized);
              const label = stageLabel(data.stage, data.tool, data);
              if (label && !data.pending) {
                setLiveSteps((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.label === label) return prev;
                  const next = [
                    ...prev,
                    {
                      id: `${data.stage || 's'}_${data.step || data.tool || prev.length}`,
                      label,
                      tool: data.tool,
                      at: Date.now(),
                    },
                  ].slice(-14);
                  liveStepsRef.current = next;
                  return next;
                });
              }
            } else if (event === 'result') {
              finalResult = data;
              setTurns((t) => [
                ...t,
                {
                  role: 'assistant',
                  content: data.headline || data.error || 'Done',
                  result: data,
                  error: Boolean(data.error),
                  liveSteps: liveStepsRef.current,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message, loading, pin, conversationId, buildMode]
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

      <div className="llm-shell">
        <aside className="llm-sidebar">
          {[
            { id: 'ask', label: 'Chat', icon: Sparkles },
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'train', label: 'Train', icon: Database },
            { id: 'brain', label: 'Brain', icon: Brain },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`llm-nav-item ${tab === item.id ? 'on' : ''}`}
                onClick={() => {
                  setTab(item.id);
                  if (item.id === 'brain') loadBrain();
                  if (item.id === 'dashboard') loadDashboard();
                }}
                title={item.label}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="llm-nav-spacer" />
          <div className="llm-nav-foot">
            <span className={`llm-dot ${trained ? 'on' : ''}`} />
            {trained ? 'Brain online' : 'Live tools'}
          </div>
        </aside>

        <div className="llm-main">
      {tab === 'dashboard' ? (
        <DashboardView
          dashboard={dashboard}
          setDashboard={setDashboard}
          busy={dashboardBusy}
          onReload={loadDashboard}
          onSave={saveDashboard}
          onRun={runComponent}
          onRefine={buildComponent}
          goBuild={() => {
            setTab('ask');
            setBuildMode(true);
          }}
        />
      ) : tab === 'train' ? (
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 space-y-5 overflow-y-auto">
          <ClusterAnalysisPanel
            clusters={clusters}
            busy={clustersBusy}
            error={clustersError}
            steps={analyzeSteps}
            onRefresh={() => loadClusters()}
          />

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
                ['clusters', 'Clusters'],
                ['history', 'Learning'],
                ['params', 'Parameters'],
                ['text', 'Text'],
                ['json', 'JSON schema'],
                ['live', 'Live map'],
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
            <button
              type="button"
              className="llm-btn-ghost mt-3 ml-2"
              onClick={() => {
                loadBrain();
                loadClusters();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {!brain && !draftModel && brainView !== 'clusters' && (
              <p className="llm-muted mt-4">No brain yet — train from paste or Mongo first.</p>
            )}
            {brainView === 'clusters' && (
              <div className="mt-3">
                {clustersBusy && (
                  <div className="llm-live">
                    <ul className="llm-live-steps">
                      {analyzeSteps.map((s, i) => {
                        const isLast = i === analyzeSteps.length - 1;
                        return (
                          <li key={i} className={isLast ? 'active' : 'done'}>
                            {isLast ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{s}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {clustersError && (
                  <div className="llm-error">
                    <AlertCircle className="w-4 h-4" /> {clustersError}
                  </div>
                )}
                {clusters && !clustersBusy && (
                  <>
                    <div className="llm-cluster-topline">
                      <span><strong>{clusters.clusterCount}</strong> clusters</span>
                      <span><strong>{clusters.totals?.collections || 0}</strong> collections</span>
                      <span><strong>{(clusters.totals?.documents || 0).toLocaleString()}</strong> documents</span>
                    </div>
                    <div className="llm-cluster-list">
                      {clusters.clusters.map((c, i) => (
                        <ClusterCard key={c.connectionId} cluster={c} defaultOpen={i === 0} />
                      ))}
                    </div>
                  </>
                )}
                {!clusters && !clustersBusy && !clustersError && (
                  <p className="llm-muted">Open Train or press refresh to analyze connected clusters.</p>
                )}
              </div>
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
                    <div className="llm-section-title mt-3">Brain versions (full text each)</div>
                    <ul className="llm-session-list">
                      {brainPack.history.map((h) => (
                        <li key={h.id}>
                          <strong>
                            v{h.version} · {h.name}
                          </strong>
                          <span className="llm-muted">
                            {h.status} · {h.source} · {h.parametersCount ?? 0} params ·{' '}
                            {h.entitiesCount ?? 0} entities · {h.sessions || 0} sessions
                            {h.updatedAt
                              ? ` · ${new Date(h.updatedAt).toLocaleString()}`
                              : ''}
                          </span>
                          {h.businessContext ? (
                            <p className="llm-muted" style={{ marginTop: 4 }}>
                              Context: {h.businessContext.slice(0, 200)}
                              {h.businessContext.length > 200 ? '…' : ''}
                            </p>
                          ) : null}
                          <details className="llm-calc" style={{ marginTop: 8 }}>
                            <summary>Text brain for v{h.version}</summary>
                            <pre className="llm-pre mt-2" style={{ maxHeight: '16rem' }}>
                              {h.textBrain || h.textPreview || '(empty text for this version)'}
                            </pre>
                          </details>
                          {(h.learningSessions || []).length > 0 && (
                            <details className="llm-calc" style={{ marginTop: 6 }}>
                              <summary>Sessions on this version</summary>
                              <ul style={{ margin: '0.5rem 0 0 1rem', color: 'var(--llm-muted)' }}>
                                {h.learningSessions
                                  .slice()
                                  .reverse()
                                  .map((s, i) => (
                                    <li key={i}>
                                      {s.label || s.source} · {s.note || ''} · +
                                      {s.recordCount ?? 0} rec
                                    </li>
                                  ))}
                              </ul>
                            </details>
                          )}
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
              <div className="mt-3 space-y-4">
                {(() => {
                  const m = draftModel || brain || {};
                  const entities = m.entities || [];
                  const metrics = m.metrics || [];
                  const dimensions = m.dimensions || [];
                  const params = brain?.parameters || draftModel?.parameters || [];
                  return (
                    <>
                      <div className="llm-metrics-grid">
                        <div className="llm-metric">
                          <div className="llm-metric-label">Entities</div>
                          <div className="llm-metric-value">{entities.length}</div>
                        </div>
                        <div className="llm-metric">
                          <div className="llm-metric-label">Metrics</div>
                          <div className="llm-metric-value">{metrics.length}</div>
                        </div>
                        <div className="llm-metric">
                          <div className="llm-metric-label">Dimensions</div>
                          <div className="llm-metric-value">{dimensions.length}</div>
                        </div>
                        <div className="llm-metric">
                          <div className="llm-metric-label">Parameters</div>
                          <div className="llm-metric-value">{params.length}</div>
                        </div>
                      </div>

                      {entities.length > 0 && (
                        <div>
                          <div className="llm-section-title">Entities the AI recognises</div>
                          <div className="space-y-2 mt-2">
                            {entities.map((e) => (
                              <div key={e.id || e.name} className="llm-param">
                                <div className="font-semibold">
                                  {e.name}{' '}
                                  <em className="opacity-50 font-normal">
                                    {e.role} · {e.collectionName}
                                  </em>
                                </div>
                                {e.description && <div className="llm-muted text-sm">{e.description}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {metrics.length > 0 && (
                        <div>
                          <div className="llm-section-title">Metrics it can compute</div>
                          <div className="space-y-2 mt-2">
                            {metrics.map((mt) => (
                              <div key={mt.id} className="llm-param">
                                <div className="font-semibold">
                                  {mt.name}{' '}
                                  <em className="opacity-50 font-normal">
                                    {mt.aggregation}
                                    {mt.field ? `(${mt.field})` : ''} · {mt.entity}
                                  </em>
                                </div>
                                {mt.description && <div className="llm-muted text-sm">{mt.description}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dimensions.length > 0 && (
                        <div>
                          <div className="llm-section-title">Dimensions for grouping / filtering</div>
                          <div className="llm-tag-row mt-2">
                            {dimensions.map((d) => (
                              <span key={d.id} className="llm-tag">
                                {d.name}
                                <em>{d.dataType || d.type}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {params.length > 0 && (
                        <div>
                          <div className="llm-section-title">Raw parameters</div>
                          <div className="space-y-2 mt-2">
                            {params.map((p) => (
                              <div key={p.name} className="llm-param">
                                <div className="font-semibold">
                                  {p.name} <em className="opacity-50 font-normal">{p.type}</em>
                                </div>
                                {p.description && <div className="llm-muted text-sm">{p.description}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {entities.length === 0 && metrics.length === 0 && params.length === 0 && (
                        <p className="llm-muted">
                          No parameters yet — the Clusters tab shows live field-level detail even before training.
                        </p>
                      )}
                    </>
                  );
                })()}
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
                  ) : t.kind === 'component' ? (
                    <div key={i} className="llm-bubble-ai">
                      <ComponentBuilderCard
                        build={t.build}
                        onRefine={buildComponent}
                        onRun={runComponent}
                        onAdd={async (spec) => {
                          await addComponentToDashboard(spec);
                          setTab('dashboard');
                        }}
                      />
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

                {loading && (status || liveSteps.length > 0) && (
                  <div className="llm-live">
                    {liveNormalized && (
                      <div className="llm-live-norm">
                        <span className="llm-live-norm-k">Understood</span>
                        <span>{liveNormalized}</span>
                      </div>
                    )}
                    <ul className="llm-live-steps">
                      {liveSteps.map((s, i) => {
                        const isLast = i === liveSteps.length - 1;
                        return (
                          <li key={s.id || i} className={isLast ? 'active' : 'done'}>
                            {isLast ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>{s.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {error && !loading && (
                  <div className="llm-error">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
              </div>

              <div className="llm-mode-switch">
                <button
                  type="button"
                  className={!buildMode ? 'on' : ''}
                  onClick={() => setBuildMode(false)}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Ask
                </button>
                <button
                  type="button"
                  className={buildMode ? 'on' : ''}
                  onClick={() => setBuildMode(true)}
                >
                  <Wand2 className="w-3.5 h-3.5" /> Build dashboard element
                </button>
              </div>
              <div className={`llm-composer ${buildMode ? 'build' : ''}`}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      ask();
                    }
                  }}
                  placeholder={
                    buildMode
                      ? 'Describe a dashboard element, e.g. “users who joined today” or “daily profit”…'
                      : 'Ask for metrics, customers, rankings — or “export list of…”'
                  }
                  rows={2}
                  className="llm-textarea"
                  disabled={loading}
                />
                <button
                  type="button"
                  disabled={loading || !message.trim()}
                  className="llm-btn-primary llm-send"
                  aria-label={buildMode ? 'Build' : 'Ask'}
                  onClick={() => ask()}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : buildMode ? (
                    <Wand2 className="w-5 h-5" />
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
      </div>
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

function cleanDisplayText(text) {
  if (!text) return '';
  const t = String(text);
  // Hide raw markdown tables / pipe dumps
  if (/\|[-:\s|]+\|/.test(t) || ((t.match(/\|/g) || []).length >= 8 && t.includes('|'))) {
    return '';
  }
  return t
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

function AnswerCard({ turn, onOpenStudio, onExport }) {
  const r = turn.result;
  if (turn.error || !r) {
    return <p className={turn.error ? 'text-red-600' : ''}>{cleanDisplayText(turn.content)}</p>;
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
  const customers = r.customers || [];
  const narrative = cleanDisplayText(r.explanation || r.narrative || '');
  const headlineClean = cleanDisplayText(r.headline || '');
  const understood = r.understanding?.normalized;
  const stepsDone = turn.liveSteps || r.understanding?.plan || [];

  return (
    <div className="llm-answer">
      <div className="llm-ai-head">
        <div className="llm-ai-badge">
          <Sparkles className="w-3 h-3" /> Answer
        </div>
        {hasExport && (
          <div className="llm-ai-tools">
            <button type="button" className="llm-btn-ghost sm" onClick={() => onOpenStudio(r)}>
              <PanelRightOpen className="w-3 h-3" /> Studio
            </button>
            <button type="button" className="llm-btn-ghost sm" onClick={() => onExport('csv')}>
              <Download className="w-3 h-3" /> CSV
            </button>
            <button type="button" className="llm-btn-ghost sm" onClick={() => onExport('json')}>
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        )}
      </div>

      {understood && (
        <p className="llm-understood">
          <span>Understood</span> {understood}
        </p>
      )}

      {!isChat && primary && (
        <div className="llm-hero-metric">
          <div className="llm-answer-label">{primary.label || primary.id || 'Answer'}</div>
          <div className="llm-answer-value">{formatMetricValue(primary)}</div>
        </div>
      )}

      {(isChat || !primary) && headlineClean && (
        <div className="llm-answer-value chat">{headlineClean}</div>
      )}

      {narrative && <p className="llm-narrative">{narrative}</p>}

      <div className="llm-chip-row">
        {r.period && <span className="llm-pill">Period · {r.period}</span>}
        {dims.radius_km != null && (
          <span className="llm-pill strong">Radius · {dims.radius_km} km</span>
        )}
        {r.freshness && <span className="llm-pill">Data · {r.freshness}</span>}
        {dims.min_orders != null && (
          <span className="llm-pill strong">Min orders · {dims.min_orders}</span>
        )}
        {dims.status && <span className="llm-pill">Status · {dims.status}</span>}
        {dims.product && <span className="llm-pill">Product · {dims.product}</span>}
        {customers.length > 0 && (
          <span className="llm-pill strong">{customers.length} customers</span>
        )}
      </div>

      {r.clarification?.candidates?.length > 0 && (
        <div className="llm-clarify">
          <p className="font-medium mb-2">{headlineClean || r.headline}</p>
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
        <details className="llm-fold" open={others.length <= 4}>
          <summary>Related metrics · {others.length}</summary>
          <div className="llm-metrics-grid">
            {others
              .filter((m) => !['min_orders', 'max_orders', 'sample_size'].includes(m.id))
              .map((m) => (
                <div key={m.id} className="llm-metric">
                  <div className="llm-metric-label">{m.label || m.id}</div>
                  <div className="llm-metric-value">{formatMetricValue(m)}</div>
                </div>
              ))}
          </div>
        </details>
      )}

      {r.products?.length > 0 && (
        <details className="llm-fold" open>
          <summary>
            <BarChart3 className="w-3.5 h-3.5" /> Top products · {r.products.length}
          </summary>
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
        </details>
      )}

      {customers.length > 0 && (
        <details className="llm-fold" open>
          <summary>
            <Users className="w-3.5 h-3.5" /> Customers · {customers.length}
          </summary>
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
                {customers.slice(0, 20).map((c, i) => (
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
          {customers.length > 20 && (
            <button type="button" className="llm-link-btn" onClick={() => onOpenStudio(r)}>
              Open full list in studio ({customers.length}) →
            </button>
          )}
        </details>
      )}

      {stepsDone.length > 0 && (
        <details className="llm-fold">
          <summary>Steps taken · {stepsDone.length}</summary>
          <ol className="llm-step-list">
            {stepsDone.map((s, i) => (
              <li key={i}>{typeof s === 'string' ? s : s.label}</li>
            ))}
          </ol>
        </details>
      )}

      {r.sources?.length > 0 && (
        <details className="llm-fold">
          <summary>Sources · {r.sources.length}</summary>
          <ul className="llm-source-list">
            {r.sources.map((s, i) => (
              <li key={i}>
                <span className="llm-source-kind">{s.kind || 'data'}</span>
                <strong>{s.name}</strong>
                {s.detail && <span className="llm-muted"> — {s.detail}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {dimEntries.length > 0 && (
        <details className="llm-fold">
          <summary>Dimensions · {dimEntries.length}</summary>
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
        </details>
      )}

      {r.calculationSteps?.length > 0 && (
        <details className="llm-fold">
          <summary>
            <Calculator className="w-3.5 h-3.5" /> How this was calculated
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
    font-size: 13.5px;
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
    margin-left: auto; max-width: min(92%, 520px);
    background: linear-gradient(145deg, var(--llm-blue), var(--llm-blue-deep));
    color: #fff; padding: 0.65rem 0.9rem; border-radius: 14px 14px 4px 14px;
    animation: llm-in 0.28s ease both; font-size: 0.84rem; line-height: 1.45;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
  }
  .llm-bubble-ai {
    max-width: min(100%, 720px); background: #fff; border: 1px solid var(--llm-line);
    padding: 0.95rem 1.05rem; border-radius: 14px 14px 14px 4px;
    animation: llm-in 0.32s ease both; box-shadow: var(--llm-shadow);
  }

  .llm-answer { display: flex; flex-direction: column; gap: 0.7rem; }
  .llm-understood {
    margin: 0; font-size: 0.72rem; color: var(--llm-muted); line-height: 1.45;
    padding: 0.4rem 0.55rem; background: var(--llm-bg); border-radius: 8px;
    border: 1px dashed var(--llm-line);
  }
  .llm-understood span {
    font-weight: 650; color: var(--llm-blue); text-transform: uppercase;
    letter-spacing: 0.05em; margin-right: 0.4rem; font-size: 0.64rem;
  }

  .llm-ai-head {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;
  }
  .llm-ai-badge {
    display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.62rem; font-weight: 600;
    letter-spacing: 0.05em; text-transform: uppercase; color: var(--llm-blue);
    background: var(--llm-blue-soft); border: 1px solid var(--llm-blue-mid);
    padding: 0.2rem 0.48rem; border-radius: 999px;
  }
  .llm-ai-tools { display: flex; flex-wrap: wrap; gap: 0.3rem; }

  .llm-hero-metric {
    padding: 0.7rem 0.85rem; border-radius: 12px;
    background: linear-gradient(135deg, var(--llm-blue-soft), #fff 60%);
    border: 1px solid var(--llm-blue-mid);
  }
  .llm-answer-label {
    font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--llm-muted); font-weight: 600;
  }
  .llm-answer-value {
    font-size: clamp(1.45rem, 3.2vw, 1.95rem); font-weight: 700; letter-spacing: -0.035em;
    line-height: 1.1; margin-top: 0.1rem; color: var(--llm-ink);
  }
  .llm-answer-value.chat {
    font-size: clamp(0.95rem, 2vw, 1.12rem); font-weight: 650; letter-spacing: -0.02em; line-height: 1.4;
  }
  .llm-narrative {
    margin: 0; color: #475569; font-size: 0.8rem; line-height: 1.55; white-space: pre-wrap;
  }
  .llm-narrative.soft { color: var(--llm-muted); font-size: 0.76rem; }
  .llm-meta { margin: 0; font-size: 0.68rem; color: var(--llm-muted); }

  .llm-fold {
    border: 1px solid var(--llm-line); border-radius: 10px; background: #fff;
    padding: 0.15rem 0.65rem 0.55rem; font-size: 0.78rem;
  }
  .llm-fold > summary {
    display: flex; align-items: center; gap: 0.35rem; cursor: pointer; list-style: none;
    font-weight: 600; font-size: 0.74rem; color: var(--llm-ink); padding: 0.45rem 0;
  }
  .llm-fold > summary::-webkit-details-marker { display: none; }
  .llm-fold > summary::before {
    content: "▸"; color: var(--llm-muted); font-size: 0.7rem; width: 0.7rem;
  }
  .llm-fold[open] > summary::before { content: "▾"; }
  .llm-fold ol, .llm-fold ul { margin: 0.25rem 0 0.35rem 1rem; color: var(--llm-muted); }
  .llm-fold .llm-metrics-grid { margin-top: 0.25rem; }
  .llm-step-list { font-size: 0.74rem; line-height: 1.5; }

  .llm-live {
    max-width: min(100%, 720px); background: #fff; border: 1px solid var(--llm-line);
    border-radius: 12px; padding: 0.75rem 0.9rem; box-shadow: var(--llm-shadow);
  }
  .llm-live-norm {
    display: flex; gap: 0.45rem; align-items: baseline; flex-wrap: wrap;
    font-size: 0.74rem; color: var(--llm-ink); margin-bottom: 0.55rem;
    padding-bottom: 0.5rem; border-bottom: 1px dashed var(--llm-line);
  }
  .llm-live-norm-k {
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--llm-blue);
  }
  .llm-live-steps {
    list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem;
  }
  .llm-live-steps li {
    display: flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; color: var(--llm-muted);
  }
  .llm-live-steps li.done { color: #64748b; }
  .llm-live-steps li.done svg { color: #22c55e; }
  .llm-live-steps li.active { color: var(--llm-ink); font-weight: 550; }
  .llm-live-steps li.active svg { color: var(--llm-blue); }

  .llm-metrics-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.4rem;
  }
  .llm-metric {
    border: 1px solid var(--llm-line); border-radius: 10px; padding: 0.5rem 0.6rem; background: var(--llm-bg);
  }
  .llm-metric-label { font-size: 0.62rem; color: var(--llm-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  .llm-metric-value { font-size: 0.95rem; font-weight: 700; margin-top: 0.1rem; }

  .llm-section-title {
    display: flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; font-weight: 650;
    margin-bottom: 0.4rem; color: var(--llm-ink);
  }
  .llm-section-count {
    margin-left: auto; font-size: 0.64rem; font-weight: 600; color: var(--llm-blue);
    background: var(--llm-blue-soft); padding: 0.12rem 0.4rem; border-radius: 999px;
  }

  .llm-table-wrap {
    border: 1px solid var(--llm-line); border-radius: 10px; overflow: auto; background: #fff;
    max-height: 100%;
  }
  .llm-table-wrap.inline { max-height: 260px; }
  .llm-table-wrap.compact .llm-table td,
  .llm-table-wrap.compact .llm-table th { padding: 0.25rem 0.4rem; font-size: 0.72rem; }
  .llm-table { width: 100%; border-collapse: collapse; font-size: 0.76rem; }
  .llm-table.sticky-head thead th { position: sticky; top: 0; background: var(--llm-bg); z-index: 1; }
  .llm-table th {
    text-align: left; font-weight: 650; color: var(--llm-muted); font-size: 0.62rem;
    text-transform: uppercase; letter-spacing: 0.04em; padding: 0.45rem 0.55rem;
    border-bottom: 1px solid var(--llm-line); white-space: nowrap;
  }
  .llm-table td {
    padding: 0.45rem 0.55rem; border-bottom: 1px solid var(--llm-line); vertical-align: middle;
  }
  .llm-table tr:last-child td { border-bottom: 0; }
  .llm-table tr:hover td { background: var(--llm-blue-soft); }
  .llm-table td.strong { font-weight: 600; }
  .llm-table td.mono, .llm-table .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.72rem;
  }
  .llm-table td.muted, .llm-table .muted { color: var(--llm-muted); }

  .llm-link-btn {
    margin-top: 0.4rem; border: 0; background: none; color: var(--llm-blue); font-weight: 600;
    font-size: 0.74rem; cursor: pointer; font-family: inherit; padding: 0;
  }
  .llm-link-btn:hover { text-decoration: underline; }

  .llm-calc { border-top: 1px solid var(--llm-line); padding-top: 0.55rem; font-size: 0.76rem; }
  .llm-calc summary {
    display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-weight: 600; list-style: none;
  }
  .llm-calc summary::-webkit-details-marker { display: none; }
  .llm-calc ol, .llm-calc ul { margin: 0.4rem 0 0 1.05rem; color: var(--llm-muted); }

  .llm-clarify {
    border: 1px solid var(--llm-blue-mid); background: var(--llm-blue-soft);
    border-radius: 10px; padding: 0.65rem; font-size: 0.8rem;
  }
  .llm-status {
    display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.4rem 0.75rem;
    border-radius: 999px; border: 1px solid var(--llm-line); background: #fff;
    font-size: 0.76rem; color: var(--llm-muted); box-shadow: var(--llm-shadow); width: fit-content;
  }
  .llm-error { display: flex; align-items: center; gap: 0.4rem; color: #b91c1c; font-size: 0.8rem; }

  .llm-composer {
    display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: end;
    padding-top: 0.55rem; background: linear-gradient(to top, var(--llm-bg) 65%, transparent);
  }
  .llm-send { width: 2.65rem; height: 2.65rem; padding: 0; border-radius: 12px; }

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

  /* ── Sidebar shell ────────────────────────────────────────────────── */
  .llm-shell { flex: 1; display: flex; min-height: 0; }
  .llm-sidebar {
    width: 168px; flex-shrink: 0; border-right: 1px solid var(--llm-line);
    background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
    display: flex; flex-direction: column; gap: 0.2rem; padding: 0.75rem 0.6rem;
  }
  .llm-nav-item {
    display: flex; align-items: center; gap: 0.6rem; width: 100%; text-align: left;
    padding: 0.55rem 0.7rem; border: 0; background: transparent; border-radius: 10px;
    color: var(--llm-muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit;
    transition: background 0.14s, color 0.14s;
  }
  .llm-nav-item:hover { background: var(--llm-bg); color: var(--llm-ink); }
  .llm-nav-item.on {
    background: var(--llm-blue-soft); color: var(--llm-blue-deep);
    box-shadow: inset 2px 0 0 var(--llm-blue);
  }
  .llm-nav-spacer { flex: 1; }
  .llm-nav-foot {
    display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; color: var(--llm-muted);
    padding: 0.5rem 0.7rem;
  }
  .llm-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--llm-line-strong); display: inline-block; }
  .llm-dot.on { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.18); }
  .llm-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
  .llm-main > * { min-height: 0; }

  /* ── Mode switch + build composer ─────────────────────────────────── */
  .llm-mode-switch {
    display: inline-flex; gap: 0.25rem; margin: 0 auto 0.5rem; padding: 0.2rem;
    border: 1px solid var(--llm-line); border-radius: 999px; background: var(--llm-bg);
  }
  .llm-mode-switch button {
    display: inline-flex; align-items: center; gap: 0.35rem; border: 0; background: transparent;
    color: var(--llm-muted); font-size: 0.74rem; font-weight: 600; padding: 0.35rem 0.7rem;
    border-radius: 999px; cursor: pointer; font-family: inherit;
  }
  .llm-mode-switch button.on { background: #fff; color: var(--llm-blue-deep); box-shadow: var(--llm-shadow); }
  .llm-composer.build { box-shadow: 0 0 0 2px rgba(124,58,237,0.25); border-radius: 16px; }

  /* ── Component builder card (in chat) ─────────────────────────────── */
  .llm-builder-card {
    border: 1px solid var(--llm-line); border-radius: 14px; background: #fff;
    box-shadow: var(--llm-shadow); overflow: hidden;
  }
  .llm-builder-head {
    display: flex; align-items: center; gap: 0.55rem; padding: 0.65rem 0.8rem;
    border-bottom: 1px solid var(--llm-line);
    background: linear-gradient(135deg, rgba(124,58,237,0.06), #fff 70%);
  }
  .llm-builder-viz {
    display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.62rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed;
    background: rgba(124,58,237,0.1); border-radius: 999px; padding: 0.18rem 0.5rem;
  }
  .llm-builder-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .llm-builder-title strong { font-size: 0.88rem; letter-spacing: -0.01em; }
  .llm-builder-title span { font-size: 0.7rem; color: var(--llm-muted); }
  .llm-builder-preview { padding: 0.85rem; display: grid; place-items: center; min-height: 130px; }
  .llm-builder-note { margin: 0 0.8rem 0.6rem; font-size: 0.74rem; color: #475569; line-height: 1.45; }

  .llm-builder-assume, .llm-builder-q { padding: 0 0.8rem 0.6rem; }
  .llm-builder-assume ul { list-style: none; margin: 0.35rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
  .llm-builder-assume li { display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.73rem; color: #334155; }
  .llm-builder-assume li svg { color: #059669; margin-top: 0.12rem; flex-shrink: 0; }
  .llm-builder-qrow { display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.5rem; }
  .llm-builder-qrow label { font-size: 0.76rem; font-weight: 600; color: var(--llm-ink); }
  .llm-builder-why { font-size: 0.66rem; color: var(--llm-muted); }
  .llm-builder-q .llm-input { padding: 0.5rem 0.7rem; font-size: 0.8rem; }
  .llm-builder-actions { display: flex; gap: 0.5rem; justify-content: flex-end; padding: 0.6rem 0.8rem 0.8rem; }
  .llm-builder-card .llm-textarea { margin: 0 0.8rem; width: calc(100% - 1.6rem); font-size: 0.8rem; }

  /* ── Charts ───────────────────────────────────────────────────────── */
  .llm-chart-svg { width: 100%; height: 130px; display: block; }
  .llm-chart-xlabel { font-size: 8px; fill: var(--llm-muted); font-family: inherit; }
  .llm-chart-loading, .llm-chart-error {
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    min-height: 120px; color: var(--llm-muted); font-size: 0.78rem; text-align: center; padding: 0.5rem;
  }
  .llm-chart-error { color: #b91c1c; }
  .llm-metric-big { text-align: center; }
  .llm-metric-big-value {
    font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 750; letter-spacing: -0.04em;
    line-height: 1; color: var(--llm-ink); font-variant-numeric: tabular-nums;
  }
  .llm-metric-big-unit { font-size: 0.72rem; color: var(--llm-muted); margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.06em; }

  .llm-pie-wrap { display: flex; align-items: center; gap: 0.9rem; width: 100%; }
  .llm-pie-svg { width: 130px; height: 130px; flex-shrink: 0; }
  .llm-pie-legend { display: flex; flex-direction: column; gap: 0.28rem; min-width: 0; flex: 1; }
  .llm-pie-legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; }
  .llm-pie-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
  .llm-pie-legend-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--llm-ink); }
  .llm-pie-legend-pct { color: var(--llm-muted); font-variant-numeric: tabular-nums; font-weight: 600; }

  .llm-dtable-wrap { width: 100%; overflow: auto; max-height: 260px; }
  .llm-dtable { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
  .llm-dtable th {
    text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--llm-line);
    color: var(--llm-muted); font-weight: 600; text-transform: uppercase; font-size: 0.62rem; letter-spacing: 0.04em;
    position: sticky; top: 0; background: #fff;
  }
  .llm-dtable td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--llm-line); white-space: nowrap; }

  /* ── Dashboard page ───────────────────────────────────────────────── */
  .llm-dashboard { flex: 1; overflow-y: auto; padding: 1.1rem 1.25rem 2rem; }
  .llm-dash-head {
    display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    margin-bottom: 1.1rem;
  }
  .llm-dash-title { font-size: 1.15rem; font-weight: 750; letter-spacing: -0.03em; margin: 0; }
  .llm-dash-sub { font-size: 0.74rem; color: var(--llm-muted); margin: 0.15rem 0 0; }
  .llm-dash-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.9rem;
  }
  .llm-dash-empty {
    text-align: center; max-width: 480px; margin: 3rem auto; padding: 2rem 1.5rem;
    border: 1px dashed var(--llm-line-strong); border-radius: 18px; background: rgba(255,255,255,0.6);
  }
  .llm-dash-empty-icon {
    width: 3.4rem; height: 3.4rem; border-radius: 16px; display: grid; place-items: center; margin: 0 auto 1rem;
    color: var(--llm-blue); background: var(--llm-blue-soft); border: 1px solid var(--llm-blue-mid);
  }
  .llm-dash-empty h3 { font-size: 1.05rem; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 0.4rem; }
  .llm-dash-empty p { font-size: 0.82rem; color: var(--llm-muted); line-height: 1.55; margin: 0 0 1.1rem; }

  .llm-tile {
    border: 1px solid var(--llm-line); border-radius: 14px; background: #fff;
    box-shadow: var(--llm-shadow); display: flex; flex-direction: column; overflow: hidden;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .llm-tile:hover { box-shadow: var(--llm-shadow-lg); transform: translateY(-1px); }
  .llm-tile-head {
    display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--llm-line);
  }
  .llm-tile-viz { display: inline-flex; color: var(--llm-blue); }
  .llm-tile-title { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .llm-tile-title strong { font-size: 0.82rem; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .llm-tile-title span { font-size: 0.66rem; color: var(--llm-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .llm-tile-tools { display: flex; gap: 0.1rem; }
  .llm-tile-tools .llm-icon-btn.danger:hover { color: #dc2626; }
  .llm-tile-body { padding: 0.85rem; display: grid; place-items: center; min-height: 148px; flex: 1; }
  .llm-tile-metric .llm-tile-body { min-height: 120px; }
  .llm-tile-foot {
    display: flex; align-items: center; gap: 0.35rem; font-size: 0.64rem; color: var(--llm-muted);
    padding: 0.4rem 0.75rem; border-top: 1px solid var(--llm-line);
  }
  .llm-tile-edit { padding: 0.6rem 0.75rem; border-top: 1px solid var(--llm-line); background: var(--llm-bg); }
  .llm-tile-edit .llm-textarea { font-size: 0.78rem; }

  /* ── Cluster analysis ─────────────────────────────────────────────── */
  .llm-cluster-topline {
    display: flex; flex-wrap: wrap; gap: 1.25rem; margin: 0.85rem 0 0.35rem;
    font-size: 0.78rem; color: var(--llm-muted);
  }
  .llm-cluster-topline strong { color: var(--llm-ink); font-size: 0.95rem; font-variant-numeric: tabular-nums; }
  .llm-cluster-list { display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.65rem; }

  .llm-cluster-card {
    border: 1px solid var(--llm-line); border-radius: 12px; background: #fff; overflow: hidden;
  }
  .llm-cluster-head {
    display: flex; align-items: center; gap: 0.55rem; width: 100%; text-align: left;
    padding: 0.7rem 0.85rem; background: linear-gradient(135deg, var(--llm-blue-soft), #fff 70%);
    border: 0; cursor: pointer; font-family: inherit;
  }
  .llm-cluster-title { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .llm-cluster-name { font-weight: 700; font-size: 0.9rem; color: var(--llm-ink); }
  .llm-cluster-sub { font-size: 0.68rem; color: var(--llm-muted); }
  .llm-cluster-status {
    font-size: 0.62rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.18rem 0.5rem; border-radius: 999px;
  }
  .llm-cluster-status.ok { color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; }
  .llm-cluster-status.err { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; }
  .llm-cluster-body { padding: 0.75rem 0.85rem; border-top: 1px solid var(--llm-line); }

  .llm-cluster-stats { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 0.7rem; }
  .llm-cstat {
    flex: 1; min-width: 92px; border: 1px solid var(--llm-line); border-radius: 10px;
    padding: 0.5rem 0.65rem; background: var(--llm-bg);
  }
  .llm-cstat-v { display: block; font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .llm-cstat-l { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--llm-muted); }

  .llm-rel-box { margin-bottom: 0.7rem; }
  .llm-rel-row {
    display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; padding: 0.15rem 0;
  }
  .llm-rel-row code {
    background: var(--llm-bg); border: 1px solid var(--llm-line); border-radius: 6px;
    padding: 0.1rem 0.35rem; font-size: 0.68rem;
  }

  .llm-coll-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .llm-coll-card { border: 1px solid var(--llm-line); border-radius: 10px; overflow: hidden; background: #fff; }
  .llm-coll-head {
    display: flex; align-items: center; gap: 0.5rem; width: 100%; text-align: left;
    padding: 0.55rem 0.7rem; border: 0; background: var(--llm-bg); cursor: pointer; font-family: inherit;
  }
  .llm-coll-chevron { transition: transform 0.18s ease; color: var(--llm-muted); }
  .llm-coll-chevron.open { transform: rotate(180deg); }
  .llm-coll-name { font-weight: 650; font-size: 0.82rem; color: var(--llm-ink); }
  .llm-coll-role {
    font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.42rem; border-radius: 999px;
  }
  .llm-coll-meta { margin-left: auto; font-size: 0.68rem; color: var(--llm-muted); font-variant-numeric: tabular-nums; }
  .llm-coll-body { padding: 0.7rem; border-top: 1px solid var(--llm-line); }
  .llm-coll-reason {
    display: flex; align-items: flex-start; gap: 0.4rem; font-size: 0.76rem; color: #475569;
    margin: 0 0 0.6rem; line-height: 1.45;
  }

  .llm-learn-list { list-style: none; margin: 0 0 0.7rem; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; }
  .llm-learn-list li {
    display: flex; align-items: flex-start; gap: 0.4rem; font-size: 0.73rem; color: #334155; line-height: 1.45;
  }
  .llm-learn-list li svg { color: #059669; margin-top: 0.15rem; }

  .llm-field-table {
    border: 1px solid var(--llm-line); border-radius: 8px; overflow: hidden; font-size: 0.72rem;
  }
  .llm-field-row {
    display: grid; grid-template-columns: minmax(90px, 1.4fr) auto 70px 74px minmax(120px, 2fr);
    gap: 0.5rem; align-items: center; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--llm-line);
  }
  .llm-field-row:last-child { border-bottom: 0; }
  .llm-field-head {
    background: var(--llm-bg); font-weight: 600; font-size: 0.62rem; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--llm-muted);
  }
  .llm-field-path {
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-weight: 600; color: var(--llm-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.7rem;
  }
  .llm-field-type { color: var(--llm-muted); font-size: 0.68rem; }
  .llm-field-fill { display: flex; align-items: center; gap: 0.35rem; font-size: 0.66rem; color: var(--llm-muted); font-variant-numeric: tabular-nums; }
  .llm-fill-bar { flex: 1; height: 5px; border-radius: 3px; background: var(--llm-line); overflow: hidden; min-width: 24px; }
  .llm-fill-bar > span { display: block; height: 100%; background: var(--llm-blue); border-radius: 3px; }
  .llm-field-samples {
    color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.68rem;
  }
  .llm-distinct { color: var(--llm-muted); font-style: normal; opacity: 0.7; }

  .llm-role-badge {
    display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.6rem; font-weight: 600;
    padding: 0.12rem 0.4rem; border-radius: 999px; border: 1px solid transparent; white-space: nowrap;
  }

  .llm-sample-doc { margin-top: 0.6rem; }
  .llm-sample-toggle {
    display: inline-flex; align-items: center; gap: 0.35rem; border: 0; background: transparent;
    color: var(--llm-blue); font-weight: 600; font-size: 0.72rem; cursor: pointer; font-family: inherit; padding: 0;
  }
  .llm-sample-pre { max-height: 22rem; margin-top: 0.4rem; }
  .llm-error-inline { display: flex; align-items: center; gap: 0.4rem; color: #dc2626; font-size: 0.8rem; }

  @media (max-width: 620px) {
    .llm-field-row { grid-template-columns: 1fr auto; }
    .llm-field-row > *:nth-child(3), .llm-field-row > *:nth-child(4) { display: none; }
    .llm-field-samples { grid-column: 1 / -1; white-space: normal; }
    .llm-field-head { display: none; }
  }

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
