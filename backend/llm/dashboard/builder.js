/**
 * dashboard/builder.js
 * ──────────────────────────────────────────────────────────────────────────
 * AI-driven, fully-generic dashboard COMPONENT builder.
 *
 * The model receives the live, discovered schema of every connected cluster and
 * turns a natural-language request ("show users who joined today", "daily
 * profit") into a strict JSON ComponentSpec:
 *
 *   - viz            metric | line | bar | area | pie | table
 *   - connectionId   which cluster to run against
 *   - collection     base collection
 *   - pipeline       READ-ONLY MongoDB aggregation (uses $$NOW / $dateTrunc for
 *                    real-time, always-accurate relative periods — never a
 *                    hardcoded date)
 *   - field mappings labelField / valueField / seriesField for rendering
 *   - assumptions    plain-English assumptions the model made (transparency)
 *   - clarifyingQuestions  2–4 questions (with example answers) so the operator
 *                    can perfect the component in ONE pass
 *
 * Refinement re-runs the same builder with the prior spec + the operator's
 * answers/corrections, so the component self-corrects across turns
 * ("you're showing a month, I want daily" → the model rewrites $dateTrunc).
 *
 * Zero business logic is hardcoded here — everything is derived from schema.
 */

import { createLlmProvider } from '../provider/cohere.js';
import { getAllClustersSchema, executePipeline } from '../query/semanticExecutor.js';

const VALID_VIZ = new Set(['metric', 'line', 'bar', 'area', 'pie', 'table']);
const VALID_FORMAT = new Set(['number', 'currency', 'percent', 'compact', 'duration']);

/** Compact, token-efficient description of every cluster + collection + fields. */
function renderSchemaContext(clusters) {
  if (!clusters?.length) {
    return 'No clusters connected yet. Ask the operator to connect a MongoDB cluster first.';
  }
  const lines = [];
  for (const c of clusters) {
    lines.push(`CLUSTER "${c.label}" (connectionId: ${c.connectionId}, db: ${c.dbName || 'n/a'})`);
    for (const col of c.collections || []) {
      const fields = (col.fields || []).slice(0, 40).join(', ');
      lines.push(`  • ${col.collection} (~${col.count} docs): ${fields}`);
    }
    if (!(c.collections || []).length) lines.push('  (no collections with data)');
  }
  return lines.join('\n');
}

/** Robustly pull the first balanced JSON object out of a model response. */
function extractJson(text = '') {
  if (!text) return null;
  // Strip code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function buildSystemPrompt(clusters, ctx) {
  const tz = ctx.timezone || 'UTC';
  const currency = ctx.currency || 'USD';
  return `You are a dashboard COMPONENT ENGINE for a live analytics platform.
You convert a business request into ONE JSON component spec that renders from LIVE MongoDB data.

TIMEZONE: ${tz}. CURRENCY: ${currency}.

You can ONLY read data. Produce a read-only aggregation pipeline (no $out, $merge, $function).

# LIVE SCHEMA (the ONLY collections/fields that exist — never invent names)
${renderSchemaContext(clusters)}

# OUTPUT — respond with ONE JSON object and NOTHING else:
{
  "title": "short title",
  "subtitle": "one-line description of what this shows",
  "viz": "metric | line | bar | area | pie | table",
  "connectionId": "<connectionId of the cluster that owns the collection>",
  "collection": "<exact collection name>",
  "pipeline": [ ...MongoDB aggregation stages... ],
  "labelField": "field used for x-axis / pie label / row key (charts & table)",
  "valueField": "numeric field the pipeline outputs for the value/y-axis/metric",
  "seriesField": "optional field to split multiple series (else empty string)",
  "secondaryValueField": "optional 2nd numeric series (else empty string)",
  "format": "number | currency | percent | compact | duration",
  "unit": "optional suffix like 'orders' or '%'",
  "refreshSeconds": 0,
  "computedNote": "plain-English explanation of exactly what is computed",
  "assumptions": ["each decision you made that the operator might want to change"],
  "clarifyingQuestions": [
    { "id": "q1", "question": "...", "why": "why it changes the result", "exampleAnswer": "a concrete example answer" }
  ]
}

# RULES
1. Use ONLY collections and fields from the LIVE SCHEMA above. Pick the connectionId of the cluster that owns the collection.
2. For relative time ("today", "this week", "last month", "daily", "per day"), NEVER hardcode dates. Use server-evaluated expressions:
   - now: "$$NOW"
   - start of today: { "$dateTrunc": { "date": "$$NOW", "unit": "day", "timezone": "${tz}" } }
   - last 30 days: { "$dateSubtract": { "startDate": "$$NOW", "unit": "day", "amount": 30 } }
   - group by day: { "$dateTrunc": { "date": "$<dateField>", "unit": "day", "timezone": "${tz}" } }
   Always pass "timezone": "${tz}" to $dateTrunc so buckets align to the business day.
   To FILTER by a computed date you MUST use $expr inside $match, e.g. "joined today":
     { "$match": { "$expr": { "$gte": ["$createdAt", { "$dateTrunc": { "date": "$$NOW", "unit": "day", "timezone": "${tz}" } }] } } }
   The date field may be a Date or an ISO string — if it can be a string, wrap it: { "$toDate": "$<field>" }.

# EXAMPLE — "users who joined today" (metric)
{ "viz":"metric","collection":"users","valueField":"value",
  "pipeline":[
    { "$match": { "$expr": { "$gte": [ { "$toDate": "$createdAt" }, { "$dateTrunc": { "date":"$$NOW","unit":"day","timezone":"${tz}" } } ] } } },
    { "$count": "value" }
  ] }

# EXAMPLE — "signups per day, last 14 days" (line)
{ "viz":"line","collection":"users","labelField":"label","valueField":"value",
  "pipeline":[
    { "$match": { "$expr": { "$gte": [ { "$toDate": "$createdAt" }, { "$dateSubtract": { "startDate":"$$NOW","unit":"day","amount":14 } } ] } } },
    { "$group": { "_id": { "$dateTrunc": { "date": { "$toDate":"$createdAt" }, "unit":"day", "timezone":"${tz}" } }, "value": { "$sum": 1 } } },
    { "$project": { "_id":0, "label":"$_id", "value":1 } },
    { "$sort": { "label": 1 } }
  ] }
3. metric → pipeline should end producing ONE row with a numeric "value" field (use $group/$count). Set valueField to that field name.
4. line/area/bar → group by a time bucket or category into { "label": ..., "value": ... } rows, sorted. Set labelField/valueField accordingly. For time series ALWAYS $sort by the bucket ascending.
5. pie → categories with a numeric value each.
6. table → return the raw useful columns; set labelField to the primary column.
7. Prefer $project at the end to output clean field names ("label", "value") so the renderer is predictable.
8. Include 2–4 clarifyingQuestions that would materially change the number (date window, filters like status/paid, dedup logic, cost assumptions, which cluster). Each MUST have a concrete exampleAnswer.
9. List every meaningful assumption in "assumptions".
10. Keep pipelines under 15 stages.

Return ONLY the JSON object.`;
}

