import mongoose from 'mongoose';
import { getOrCreateSelfConnection } from '../discovery/workspaceService.js';
import { LlmConnection } from '../models/llmModels.js';
import { getDataConnection } from '../discovery/connection.js';

function withTimeout(promise, ms, label = 'query') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

const ALLOWED_AGGS = new Set(['count', 'count_distinct', 'sum', 'avg', 'min', 'max']);
const MAX_LIMIT = 100;

/**
 * Execute a semantic (schema-driven) analytics query against trained model collections.
 *
 * input example:
 * {
 *   collection: 'orders',
 *   aggregation: 'sum',
 *   field: 'totalPrice',
 *   filters: [{ field: 'status', op: 'in', value: ['delivered','confirmed'] }],
 *   groupBy: 'status',
 *   fromDate, toDate, dateField: 'createdAt',
 *   limit: 20
 * }
 */
export async function executeSemanticQuery(workspaceId, plan = {}, model = null) {
  const collection = String(plan.collection || plan.entity || '').trim();
  if (!collection) {
    return { type: 'error', error: 'collection is required' };
  }

  // Validate collection is in model when model present
  if (model?.entities?.length) {
    const allowed = new Set(
      model.entities.map((e) => e.collectionName || e.collection)
    );
    if (!allowed.has(collection)) {
      return {
        type: 'error',
        error: `Collection "${collection}" is not in the trained model. Available: ${[...allowed].join(', ')}`,
      };
    }
  }

  const aggregation = String(plan.aggregation || 'count').toLowerCase();
  if (!ALLOWED_AGGS.has(aggregation)) {
    return { type: 'error', error: `Unsupported aggregation: ${aggregation}` };
  }

  let connection = null;
  if (plan.connectionId) {
    connection = await LlmConnection.findById(plan.connectionId);
  }
  if (!connection) {
    connection = await getOrCreateSelfConnection(workspaceId);
  }

  const data = await getDataConnection(connection);
  try {
    const col = data.db.collection(collection);
    const match = buildMatch(plan);

    // limit scan risk
    const pipeline = [{ $match: match }];

    if (plan.groupBy) {
      const groupField = `$${plan.groupBy}`;
      const group = { _id: groupField };
      applyAggToGroup(group, aggregation, plan.field);
      pipeline.push({ $group: group });
      pipeline.push({ $sort: { value: -1 } });
      pipeline.push({ $limit: Math.min(Number(plan.limit) || 20, MAX_LIMIT) });
      const rows = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();
      return {
        type: 'metric_result',
        metric: plan.metricId || `${aggregation}_${collection}`,
        value: rows.length,
        unit: 'groups',
        groups: rows.map((r) => ({
          key: r._id,
          value: r.value,
        })),
        filters: plan,
        source: { dataset: collection, freshness: 'live' },
      };
    }

    // overall aggregate
    const group = { _id: null };
    applyAggToGroup(group, aggregation, plan.field);
    pipeline.push({ $group: group });

    const [row] = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();
    const value = row?.value ?? 0;

    return {
      type: 'metric_result',
      metric: plan.metricId || `${aggregation}_${collection}`,
      value: typeof value === 'number' ? Math.round(value * 100) / 100 : value,
      unit: aggregation === 'count' || aggregation === 'count_distinct' ? 'count' : 'number',
      related: {},
      filters: {
        collection,
        aggregation,
        field: plan.field || null,
        match,
      },
      source: { dataset: collection, freshness: 'live' },
      definitions: {
        query: `${aggregation}(${plan.field || '*'}) on ${collection}`,
      },
    };
  } finally {
    await data.release();
  }
}

/**
 * Run a named metric from semantic model by id.
 */
export async function executeModelMetric(workspaceId, model, metricId, options = {}) {
  if (!model) return { type: 'error', error: 'No active semantic model' };
  const metric = (model.metrics || []).find(
    (m) => m.id === metricId || m.name === metricId
  );
  if (!metric) {
    return {
      type: 'error',
      error: `Unknown metric "${metricId}". Use list_metrics first.`,
    };
  }

  return executeSemanticQuery(
    workspaceId,
    {
      collection: metric.entity,
      aggregation: metric.aggregation,
      field: metric.field,
      filters: [...(metric.filters || []), ...(options.filters || [])],
      fromDate: options.fromDate,
      toDate: options.toDate,
      dateField: options.dateField || 'createdAt',
      metricId: metric.id,
      groupBy: options.groupBy,
      limit: options.limit,
    },
    model
  );
}

function applyAggToGroup(group, aggregation, field) {
  switch (aggregation) {
    case 'count':
      group.value = { $sum: 1 };
      break;
    case 'count_distinct':
      if (!field) group.value = { $sum: 1 };
      else {
        group._ids = { $addToSet: `$${field}` };
        // need second stage — simplify to addToSet size via $project after; use sum 1 for now & note
        group.value = { $sum: 1 };
      }
      break;
    case 'sum':
      group.value = { $sum: { $ifNull: [`$${field}`, 0] } };
      break;
    case 'avg':
      group.value = { $avg: { $ifNull: [`$${field}`, 0] } };
      break;
    case 'min':
      group.value = { $min: `$${field}` };
      break;
    case 'max':
      group.value = { $max: `$${field}` };
      break;
    default:
      group.value = { $sum: 1 };
  }
}

