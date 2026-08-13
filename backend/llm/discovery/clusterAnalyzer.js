/**
 * clusterAnalyzer.js
 * ──────────────────────────────────────────────────────────────────────────
 * Fully generic, business-agnostic MongoDB cluster analysis engine.
 *
 * Given any connected MongoDB cluster, this module:
 *   1. Enumerates every non-system collection.
 *   2. Deeply profiles each field across a statistical sample:
 *        - type distribution, dominant type, nullability
 *        - approximate cardinality (distinct count in sample)
 *        - numeric stats (min / max / avg)
 *        - date range (earliest / latest)
 *        - representative sample values
 *        - an inferred *semantic role* (identifier, money, date, geo,
 *          contact, name, status, quantity, boolean flag, foreign key,
 *          category, free text, url, email, embedded array/object, …)
 *   3. Captures ONE complete representative document per collection
 *      (secrets redacted) so the operator can see a real, whole record.
 *   4. Infers a generic *entity role* per collection (people / transaction /
 *      catalog / event / ledger / config / relationship / other) using
 *      structural signals rather than hard-coded business names.
 *   5. Emits plain-English "what the AI learned" narratives so the whole
 *      process is transparent on the frontend.
 *
 * There are intentionally NO business-specific collection names hardcoded.
 * Any Mongo cluster — food delivery, SaaS, logistics, fintech — profiles the
 * same way. Heuristics are keyword *hints* layered on top of structural
 * evidence, never hard requirements.
 */

import { getDataConnection } from './connection.js';
import { getOrCreateSelfConnection } from './workspaceService.js';
import { LlmConnection } from '../models/llmModels.js';

// ── Tunables ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  sampleSize: 60,
  maxCollections: 80,
  maxFieldsPerCollection: 120,
  maxSampleValuesPerField: 8,
  maxDepth: 4,
};

// ── Semantic keyword hints (soft signals, never hard rules) ──────────────────
const HINTS = {
  money: /(price|amount|total|revenue|fee|cost|subtotal|grand|paid|spend|wallet|balance|salary|charge|refund|discount|commission|earning|payout|mrp|value)/i,
  status: /(status|state|phase|stage|type|kind|category|tier|level|role|mode)/i,
  date: /(date|_at$|time|created|updated|deleted|delivered|picked|expired|joined|scheduled|dob|birthday|timestamp)/i,
  geo: /(lat|lng|lon|longitude|latitude|coordinates|location|geo|pincode|zip|postal)/i,
  id: /(^_id$|Id$|ids$|^id$|uuid|guid|reference|ref$)/i,
  name: /(name|title|label|sku|slug|username|handle|displayname)/i,
  email: /(email|mail)/i,
  phone: /(phone|mobile|contact|whatsapp|tel|msisdn)/i,
  url: /(url|link|href|image|img|photo|avatar|thumbnail|media|website|site)/i,
  quantity: /(qty|quantity|count|stock|units|inventory|weight|volume|distance|duration|age|score|rating|points|calories)/i,
  flag: /(is[A-Z]|has[A-Z]|active|enabled|verified|deleted|blocked|banned|approved|confirmed|paid|default|premium)/i,
  address: /(address|street|city|region|country|area|locality|landmark)/i,
  password: /(password|secret|token|hash|salt|otp|apikey|api_key|privatekey|credential)/i,
};

// ── Value typing ─────────────────────────────────────────────────────────────
function rawType(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectID' || value._bsontype === 'ObjectId') return 'objectId';
    if (typeof value.toHexString === 'function') return 'objectId';
    if (value._bsontype === 'Decimal128') return 'number';
    return 'object';
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(value)) return 'date-string';
    if (/^[0-9a-fA-F]{24}$/.test(value)) return 'objectId-string';
    if (/^https?:\/\//i.test(value)) return 'url';
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return 'email';
    return 'string';
  }
  return typeof value;
}

/**
 * Flatten a document into dot-paths, but preserve arrays/objects as leaf markers
 * so we can profile embedded structures without exploding depth.
 */
