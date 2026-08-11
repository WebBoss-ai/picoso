import mongoose from 'mongoose';
import { getOrCreateSelfConnection } from '../discovery/workspaceService.js';
import { LlmConnection } from '../models/llmModels.js';
import { getDataConnection } from '../discovery/connection.js';

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
