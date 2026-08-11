/**
 * Infer field types and business roles from sample documents.
 */

const MONEY_HINTS = /price|amount|total|revenue|fee|cost|subtotal|grand|paid|spend|wallet/i;
const STATUS_HINTS = /status|state|phase|stage/i;
const DATE_HINTS = /date|at$|time|created|updated|delivered|picked/i;
const GEO_HINTS = /lat|lng|lon|longitude|latitude|coordinates|location|geo/i;
const ID_HINTS = /(^_id$|Id$|ids$|^id$)/i;
const NAME_HINTS = /name|title|label|sku/i;

function pathType(value) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectID' || value._bsontype === 'ObjectId') return 'objectId';
    if (typeof value.toHexString === 'function') return 'objectId';
    return 'object';
  }
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date-string';
    return 'string';
  }
  return typeof value;
}

function flatten(obj, prefix = '', out = {}, depth = 0) {
  if (depth > 4 || obj == null) return out;
  if (typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    out[prefix || '_'] = obj;
    return out;
  }
  if (obj._bsontype === 'ObjectID' || obj._bsontype === 'ObjectId' || typeof obj.toHexString === 'function') {
    out[prefix || '_id'] = String(obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !v._bsontype) {
      flatten(v, path, out, depth + 1);
    } else {
      out[path] = v;
    }
  }
  return out;
}

/**
 * Discover collections + field stats from a Mongo db handle.
 * Samples up to maxCollections × sampleSize documents.
 * When `collections` allowlist is set, those names are preferred (up to 120).
 */
export async function discoverSchema(db, options = {}) {
  const sampleSize = Math.min(Number(options.sampleSize) || 40, 100);
  const maxCollections = Math.min(Number(options.maxCollections) || 40, 120);
  const only = options.collections || null;
  const skipEmpty = options.skipEmpty === true;

  let names = await db.listCollections().toArray();
  names = names
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'))
    .filter((n) => !/^llm/i.test(n)) // skip our control-plane llm collections when on self
    .sort();

  if (only?.length) {
    const wanted = new Set(only.map(String));
    names = names.filter((n) => wanted.has(n));
    // respect explicit selection fully (cap at 120 for safety)
    names = names.slice(0, 120);
  } else {
    names = names.slice(0, maxCollections);
  }

  const collections = [];

  for (const name of names) {
    const col = db.collection(name);
    let estimatedCount = 0;
    try {
      estimatedCount = await col.estimatedDocumentCount();
    } catch {
      estimatedCount = 0;
    }
    if (skipEmpty && estimatedCount === 0) continue;

    let samples = [];
    try {
      samples = await col.aggregate([{ $sample: { size: sampleSize } }]).toArray();
    } catch {
      samples = await col.find({}).limit(sampleSize).toArray();
    }

    const fieldMap = new Map();

    for (const doc of samples) {
      const flat = flatten(doc);
      for (const [path, value] of Object.entries(flat)) {
        if (!fieldMap.has(path)) {
          fieldMap.set(path, {
            path,
            types: new Map(),
            samples: [],
            nulls: 0,
            seen: 0,
          });
        }
        const f = fieldMap.get(path);
        f.seen += 1;
        if (value == null) {
          f.nulls += 1;
          continue;
        }
        const t = pathType(value);
        f.types.set(t, (f.types.get(t) || 0) + 1);
        if (f.samples.length < 6) {
          let sv = value;
          if (typeof sv === 'string' && sv.length > 80) sv = `${sv.slice(0, 77)}…`;
          if (typeof sv === 'object') sv = String(sv);
          f.samples.push(sv);
        }
      }
    }

    const fields = [...fieldMap.values()].map((f) => {
      let dominant = 'unknown';
      let max = 0;
      for (const [t, c] of f.types.entries()) {
        if (c > max) {
          max = c;
          dominant = t;
        }
      }
      const isNumeric = dominant === 'number' || dominant === 'integer';
      const isDate = dominant === 'date' || dominant === 'date-string';
      const pathStr = f.path;
      return {
        path: pathStr,
        dataType: dominant,
        type: dominant, // compat for readers
        sampleValues: f.samples,
        nullRate: f.seen ? f.nulls / Math.max(samples.length, 1) : 0,
        isId: pathStr === '_id' || ID_HINTS.test(pathStr),
        isForeignKey: /Id$|_id$/.test(pathStr) && pathStr !== '_id',
        isGeo: GEO_HINTS.test(pathStr),
        isDate: isDate || DATE_HINTS.test(pathStr),
        isNumeric,
        isMoneyLike: isNumeric && MONEY_HINTS.test(pathStr),
        isStatusLike: STATUS_HINTS.test(pathStr),
      };
    });

    collections.push({
      name,
      estimatedCount,
      sampleSize: samples.length,
      fields: fields.sort((a, b) => a.path.localeCompare(b.path)),
      sampleDocs: samples.slice(0, 3).map(sanitizeSampleDoc),
    });
  }

  const relationships = inferRelationships(collections);

  return {
    collections,
    relationships,
    discoveredAt: new Date(),
  };
}