function flatten(obj, prefix = '', out = {}, depth = 0) {
  if (depth > DEFAULTS.maxDepth || obj == null) return out;
  if (typeof obj !== 'object' || obj instanceof Date) {
    out[prefix || '_'] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    // Record the array itself, plus profile the first element's shape
    out[prefix || '_'] = obj;
    return out;
  }
  if (obj._bsontype || typeof obj.toHexString === 'function') {
    out[prefix || '_id'] = String(obj);
    return out;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    out[prefix || '_'] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !v._bsontype && typeof v.toHexString !== 'function') {
      flatten(v, path, out, depth + 1);
    } else {
      out[path] = v;
    }
  }
  return out;
}

/** Redact obvious secret fields anywhere in a document. */
function redactDoc(doc, depth = 0) {
  if (depth > 6 || doc == null) return doc;
  if (Array.isArray(doc)) return doc.slice(0, 12).map((d) => redactDoc(d, depth + 1));
  if (doc instanceof Date) return doc.toISOString();
  if (typeof doc === 'object') {
    if (doc._bsontype || typeof doc.toHexString === 'function') return String(doc);
    const out = {};
    for (const [k, v] of Object.entries(doc)) {
      if (HINTS.password.test(k)) {
        out[k] = '[redacted]';
      } else if (typeof v === 'string' && v.length > 300) {
        out[k] = `${v.slice(0, 297)}…`;
      } else {
        out[k] = redactDoc(v, depth + 1);
      }
    }
    return out;
  }
  return doc;
}

function shortValue(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (v._bsontype || typeof v.toHexString === 'function') return String(v);
    if (Array.isArray(v)) return `[${v.length} items]`;
    return `{${Object.keys(v).slice(0, 4).join(', ')}}`;
  }
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

/**
 * Assign a human-meaningful semantic role to a field using dominant type +
 * name hints + value evidence. Ordered from most-specific to least.
 */
function inferFieldRole(path, dominantType, hint, stats) {
  const base = path.replace(/^.*\./, '');

  if (path === '_id' || base === '_id') return 'primary_key';
  if (dominantType === 'objectId' || dominantType === 'objectId-string') {
    return hint.id && base !== '_id' ? 'foreign_key' : 'identifier';
  }
  if (dominantType === 'email' || hint.email) return 'email';
  if (dominantType === 'url' || hint.url) return 'url';
  if (dominantType === 'date' || dominantType === 'date-string' || hint.date) return 'timestamp';
  if (dominantType === 'boolean' || hint.flag) return 'boolean_flag';
  if (hint.geo) return 'geo';
  if (hint.phone) return 'contact_phone';
  if (hint.address) return 'address';
  if ((dominantType === 'integer' || dominantType === 'float') && hint.money) return 'money';
  if ((dominantType === 'integer' || dominantType === 'float') && hint.quantity) return 'quantity';
  if (dominantType === 'integer' || dominantType === 'float') return 'numeric';
  if (dominantType === 'array') return 'collection_array';
  if (dominantType === 'object') return 'embedded_object';
  if (hint.name) return 'label';
  // Low-cardinality strings behave like categories/status
  if (dominantType === 'string' && stats.distinct != null && stats.distinct <= 12 && stats.seen >= 5) {
    return hint.status ? 'status' : 'category';
  }
  if (hint.status) return 'status';
  if (dominantType === 'string') return 'text';
  return 'unknown';
}