function buildUserContent({ prompt, priorSpec, userAnswers, mode }) {
  const parts = [];
  if (mode === 'refine' && priorSpec) {
    parts.push('REFINE the existing component. Keep what works, change only what the correction requires.');
    parts.push('EXISTING SPEC:');
    parts.push(JSON.stringify(sanitizeForPrompt(priorSpec), null, 2));
    if (userAnswers && Object.keys(userAnswers).length) {
      parts.push('OPERATOR ANSWERS TO YOUR QUESTIONS:');
      parts.push(JSON.stringify(userAnswers, null, 2));
    }
    if (prompt && prompt.trim()) {
      parts.push('OPERATOR CORRECTION / NEW INSTRUCTION:');
      parts.push(prompt.trim());
    }
    parts.push('Return the FULL updated JSON spec (with fresh clarifyingQuestions if useful).');
  } else {
    parts.push('CREATE a new dashboard component for this request:');
    parts.push(prompt.trim());
    if (userAnswers && Object.keys(userAnswers).length) {
      parts.push('OPERATOR PROVIDED THESE DETAILS UP FRONT:');
      parts.push(JSON.stringify(userAnswers, null, 2));
    }
  }
  return parts.join('\n');
}

function sanitizeForPrompt(spec) {
  return {
    title: spec.title,
    subtitle: spec.subtitle,
    viz: spec.viz,
    connectionId: spec.connectionId,
    collection: spec.collection,
    pipeline: spec.pipeline,
    labelField: spec.labelField,
    valueField: spec.valueField,
    seriesField: spec.seriesField,
    secondaryValueField: spec.secondaryValueField,
    format: spec.format,
    unit: spec.unit,
    computedNote: spec.computedNote,
    assumptions: spec.assumptions,
  };
}