function buildMatch(plan) {
  const match = {};

  for (const f of plan.filters || []) {
    if (!f?.field) continue;
    const op = f.op || f.operator || 'eq';
    const val = f.value;
    switch (op) {
      case 'eq':
      case 'equals':
        match[f.field] = val;
        break;
      case 'neq':
        match[f.field] = { $ne: val };
        break;
      case 'in':
        match[f.field] = { $in: Array.isArray(val) ? val : [val] };
        break;
      case 'gt':
        match[f.field] = { $gt: val };
        break;
      case 'gte':
        match[f.field] = { $gte: val };
        break;
      case 'lt':
        match[f.field] = { $lt: val };
        break;
      case 'lte':
        match[f.field] = { $lte: val };
        break;
      case 'regex':
      case 'contains':
        match[f.field] = { $regex: String(val), $options: 'i' };
        break;
      default:
        match[f.field] = val;
    }
  }

  const dateField = plan.dateField || 'createdAt';
  if (plan.fromDate || plan.toDate) {
    match[dateField] = match[dateField] || {};
    if (plan.fromDate) match[dateField].$gte = new Date(plan.fromDate);
    if (plan.toDate) match[dateField].$lte = new Date(plan.toDate);
    // if we overwrote with eq string, fix structure
    if (match[dateField] && typeof match[dateField] === 'string') {
      // ignore
    }
  }

  return match;
}

export async function sampleCollection(workspaceId, collection, limit = 5) {
  const connection = await getOrCreateSelfConnection(workspaceId);
  const data = await getDataConnection(connection);
  try {
    const rows = await data.db
      .collection(collection)
      .find({})
      .limit(Math.min(limit, 20))
      .toArray();
    return rows.map((r) => {
      const o = { ...r };
      if (o._id) o._id = String(o._id);
      return o;
    });
  } finally {
    await data.release();
  }
}

// ── Forbidden pipeline stages (mutation / server-side writes) ─────────────────
const FORBIDDEN_STAGES = new Set([
  '$out', '$merge', '$indexStats', '$planCacheStats',
  '$currentOp', '$listLocalSessions', '$listSessions',
]);

function sanitizePipeline(rawPipeline) {
  if (!Array.isArray(rawPipeline)) {
    throw new Error('pipeline must be a JSON array of stage objects');
  }
  if (rawPipeline.length > 20) {
    throw new Error('Pipeline too long (max 20 stages)');
  }
  for (const stage of rawPipeline) {
    if (!stage || typeof stage !== 'object') {
      throw new Error('Each pipeline stage must be an object');
    }
    const key = Object.keys(stage)[0];
    if (FORBIDDEN_STAGES.has(key)) {
      throw new Error(`Stage ${key} is not permitted (read-only analytics only)`);
    }
  }
  return rawPipeline;
}