/** Infer a generic entity role for a collection from its field roles. */
function inferEntityRole(collectionName, fields) {
  const roles = fields.map((f) => f.role);
  const has = (r) => roles.includes(r);
  const nameHits = (re) => re.test(collectionName);

  const fkCount = roles.filter((r) => r === 'foreign_key').length;
  const moneyCount = roles.filter((r) => r === 'money').length;
  const hasContact = has('email') || has('contact_phone');
  const hasTimestamp = has('timestamp');
  const hasStatus = has('status');

  // People: contact info + name, few money fields
  if ((hasContact || nameHits(/user|customer|client|member|people|person|contact|lead|subscriber|agent|staff|employee/i)) && has('label')) {
    return { role: 'people', reason: 'Has name + contact fields — represents individuals.' };
  }
  // Transaction: money + status + timestamp + foreign keys
  if (moneyCount >= 1 && (hasStatus || hasTimestamp) && fkCount >= 1) {
    return { role: 'transaction', reason: 'Money + status/time + references — represents transactions/orders.' };
  }
  if (nameHits(/order|purchase|booking|invoice|payment|txn|transaction|sale|checkout|subscription/i) && moneyCount >= 1) {
    return { role: 'transaction', reason: 'Name + monetary fields — transactional records.' };
  }
  // Catalog: label + money/quantity, few foreign keys
  if (has('label') && (moneyCount >= 1 || has('quantity')) && fkCount <= 1) {
    return { role: 'catalog', reason: 'Named items with price/quantity — a product/catalog.' };
  }
  // Ledger: mostly money + one foreign key + timestamp (wallet/commission logs)
  if (moneyCount >= 1 && fkCount >= 1 && roles.length <= 8) {
    return { role: 'ledger', reason: 'Money entries tied to a reference — a ledger/log.' };
  }
  // Event / relationship: multiple foreign keys, timestamp, little money
  if (fkCount >= 2 && hasTimestamp && moneyCount === 0) {
    return { role: 'event', reason: 'Multiple references + timestamp — event/relationship log.' };
  }
  // Config: tiny, no timestamps, no money
  if (!hasTimestamp && moneyCount === 0 && fields.length <= 6) {
    return { role: 'config', reason: 'Small, static shape — configuration/reference data.' };
  }
  return { role: 'other', reason: 'General-purpose collection.' };
}

/**
 * Profile a single collection: field stats, full sample doc, roles, learnings.
 */