function genId() {
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalize + defensively validate a model-produced spec. */
function normalizeSpec(raw, clusters, priorSpec) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Model did not return a valid component spec.');
  }
  const viz = VALID_VIZ.has(raw.viz) ? raw.viz : 'metric';
  const format = VALID_FORMAT.has(raw.format) ? raw.format : 'number';

  // Resolve connectionId: trust model, else infer from the collection, else self
  let connectionId = raw.connectionId || null;
  const collection = String(raw.collection || '').trim();
  if (clusters?.length) {
    const owns = clusters.find((c) =>
      (c.collections || []).some((col) => col.collection === collection)
    );
    if (owns) connectionId = owns.connectionId;
    else if (!connectionId) connectionId = clusters[0].connectionId;
  }

  const questions = Array.isArray(raw.clarifyingQuestions)
    ? raw.clarifyingQuestions
        .filter((q) => q && (q.question || typeof q === 'string'))
        .slice(0, 4)
        .map((q, i) =>
          typeof q === 'string'
            ? { id: `q${i + 1}`, question: q, why: '', exampleAnswer: '' }
            : {
                id: q.id || `q${i + 1}`,
                question: String(q.question || ''),
                why: String(q.why || ''),
                exampleAnswer: String(q.exampleAnswer || q.example || ''),
              }
        )
    : [];

  return {
    id: priorSpec?.id || genId(),
    title: String(raw.title || 'Untitled component').slice(0, 120),
    subtitle: String(raw.subtitle || '').slice(0, 240),
    viz,
    connectionId,
    collection,
    pipeline: Array.isArray(raw.pipeline) ? raw.pipeline : [],
    labelField: String(raw.labelField || 'label'),
    valueField: String(raw.valueField || 'value'),
    seriesField: String(raw.seriesField || ''),
    secondaryValueField: String(raw.secondaryValueField || ''),
    format,
    unit: String(raw.unit || ''),
    accent: raw.accent || priorSpec?.accent || '',
    refreshSeconds: Math.min(Math.max(Number(raw.refreshSeconds) || 0, 0), 3600),
    limit: Math.min(Math.max(Number(raw.limit) || 200, 1), 500),
    computedNote: String(raw.computedNote || '').slice(0, 600),
    assumptions: Array.isArray(raw.assumptions)
      ? raw.assumptions.map((a) => String(a)).slice(0, 12)
      : [],
    clarifyingQuestions: questions,
  };
}

/**
 * Build (or refine) a component spec from a natural-language request.
 * @param {string} workspaceId
 * @param {{ prompt:string, priorSpec?:object, userAnswers?:object, mode?:'create'|'refine',
 *           timezone?:string, currency?:string }} opts
 */
export async function buildComponentSpec(workspaceId, opts = {}) {
  const { prompt = '', priorSpec = null, userAnswers = null, mode = 'create' } = opts;
  if (mode === 'create' && (!prompt || !prompt.trim())) {
    throw new Error('A prompt describing the component is required.');
  }
  const clusters = await getAllClustersSchema(workspaceId);
  const provider = createLlmProvider();

  const messages = [
    { role: 'system', content: buildSystemPrompt(clusters, opts) },
    { role: 'user', content: buildUserContent({ prompt, priorSpec, userAnswers, mode }) },
  ];

  const res = await provider.chat({ messages, temperature: 0.15 });
  const parsed = extractJson(res.text);
  if (!parsed) {
    throw new Error('Could not parse the component from the model response. Try rephrasing.');
  }
  const spec = normalizeSpec(parsed, clusters, priorSpec);

  // Track the prompt lineage for transparency / audit
  spec.promptHistory = [
    ...(priorSpec?.promptHistory || []),
    {
      at: new Date().toISOString(),
      mode,
      prompt: prompt || '(answers only)',
      answers: userAnswers || null,
    },
  ].slice(-20);

  return spec;
}

/**
 * Execute a component spec against live data and shape it for the renderer.
 * Returns { ok, viz, value, rows, series, error, meta }.
 */
export async function runComponentSpec(workspaceId, spec = {}) {
  if (!spec.collection || !Array.isArray(spec.pipeline)) {
    return { ok: false, error: 'Component has no collection/pipeline yet.' };
  }
  const out = await executePipeline(workspaceId, {
    collection: spec.collection,
    pipeline: spec.pipeline,
    connectionId: spec.connectionId || null,
    limit: spec.limit || 200,
  });

  if (out.type === 'error') {
    return { ok: false, error: out.error };
  }

  const rows = out.rows || [];
  const valueField = spec.valueField || 'value';
  const labelField = spec.labelField || 'label';

  if (spec.viz === 'metric') {
    let value = out.primaryValue;
    if (value == null && rows.length) {
      const r = rows[0];
      value =
        typeof r[valueField] === 'number'
          ? r[valueField]
          : typeof r.value === 'number'
          ? r.value
          : typeof r.count === 'number'
          ? r.count
          : null;
    }
    return {
      ok: true,
      viz: 'metric',
      value,
      rows,
      meta: { rowCount: out.rowCount, freshness: 'live', ranAt: new Date().toISOString() },
    };
  }

  // charts / table → normalized points
  const points = rows.map((r) => {
    const label =
      r[labelField] != null
        ? r[labelField]
        : r.label != null
        ? r.label
        : r._id != null
        ? r._id
        : '';
    const value =
      typeof r[valueField] === 'number'
        ? r[valueField]
        : typeof r.value === 'number'
        ? r.value
        : typeof r.count === 'number'
        ? r.count
        : Number(r[valueField]) || 0;
    const point = { label: formatLabel(label), value };
    if (spec.secondaryValueField && typeof r[spec.secondaryValueField] === 'number') {
      point.value2 = r[spec.secondaryValueField];
    }
    if (spec.seriesField && r[spec.seriesField] != null) {
      point.series = String(r[spec.seriesField]);
    }
    return point;
  });

  return {
    ok: true,
    viz: spec.viz,
    rows,
    points,
    meta: { rowCount: out.rowCount, freshness: 'live', ranAt: new Date().toISOString() },
  };
}

function formatLabel(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