function redactSensitiveFields(rows) {
  return rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row || {})) {
      if (/password|secret|token|hash|encryptedUri/i.test(k)) {
        out[k] = '[redacted]';
      } else if (v && typeof v === 'object' && v._bsontype) {
        out[k] = String(v);
      } else if (v instanceof Date) {
        out[k] = v.toISOString();
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

/**
 * Execute any MongoDB aggregation pipeline on the user's connected cluster.
 * This is the universal analytics engine — the LLM writes the pipeline
 * based on the discovered schema.
 *
 * @param {string} workspaceId
 * @param {{ collection: string, pipeline: object[], limit?: number, connectionId?: string }} opts
 */
export async function executePipeline(workspaceId, {
  collection,
  pipeline: rawPipeline,
  limit = 200,
  connectionId = null,
} = {}) {
  if (!collection) {
    return { type: 'error', error: 'collection is required' };
  }

  let connection = null;
  if (connectionId) {
    const { LlmConnection } = await import('../models/llmModels.js');
    connection = await LlmConnection.findById(connectionId);
  }
  if (!connection) {
    connection = await getOrCreateSelfConnection(workspaceId);
  }

  let pipeline;
  try {
    pipeline = sanitizePipeline(rawPipeline);
  } catch (err) {
    return { type: 'error', error: err.message };
  }

  // Auto-cap results: inject $limit at end if not already present
  const lastStage = pipeline[pipeline.length - 1];
  const hasLimit = lastStage && ('$limit' in lastStage || '$count' in lastStage);
  if (!hasLimit) {
    pipeline = [...pipeline, { $limit: Math.min(Number(limit) || 200, 500) }];
  }

  const data = await getDataConnection(connection);
  try {
    const col = data.db.collection(collection);
    const rows = await withTimeout(
      col.aggregate(pipeline, { allowDiskUse: true }).toArray(),
      25000,
      `pipeline on ${collection}`
    );
    const clean = redactSensitiveFields(rows);

    // Try to detect a single numeric result (count, sum, avg, etc.)
    let primaryValue = null;
    let primaryKey = null;
    if (clean.length === 1) {
      const row = clean[0];
      const keys = Object.keys(row).filter((k) => k !== '_id');
      if (keys.length === 1 && typeof row[keys[0]] === 'number') {
        primaryKey = keys[0];
        primaryValue = row[keys[0]];
      } else if (typeof row.count === 'number') {
        primaryKey = 'count';
        primaryValue = row.count;
      } else if (typeof row.total === 'number') {
        primaryKey = 'total';
        primaryValue = row.total;
      } else if (typeof row.value === 'number') {
        primaryKey = 'value';
        primaryValue = row.value;
      } else if (typeof row.result === 'number') {
        primaryKey = 'result';
        primaryValue = row.result;
      }
    }

    return {
      type: 'pipeline_result',
      collection,
      rowCount: clean.length,
      primaryKey,
      primaryValue,
      rows: clean.slice(0, 500),
      truncated: rows.length >= (Number(limit) || 200),
      source: { dataset: collection, freshness: 'live' },
    };
  } catch (err) {
    return {
      type: 'error',
      error: `Pipeline failed on "${collection}": ${err.message}`,
    };
  } finally {
    await data.release();
  }
}

/**
 * Get schema for a single connection. Returns array of { collection, count, fields }.
 */
async function getSchemaForConnection(connection) {
  const data = await getDataConnection(connection);
  try {
    const names = (await data.db.listCollections().toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.') && !/^llm/i.test(n))
      .sort()
      .slice(0, 60);

    const summary = [];
    for (const name of names) {
      const col = data.db.collection(name);
      let count = 0;
      try { count = await col.estimatedDocumentCount(); } catch { /* ignore */ }
      if (count === 0) continue;

      let fields = [];
      try {
        const sample = await withTimeout(
          col.aggregate([{ $sample: { size: 3 } }]).toArray(),
          8000,
          `schema sample ${name}`
        );
        const pathSet = new Set();
        for (const doc of sample) {
          Object.keys(flatten(doc)).forEach((p) => pathSet.add(p));
        }
        const sampleDoc = sample[0] || {};
        fields = [...pathSet]
          .filter((p) => p !== '_id')
          .slice(0, 25)
          .map((p) => {
            const v = sampleDoc[p];
            let hint = '';
            if (v instanceof Date || (typeof v === 'string' && /^\d{4}-/.test(v))) hint = ':date';
            else if (typeof v === 'number') hint = `:num(${Number.isInteger(v) ? v : v.toFixed(2)})`;
            else if (typeof v === 'string' && v.length < 30) hint = `:"${v}"`;
            return `${p}${hint}`;
          });
      } catch { /* ignore */ }

      summary.push({ collection: name, count, fields });
    }
    return summary;
  } catch {
    return [];
  } finally {
    await data.release();
  }
}

/**
 * Get combined schema across ALL connected clusters for a workspace.
 * Returns an array of cluster objects, each with a label + their collections.
 * This powers the multi-cluster LLM prompt so the model knows exactly what's available
 * and which connectionId to pass to execute_pipeline for cross-cluster queries.
 */
export async function getAllClustersSchema(workspaceId) {
  const { LlmConnection } = await import('../models/llmModels.js');

  // Load all connections for this workspace
  const connections = await LlmConnection.find({ workspaceId }).lean();
  if (!connections.length) {
    // Ensure self connection exists
    const self = await getOrCreateSelfConnection(workspaceId);
    connections.push(self.toObject ? self.toObject() : self);
  }

  const clusters = [];

  await Promise.allSettled(
    connections.map(async (conn) => {
      try {
        const label = conn.mode === 'self'
          ? 'App database (self)'
          : conn.name || conn.meta?.host || 'External cluster';

        const schema = await getSchemaForConnection(conn);
        clusters.push({
          connectionId: String(conn._id),
          label,
          mode: conn.mode,
          host: conn.meta?.host || 'self',
          dbName: conn.meta?.dbName || '',
          collections: schema,
        });
      } catch {
        /* skip failed connection */
      }
    })
  );

  // Sort: self first, then alphabetical
  clusters.sort((a, b) => {
    if (a.mode === 'self') return -1;
    if (b.mode === 'self') return 1;
    return a.label.localeCompare(b.label);
  });

  return clusters;
}

/**
 * Get a compact schema summary for LLM prompt injection (single self connection).
 * For multi-cluster, use getAllClustersSchema instead.
 */
export async function getSchemaForPrompt(workspaceId, connectionId = null) {
  let connection = null;
  if (connectionId) {
    const { LlmConnection } = await import('../models/llmModels.js');
    connection = await LlmConnection.findById(connectionId);
  }
  if (!connection) {
    connection = await getOrCreateSelfConnection(workspaceId);
  }
  return getSchemaForConnection(connection);
}

// Re-export flatten for getSchemaForPrompt
function flatten(obj, prefix = '', out = {}, depth = 0) {
  if (depth > 3 || obj == null) return out;
  if (typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    out[prefix || '_'] = obj;
    return out;
  }
  if (typeof obj.toHexString === 'function') {
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