async function profileCollection(db, name, opts) {
  const col = db.collection(name);

  let estimatedCount = 0;
  try {
    estimatedCount = await col.estimatedDocumentCount();
  } catch {
    estimatedCount = 0;
  }

  let samples = [];
  try {
    samples = await col.aggregate([{ $sample: { size: opts.sampleSize } }], { allowDiskUse: true }).toArray();
  } catch {
    try {
      samples = await col.find({}).limit(opts.sampleSize).toArray();
    } catch {
      samples = [];
    }
  }

  // Pick the most "complete" document (most non-null keys) as the representative
  let fullSampleDoc = null;
  let bestScore = -1;
  for (const doc of samples) {
    const score = Object.values(doc || {}).filter((v) => v != null && v !== '').length;
    if (score > bestScore) {
      bestScore = score;
      fullSampleDoc = doc;
    }
  }

  // Accumulate per-field stats
  const fieldMap = new Map();
  for (const doc of samples) {
    const flat = flatten(doc);
    for (const [path, value] of Object.entries(flat)) {
      if (!fieldMap.has(path)) {
        fieldMap.set(path, {
          path,
          types: new Map(),
          distinctSet: new Set(),
          sampleValues: [],
          seen: 0,
          nulls: 0,
          numMin: Infinity,
          numMax: -Infinity,
          numSum: 0,
          numCount: 0,
          dateMin: null,
          dateMax: null,
          arrayLenSum: 0,
          arrayCount: 0,
        });
      }
      const f = fieldMap.get(path);
      f.seen += 1;
      if (value == null || value === '') {
        f.nulls += 1;
        continue;
      }
      const t = rawType(value);
      f.types.set(t, (f.types.get(t) || 0) + 1);

      // distinct + samples (bounded)
      const sv = shortValue(value);
      if (f.distinctSet.size < 200) f.distinctSet.add(sv);
      if (f.sampleValues.length < opts.maxSampleValuesPerField && !f.sampleValues.includes(sv)) {
        f.sampleValues.push(sv);
      }

      if (t === 'integer' || t === 'float') {
        const num = typeof value === 'object' && value.toString ? Number(value.toString()) : Number(value);
        if (!Number.isNaN(num)) {
          f.numMin = Math.min(f.numMin, num);
          f.numMax = Math.max(f.numMax, num);
          f.numSum += num;
          f.numCount += 1;
        }
      } else if (t === 'date' || t === 'date-string') {
        const d = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(d.getTime())) {
          if (!f.dateMin || d < f.dateMin) f.dateMin = d;
          if (!f.dateMax || d > f.dateMax) f.dateMax = d;
        }
      } else if (t === 'array' && Array.isArray(value)) {
        f.arrayLenSum += value.length;
        f.arrayCount += 1;
      }
    }
  }

  const sampleN = Math.max(samples.length, 1);
  const fields = [...fieldMap.values()]
    .map((f) => {
      let dominant = 'unknown';
      let max = 0;
      for (const [t, c] of f.types.entries()) {
        if (c > max) {
          max = c;
          dominant = t;
        }
      }
      const hint = {
        money: HINTS.money.test(f.path),
        status: HINTS.status.test(f.path),
        date: HINTS.date.test(f.path),
        geo: HINTS.geo.test(f.path),
        id: HINTS.id.test(f.path),
        name: HINTS.name.test(f.path),
        email: HINTS.email.test(f.path),
        phone: HINTS.phone.test(f.path),
        url: HINTS.url.test(f.path),
        quantity: HINTS.quantity.test(f.path),
        flag: HINTS.flag.test(f.path),
        address: HINTS.address.test(f.path),
      };
      const stats = { distinct: f.distinctSet.size, seen: f.seen };
      const role = inferFieldRole(f.path, dominant, hint, stats);

      const profile = {
        path: f.path,
        type: dominant,
        role,
        fillRate: Math.round(((f.seen - f.nulls) / sampleN) * 100) / 100,
        distinctInSample: f.distinctSet.size,
        sampleValues: f.sampleValues,
      };
      if (f.numCount > 0) {
        profile.numeric = {
          min: f.numMin,
          max: f.numMax,
          avg: Math.round((f.numSum / f.numCount) * 100) / 100,
        };
      }
      if (f.dateMin && f.dateMax) {
        profile.dateRange = {
          earliest: f.dateMin.toISOString(),
          latest: f.dateMax.toISOString(),
        };
      }
      if (f.arrayCount > 0) {
        profile.avgArrayLength = Math.round((f.arrayLenSum / f.arrayCount) * 10) / 10;
      }
      return profile;
    })
    .sort((a, b) => {
      // sort primary/foreign keys and high-fill fields first
      const rank = (r) =>
        ({ primary_key: 0, label: 1, foreign_key: 2, money: 3, status: 4, timestamp: 5 }[r] ?? 9);
      return rank(a.role) - rank(b.role) || a.path.localeCompare(b.path);
    })
    .slice(0, opts.maxFieldsPerCollection);

  const entity = inferEntityRole(name, fields);

  // Build a plain-English learning summary
  const learnings = buildCollectionLearnings(name, estimatedCount, fields, entity);

  return {
    name,
    estimatedCount,
    sampledDocs: samples.length,
    entityRole: entity.role,
    entityReason: entity.reason,
    fieldCount: fields.length,
    fields,
    fullSampleDoc: redactDoc(fullSampleDoc),
    learnings,
  };
}

/** Turn a profiled collection into human-readable bullet insights. */
function buildCollectionLearnings(name, count, fields, entity) {
  const out = [];
  out.push(`"${name}" holds ~${count.toLocaleString()} documents and looks like ${entity.role} data (${entity.reason})`);

  const byRole = (r) => fields.filter((f) => f.role === r).map((f) => f.path);
  const money = byRole('money');
  const dates = byRole('timestamp');
  const fks = byRole('foreign_key');
  const status = byRole('status').concat(byRole('category'));
  const labels = byRole('label');
  const contacts = byRole('email').concat(byRole('contact_phone'));
  const arrays = byRole('collection_array');

  if (labels.length) out.push(`Human label field(s): ${labels.join(', ')}`);
  if (money.length) out.push(`Monetary field(s) for revenue/spend math: ${money.join(', ')}`);
  if (dates.length) out.push(`Time field(s) for period filters: ${dates.join(', ')}`);
  if (status.length) out.push(`Categorical/status field(s) for grouping: ${status.slice(0, 6).join(', ')}`);
  if (fks.length) out.push(`Reference field(s) linking to other collections: ${fks.join(', ')}`);
  if (contacts.length) out.push(`Contact field(s): ${contacts.join(', ')}`);
  if (arrays.length) out.push(`Embedded list field(s): ${arrays.join(', ')}`);

  return out;
}