/**
 * Lightweight catalog of ALL user collections (counts + optional sample docs).
 * Used by Train UI to let operators pick what to include.
 */
export async function listMongoCatalog(db, options = {}) {
  const includeEmpty = options.includeEmpty !== false;
  const withSamples = options.withSamples !== false;
  const sampleSize = Math.min(Number(options.sampleSize) || 2, 5);
  const maxNames = Math.min(Number(options.maxNames) || 200, 300);

  let names = await db.listCollections().toArray();
  names = names
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'))
    .filter((n) => !/^llm/i.test(n))
    .sort()
    .slice(0, maxNames);

  const collections = [];
  for (const name of names) {
    const col = db.collection(name);
    let estimatedCount = 0;
    try {
      estimatedCount = await col.estimatedDocumentCount();
    } catch {
      estimatedCount = 0;
    }
    if (!includeEmpty && estimatedCount === 0) continue;

    let sampleDocs = [];
    let fieldPaths = [];
    if (withSamples && estimatedCount > 0) {
      try {
        const samples = await col.aggregate([{ $sample: { size: sampleSize } }]).toArray();
        sampleDocs = samples.map(sanitizeSampleDoc);
        const pathSet = new Set();
        for (const doc of samples) {
          Object.keys(flatten(doc)).forEach((p) => pathSet.add(p));
        }
        fieldPaths = [...pathSet].sort().slice(0, 40);
      } catch {
        try {
          const samples = await col.find({}).limit(sampleSize).toArray();
          sampleDocs = samples.map(sanitizeSampleDoc);
        } catch {
          /* ignore */
        }
      }
    }

    collections.push({
      name,
      estimatedCount,
      hasData: estimatedCount > 0,
      fieldPaths,
      sampleDocs,
    });
  }

  // with data first, then by name
  collections.sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    collections,
    total: collections.length,
    withData: collections.filter((c) => c.hasData).length,
    discoveredAt: new Date(),
  };
}

function sanitizeSampleDoc(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) {
    if (k === 'password' || /secret|token|hash/i.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    if (v && typeof v === 'object' && v._bsontype) {
      out[k] = String(v);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = sanitizeSampleDoc(v);
    } else if (typeof v === 'string' && v.length > 120) {
      out[k] = `${v.slice(0, 117)}…`;
    } else {
      out[k] = v instanceof Date ? v.toISOString() : v;
    }
  }
  return out;
}

/**
 * Heuristic FK: orders.userId → users._id
 */
