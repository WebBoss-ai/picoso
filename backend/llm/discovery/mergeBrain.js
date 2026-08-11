/**
 * Incremental brain learning — merge new training into prior knowledge
 * without dropping entities, metrics, hints, parameters, or corpus records.
 */

const MAX_CORPUS_RECORDS = 8000;
const MAX_HINTS = 200;
const MAX_SESSIONS = 80;

function plain(item) {
  if (!item) return item;
  return item.toObject?.() || item;
}

function keyEntity(e) {
  const o = plain(e) || {};
  return String(o.id || o.collectionName || o.name || '').toLowerCase();
}

function keyMetric(m) {
  const o = plain(m) || {};
  return String(o.id || o.name || '').toLowerCase();
}

function keyDim(d) {
  const o = plain(d) || {};
  return String(o.id || o.name || o.field || '').toLowerCase();
}

function keyParam(p) {
  const o = plain(p) || {};
  return String(o.name || o.path || '').toLowerCase();
}

function keyGloss(g) {
  const o = plain(g) || {};
  return String(o.term || '').toLowerCase();
}

/** Prefer earlier (established) values; fill nulls from newer. */
function mergeRow(oldRow, newRow) {
  const a = plain(oldRow) || {};
  const b = plain(newRow) || {};
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined || v === null || v === '') continue;
    if (out[k] === undefined || out[k] === null || out[k] === '') {
      out[k] = v;
    } else if (k === 'description' && typeof v === 'string' && typeof out[k] === 'string') {
      if (!out[k].includes(v.slice(0, 40))) {
        out[k] = `${out[k]} · ${v}`.slice(0, 1200);
      }
    } else if (k === 'sampleValues' && Array.isArray(v)) {
      const set = new Set([...(out[k] || []), ...v].map(String));
      out[k] = [...set].slice(0, 12);
    } else if (k === 'confirmed') {
      out[k] = Boolean(out[k] || v);
    }
  }
  return out;
}

function mergeByKey(oldList = [], newList = [], keyFn) {
  const map = new Map();
  for (const item of oldList) {
    const k = keyFn(item);
    if (!k) continue;
    map.set(k, plain(item));
  }
  for (const item of newList) {
    const k = keyFn(item);
    if (!k) continue;
    if (map.has(k)) map.set(k, mergeRow(map.get(k), item));
    else map.set(k, plain(item));
  }
  return [...map.values()];
}

export function mergeEntities(oldE = [], newE = []) {
  return mergeByKey(oldE, newE, keyEntity);
}

export function mergeMetrics(oldM = [], newM = []) {
  return mergeByKey(oldM, newM, keyMetric);
}

export function mergeDimensions(oldD = [], newD = []) {
  return mergeByKey(oldD, newD, keyDim);
}

export function mergeParameters(oldP = [], newP = []) {
  return mergeByKey(oldP, newP, keyParam);
}

export function mergeGlossary(oldG = [], newG = []) {
  return mergeByKey(oldG, newG, keyGloss);
}