/** Infer relationships across collections by matching foreign keys to _id owners. */
function inferClusterRelationships(collections) {
  const names = collections.map((c) => c.name.toLowerCase());
  const rels = [];
  for (const col of collections) {
    for (const f of col.fields) {
      if (f.role !== 'foreign_key') continue;
      const base = f.path
        .replace(/^.*\./, '')
        .replace(/Id$|_id$|Ids$|_ids$/i, '')
        .toLowerCase();
      if (!base || base.length < 2) continue;
      const candidates = [base, `${base}s`, `${base}es`];
      for (const cand of candidates) {
        const idx = names.indexOf(cand);
        if (idx >= 0 && collections[idx].name !== col.name) {
          rels.push({
            from: col.name,
            fromField: f.path,
            to: collections[idx].name,
            toField: '_id',
            confidence: 0.7,
          });
          break;
        }
      }
    }
  }
  // de-dupe
  const seen = new Set();
  return rels.filter((r) => {
    const k = `${r.from}.${r.fromField}->${r.to}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Analyze ONE connection (cluster) fully.
 */
export async function analyzeConnection(connection, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const data = await getDataConnection(connection);
  try {
    let names = (await data.db.listCollections().toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.') && !/^llm/i.test(n))
      .sort()
      .slice(0, opts.maxCollections);

    const collections = [];
    for (const name of names) {
      try {
        const profiled = await profileCollection(data.db, name, opts);
        if (profiled.estimatedCount > 0 || options.includeEmpty) {
          collections.push(profiled);
        }
      } catch {
        /* skip a broken collection, keep going */
      }
    }

    const relationships = inferClusterRelationships(collections);

    // Cluster-level summary
    const totalDocs = collections.reduce((s, c) => s + c.estimatedCount, 0);
    const roleTally = {};
    for (const c of collections) roleTally[c.entityRole] = (roleTally[c.entityRole] || 0) + 1;

    return {
      connectionId: String(connection._id),
      label:
        connection.mode === 'self'
          ? 'App database (self)'
          : connection.name || connection.meta?.host || 'External cluster',
      mode: connection.mode,
      host: connection.meta?.host || (connection.mode === 'self' ? 'self' : ''),
      dbName: data.dbName || connection.meta?.dbName || '',
      status: connection.status || 'connected',
      analyzedAt: new Date().toISOString(),
      summary: {
        collectionCount: collections.length,
        totalDocuments: totalDocs,
        roleTally,
        relationshipCount: relationships.length,
      },
      collections,
      relationships,
    };
  } finally {
    await data.release();
  }
}

/**
 * Analyze ALL clusters connected to a workspace. Runs in parallel with
 * per-connection isolation so one failure never blocks the rest.
 */
export async function analyzeAllClusters(workspaceId, options = {}) {
  const connections = await LlmConnection.find({ workspaceId }).lean();
  if (!connections.length) {
    const self = await getOrCreateSelfConnection(workspaceId);
    connections.push(self.toObject ? self.toObject() : self);
  }

  const results = await Promise.allSettled(
    connections.map((conn) => analyzeConnection(conn, options))
  );

  const clusters = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      clusters.push(results[i].value);
    } else {
      const conn = connections[i];
      clusters.push({
        connectionId: String(conn._id),
        label: conn.name || conn.meta?.host || 'Cluster',
        mode: conn.mode,
        status: 'error',
        error: results[i].reason?.message || 'Analysis failed',
        collections: [],
        relationships: [],
        summary: { collectionCount: 0, totalDocuments: 0, roleTally: {}, relationshipCount: 0 },
      });
    }
  }

  clusters.sort((a, b) => {
    if (a.mode === 'self') return -1;
    if (b.mode === 'self') return 1;
    return String(a.label).localeCompare(String(b.label));
  });

  const totals = clusters.reduce(
    (acc, c) => {
      acc.collections += c.summary?.collectionCount || 0;
      acc.documents += c.summary?.totalDocuments || 0;
      return acc;
    },
    { collections: 0, documents: 0 }
  );

  return {
    clusterCount: clusters.length,
    totals,
    clusters,
    generatedAt: new Date().toISOString(),
  };
}