export function inferRelationships(collections) {
  const byName = new Map(collections.map((c) => [c.name.toLowerCase(), c]));
  const rels = [];

  for (const col of collections) {
    for (const field of col.fields) {
      if (!field.isForeignKey && !/Id$/.test(field.path)) continue;
      const base = field.path
        .replace(/^.*\./, '')
        .replace(/Ids?$/i, '')
        .toLowerCase();
      if (!base || base.length < 2) continue;

      const candidates = [
        base,
        `${base}s`,
        base === 'user' ? 'users' : null,
        base === 'order' ? 'orders' : null,
        base === 'product' ? 'products' : null,
        base === 'bowl' ? 'bowls' : null,
        base === 'customer' ? 'users' : null,
      ].filter(Boolean);

      for (const cand of candidates) {
        if (byName.has(cand) && cand !== col.name.toLowerCase()) {
          const target = byName.get(cand);
          rels.push({
            fromCollection: col.name,
            fromField: field.path,
            toCollection: target.name,
            toField: '_id',
            confidence: 0.72,
            confirmed: false,
          });
          break;
        }
      }
    }
  }

  // de-dupe
  const seen = new Set();
  return rels.filter((r) => {
    const k = `${r.fromCollection}.${r.fromField}->${r.toCollection}.${r.toField}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Build draft semantic model from discovery + optional business name.
 */
export function draftSemanticModel(snapshot, options = {}) {
  const collections = snapshot.collections || [];
  const entities = [];
  const metrics = [];
  const dimensions = [];
  const glossary = [];

  const roleOf = (name, fields) => {
    const n = name.toLowerCase();
    if (/user|customer|client|member/.test(n)) return 'customer';
    if (/order|purchase|booking|invoice/.test(n)) return 'order';
    if (/bowl|product|item|menu|sku|catalog/.test(n) && !/order/.test(n)) return 'product';
    if (/payment|txn|transaction/.test(n)) return 'payment';
    if (fields.some((f) => f.isMoneyLike && /total|amount|price/.test(f.path))) {
      if (/order/.test(n)) return 'order';
    }
    return 'other';
  };

  for (const col of collections) {
    const role = roleOf(col.name, col.fields);
    const fieldType = (f) => f.dataType || f.type;
    const labelField =
      col.fields.find((f) => NAME_HINTS.test(f.path) && fieldType(f) === 'string')?.path ||
      col.fields.find((f) => f.path === 'name')?.path ||
      null;

    entities.push({
      id: col.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: humanize(col.name),
      collectionName: col.name,
      description: `Auto-detected from collection ${col.name} (~${col.estimatedCount} docs)`,
      primaryKey: '_id',
      labelField,
      role,
      confirmed: false,
    });

    // count metric per entity
    metrics.push({
      id: `count_${col.name.toLowerCase()}`,
      name: `${humanize(col.name)} count`,
      description: `Number of rows in ${col.name}`,
      aggregation: 'count',
      entity: col.name,
      field: null,
      filters: [],
      confirmed: false,
    });

    for (const f of col.fields) {
      if (f.isMoneyLike) {
        metrics.push({
          id: `sum_${col.name}_${f.path}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
          name: `Sum of ${f.path} (${humanize(col.name)})`,
          description: `Sum of ${f.path} on ${col.name}`,
          aggregation: 'sum',
          entity: col.name,
          field: f.path,
          filters: [],
          confirmed: false,
        });
      }
      if (f.isStatusLike || (fieldType(f) === 'string' && f.sampleValues?.length)) {
        if (!f.isId && f.path !== '_id') {
          dimensions.push({
            id: `dim_${col.name}_${f.path}`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
            name: `${f.path} (${humanize(col.name)})`,
            entity: col.name,
            field: f.path,
            dataType: f.isDate ? 'date' : f.isNumeric ? 'numeric' : f.isGeo ? 'geo' : 'categorical',
            type: f.isDate ? 'date' : f.isNumeric ? 'numeric' : f.isGeo ? 'geo' : 'categorical',
            confirmed: false,
          });
        }
      }
      if (f.isDate) {
        dimensions.push({
          id: `dim_${col.name}_${f.path}_date`.replace(/[^a-z0-9_]+/gi, '_').toLowerCase(),
          name: `${f.path} date`,
          entity: col.name,
          field: f.path,
          dataType: 'date',
          type: 'date',
          confirmed: false,
        });
      }
    }
  }

  // Commerce shortcuts when orders-like + customers-like present
  const orderEnt = entities.find((e) => e.role === 'order');
  const custEnt = entities.find((e) => e.role === 'customer');
  const prodEnt = entities.find((e) => e.role === 'product');

  if (orderEnt) {
    const orderCol = collections.find((c) => c.name === orderEnt.collectionName);
    const money =
      orderCol?.fields.find((f) => /totalPrice|total|amount|grandTotal/i.test(f.path))?.path ||
      orderCol?.fields.find((f) => f.isMoneyLike)?.path;
    if (money) {
      metrics.unshift({
        id: 'revenue',
        name: 'Revenue',
        description: `Sum of ${money} on ${orderEnt.collectionName}`,
        aggregation: 'sum',
        entity: orderEnt.collectionName,
        field: money,
        filters: [],
        confirmed: false,
      });
      metrics.unshift({
        id: 'orders',
        name: 'Orders',
        description: `Count of ${orderEnt.collectionName}`,
        aggregation: 'count',
        entity: orderEnt.collectionName,
        field: null,
        filters: [],
        confirmed: false,
      });
      metrics.unshift({
        id: 'aov',
        name: 'Average order value',
        description: `Average of ${money}`,
        aggregation: 'avg',
        entity: orderEnt.collectionName,
        field: money,
        filters: [],
        confirmed: false,
      });
    }
  }

  if (custEnt) {
    metrics.unshift({
      id: 'unique_customers',
      name: 'Unique customers',
      description: `Distinct records in ${custEnt.collectionName}`,
      aggregation: 'count',
      entity: custEnt.collectionName,
      field: null,
      filters: [],
      confirmed: false,
    });
  }

  glossary.push(
    {
      term: 'workspace',
      definition: options.businessName || 'This business data workspace',
    },
    {
      term: 'training',
      definition:
        'Semantic model trained from sample documents: entities, metrics, dimensions, and relationships you confirm.',
    }
  );

  if (orderEnt && moneyField(collections, orderEnt)) {
    glossary.push({
      term: 'revenue',
      definition: `Sum of ${moneyField(collections, orderEnt)} on completed-like orders when status filters applied`,
    });
  }
  if (prodEnt) {
    glossary.push({
      term: 'product',
      definition: `Mapped to collection ${prodEnt.collectionName}`,
    });
  }

  // de-dupe metrics by id
  const seenM = new Set();
  const uniqMetrics = metrics.filter((m) => {
    if (seenM.has(m.id)) return false;
    seenM.add(m.id);
    return true;
  }).slice(0, 80);

  const seenD = new Set();
  const uniqDims = dimensions.filter((d) => {
    if (seenD.has(d.id)) return false;
    seenD.add(d.id);
    return true;
  }).slice(0, 120);

  const relationships = (snapshot.relationships || []).map((r) => ({
    fromEntity: r.fromCollection,
    toEntity: r.toCollection,
    fromField: r.fromField,
    toField: r.toField,
    confirmed: false,
  }));

  return {
    name: options.modelName || 'Auto-trained business brain',
    status: 'draft',
    entities,
    metrics: uniqMetrics,
    dimensions: uniqDims,
    relationships,
    glossary,
    businessContext:
      options.businessContext ||
      'Model inferred from MongoDB sample documents. Confirm entities and metrics to improve accuracy.',
    trainingHints: [],
  };
}

function moneyField(collections, orderEnt) {
  const orderCol = collections.find((c) => c.name === orderEnt.collectionName);
  return (
    orderCol?.fields.find((f) => /totalPrice|total|amount/i.test(f.path))?.path ||
    orderCol?.fields.find((f) => f.isMoneyLike)?.path ||
    null
  );
}

function humanize(name) {
  return String(name)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