export function mergeRelationships(oldR = [], newR = []) {
  const seen = new Set();
  const out = [];
  for (const r of [...(oldR || []), ...(newR || [])]) {
    const o = plain(r) || {};
    const k = `${o.fromEntity}|${o.toEntity}|${o.fromField}|${o.toField}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  return out;
}

export function mergeHints(oldH = [], newH = []) {
  const out = [...(oldH || []).map(plain), ...(newH || []).map(plain)];
  return out.slice(-MAX_HINTS);
}

export function mergeTextBrain(oldText = '', newText = '', sessionLabel = '') {
  const a = String(oldText || '').trim();
  const b = String(newText || '').trim();
  if (!a) return b;
  if (!b) return a;
  if (a.includes(b.slice(0, Math.min(80, b.length))) && b.length < 400) return a;
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const header = sessionLabel
    ? `## Training session · ${sessionLabel} · ${stamp}`
    : `## Training session · ${stamp}`;
  return `${a}\n\n---\n${header}\n\n${b}`;
}

export function mergeJsonSchema(oldS, newS) {
  if (!oldS) return newS || null;
  if (!newS) return oldS;
  const a = typeof oldS === 'object' ? oldS : {};
  const b = typeof newS === 'object' ? newS : {};
  const props = {
    ...(a.properties || {}),
    ...(b.properties || {}),
  };
  return {
    ...a,
    ...b,
    properties: props,
    required: [...new Set([...(a.required || []), ...(b.required || [])])],
  };
}

export function mergeLiveFieldMap(oldM, newM) {
  if (!oldM) return newM || null;
  if (!newM) return oldM;
  const o = plain(oldM) || {};
  const n = plain(newM) || {};
  const concepts = { ...(o.concepts || {}), ...(n.concepts || {}) };
  const collections = {
    ...(o.collections || {}),
    ...(n.collections || {}),
  };
  return {
    ...o,
    ...n,
    concepts,
    collections,
    bindings: { ...(o.bindings || {}), ...(n.bindings || {}) },
  };
}

export function mergeQueryPlan(oldP, newP) {
  if (!oldP) return newP || null;
  if (!newP) return oldP;
  return {
    ...plain(oldP),
    ...plain(newP),
    sources: [
      ...new Set([
        ...((plain(oldP).sources || [])),
        ...((plain(newP).sources || [])),
      ]),
    ],
  };
}

export function mergeCorpusRecords(oldRecords = [], newRecords = []) {
  const all = [...(oldRecords || []), ...(newRecords || [])];
  if (all.length <= MAX_CORPUS_RECORDS) return all;
  return all.slice(all.length - MAX_CORPUS_RECORDS);
}

export function mergeBusinessContext(oldC = '', newC = '') {
  const a = String(oldC || '').trim();
  const b = String(newC || '').trim();
  if (!a) return b;
  if (!b || a.includes(b)) return a;
  return `${a}\n\n${b}`.slice(0, 8000);
}

export function appendLearningSession(priorMeta = {}, session = {}) {
  const meta = plain(priorMeta) || {};
  const sessions = Array.isArray(meta.learningSessions)
    ? [...meta.learningSessions]
    : [];
  sessions.push({
    at: new Date().toISOString(),
    source: session.source || 'train',
    label: session.label || '',
    recordCount: session.recordCount || 0,
    collections: session.collections || [],
    versionAfter: session.versionAfter || null,
    note: session.note || '',
  });
  return {
    ...meta,
    ...session.patch,
    learningSessions: sessions.slice(-MAX_SESSIONS),
    lastTrainedAt: new Date().toISOString(),
    cumulativeRecords: session.cumulativeRecords ?? meta.cumulativeRecords,
  };
}

/**
 * Merge prior model fields into a newly drafted brain payload.
 */
export function mergePriorBrain(baseModel, draft = {}) {
  if (!baseModel) return draft;
  const base = plain(baseModel);

  return {
    ...draft,
    entities: mergeEntities(base.entities, draft.entities),
    metrics: mergeMetrics(base.metrics, draft.metrics),
    dimensions: mergeDimensions(base.dimensions, draft.dimensions),
    relationships: mergeRelationships(base.relationships, draft.relationships),
    glossary: mergeGlossary(base.glossary, draft.glossary),
    parameters: mergeParameters(base.parameters, draft.parameters),
    trainingHints: mergeHints(base.trainingHints, draft.trainingHints),
    textBrain: mergeTextBrain(
      base.textBrain,
      draft.textBrain,
      draft.sessionLabel || draft.name
    ),
    jsonSchema: mergeJsonSchema(base.jsonSchema, draft.jsonSchema),
    liveFieldMap: mergeLiveFieldMap(base.liveFieldMap, draft.liveFieldMap),
    queryPlan: mergeQueryPlan(base.queryPlan, draft.queryPlan),
    businessContext: mergeBusinessContext(
      base.businessContext,
      draft.businessContext
    ),
    domain: draft.domain || base.domain || '',
    source:
      base.source === 'hybrid' || draft.source === 'hybrid'
        ? 'hybrid'
        : draft.source || base.source,
  };
}
