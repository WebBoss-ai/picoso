import { Bowl } from '../../models/Model.js';
import {
  executeProductBuyers,
  executeRevenue,
  executeTopProducts,
  executeInactiveCustomers,
  executeCustomersInRadius,
  executeOrderCountForProduct,
} from '../query/executor.js';
import { clampDays, clampLimit, clampRadiusKm } from '../query/validator.js';
import { stripPiiDeep, sanitizeCustomerRow } from '../pii.js';
import { STORE_LOCATION, GLOSSARY } from '../semantic/picosoModel.js';
import { getToolContext } from './context.js';
import {
  executeSemanticQuery,
  executeModelMetric,
  sampleCollection,
} from '../query/semanticExecutor.js';
import {
  getCorpusForModel,
  runTrainedSampleMetric,
} from '../discovery/workspaceService.js';
import { queryTrainedRecords } from '../discovery/unstructured.js';

function scoreProductName(query, name) {
  const q = String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const n = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!q || !n) return 0;
  if (n === q) return 1;
  if (n.includes(q)) return 0.92;
  if (q.includes(n) && n.length >= 4) return 0.85;
  const qTokens = q.split(' ').filter(Boolean);
  const nTokens = new Set(n.split(' ').filter(Boolean));
  if (!qTokens.length) return 0;
  let hit = 0;
  for (const t of qTokens) {
    if (nTokens.has(t)) hit += 1;
    else if ([...nTokens].some((nt) => nt.includes(t) || t.includes(nt))) hit += 0.5;
  }
  return Math.min(0.9, hit / qTokens.length);
}

async function resolve_product(input = {}) {
  const name = String(input.name || input.query || '').trim();
  if (!name) {
    return { type: 'error', error: 'name is required' };
  }
  const bowls = await Bowl.find({})
    .select('_id name category tags available description')
    .lean();

  const ranked = bowls
    .map((b) => ({
      productId: String(b._id),
      name: b.name,
      category: b.category,
      available: b.available,
      score: Math.max(
        scoreProductName(name, b.name),
        ...(b.tags || []).map((t) => scoreProductName(name, t) * 0.85)
      ),
    }))
    .filter((r) => r.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!ranked.length) {
    return {
      type: 'product_resolution',
      query: name,
      match: null,
      confidence: 0,
      candidates: [],
      needsClarification: true,
      message: `No products matched "${name}".`,
    };
  }

  const top = ranked[0];
  const second = ranked[1];
  const ambiguous =
    second && top.score < 0.9 && top.score - second.score < 0.12 && second.score > 0.45;

  if (ambiguous) {
    return {
      type: 'product_resolution',
      query: name,
      match: null,
      confidence: top.score,
      candidates: ranked.slice(0, 5),
      needsClarification: true,
      message: `Multiple products match "${name}". Which one?`,
    };
  }

  return {
    type: 'product_resolution',
    query: name,
    match: top,
    confidence: top.score,
    candidates: ranked.slice(0, 5),
    needsClarification: false,
  };
}

async function find_customers_within_radius(input = {}) {
  const radiusKm = clampRadiusKm(input.radius_km ?? input.radiusKm ?? 2, 2);
  const days = clampDays(input.days ?? 90, 90);
  const limit = clampLimit(input.limit ?? 25, 25);
  const raw = await executeCustomersInRadius({ radiusKm, days, limit });
  return stripPiiDeep({
    type: 'metric_result',
    metric: 'unique_customers',
    value: raw.uniqueCustomers,
    unit: 'customers',
    related: {
      orders: raw.orders,
      revenue: raw.revenue,
    },
    customers: (raw.customers || []).map(sanitizeCustomerRow),
    filters: {
      radiusKm,
      days,
      center: STORE_LOCATION,
    },
    source: raw.source,
    definition: GLOSSARY.distance_from_store,
  });
}

async function count_unique_product_buyers(input = {}) {
  const productId = input.product_id || input.productId || null;
  const productName = input.product_name || input.productName || null;
  if (!productId && !productName) {
    return {
      type: 'error',
      error: 'product_id or product_name is required — call resolve_product first',
    };
  }
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const radiusKm =
    input.radius_km != null || input.radiusKm != null
      ? clampRadiusKm(input.radius_km ?? input.radiusKm, 2)
      : null;
  const listLimit = clampLimit(input.limit ?? 15, 15);

  const raw = await executeProductBuyers({
    productId,
    productName,
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    radiusKm,
    listLimit,
  });
  const totalProductOrders = await executeOrderCountForProduct(
    productId,
    fromDate || toDate ? undefined : days,
    productName,
    fromDate,
    toDate
  );

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'unique_customers',
    value: raw.uniqueCustomers,
    unit: 'customers',
    related: {
      orders: raw.orders,
      revenue: raw.revenue,
      repeat_customers: raw.repeatCustomers,
      repeat_rate: raw.repeatRate,
      total_product_orders_in_period: totalProductOrders,
      total_product_buyers_any_distance: raw.totalsWithoutRadius?.uniqueCustomers ?? null,
      buyers_with_coordinates: raw.totalsWithoutRadius?.customersWithCoordinates ?? null,
    },
    customers: (raw.customers || []).map(sanitizeCustomerRow),
    filters: {
      productId: productId ? String(productId) : null,
      productName: productName || null,
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      radiusKm,
      center: radiusKm != null ? STORE_LOCATION : undefined,
    },
    source: raw.source,
    definitions: {
      customer: GLOSSARY.customer,
      completed_order: GLOSSARY.completed_order,
      repeat_customer: GLOSSARY.repeat_customer,
      distance_from_store: GLOSSARY.distance_from_store,
    },
    notes:
      radiusKm != null &&
      raw.uniqueCustomers === 0 &&
      (raw.totalsWithoutRadius?.uniqueCustomers || 0) > 0
        ? `${raw.totalsWithoutRadius.uniqueCustomers} product buyers overall, but 0 with delivery/profile coords inside ${radiusKm} km.`
        : null,
  });
}

async function get_repeat_customers(input = {}) {
  const productId = input.product_id || input.productId || null;
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const minOrders = Math.max(2, Number(input.min_orders ?? input.minOrders ?? 2) || 2);
  const preferred =
    input.preferred_metric ||
    input.preferredMetric ||
    input.metric ||
    'repeat_customers';
  const radiusKm =
    input.radius_km != null || input.radiusKm != null
      ? clampRadiusKm(input.radius_km ?? input.radiusKm, 2)
      : null;
  const statuses = normalizeStatuses(input.statuses || input.status);
  const periodLabel = input.periodLabel || input.period_label || null;

  if (productId) {
    const raw = await executeProductBuyers({
      productId,
      days: fromDate || toDate ? undefined : days,
      fromDate,
      toDate,
      radiusKm,
      listLimit: 40,
    });
    const filtered = (raw.customers || []).filter((c) => (c.orderCount || c.orders || 0) >= minOrders);
    const uniqueCustomers = raw.uniqueCustomers;
    const repeatCustomers = filtered.length;
    const rate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;
    const primaryIsRate = /rate/i.test(String(preferred));
    return stripPiiDeep({
      type: 'metric_result',
      metric: primaryIsRate ? 'repeat_rate' : 'repeat_customers',
      value: primaryIsRate ? Math.round(rate * 10000) / 10000 : repeatCustomers,
      unit: primaryIsRate ? 'ratio' : 'customers',
      preferMetric: preferred,
      related: {
        unique_customers: uniqueCustomers,
        repeat_customers: repeatCustomers,
        repeat_rate: Math.round(rate * 10000) / 10000,
        orders: raw.orders,
        revenue: raw.revenue,
        min_orders: minOrders,
      },
      customers: filtered.map(sanitizeCustomerRow),
      filters: {
        productId,
        days: fromDate || toDate ? null : days,
        fromDate,
        toDate,
        periodLabel,
        radiusKm,
        min_orders: minOrders,
        statuses: statuses || undefined,
      },
      source: raw.source,
      definition: `Customers with ≥${minOrders} completed product orders in period.`,
    });
  }

  const { Order } = await import('../../models/Model.js');
  const { COMPLETED_ORDER_STATUSES } = await import('../semantic/picosoModel.js');
  const statusList = statuses || COMPLETED_ORDER_STATUSES;
  const match = {
    status: { $in: statusList },
  };
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  } else {
    match.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  }

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
        name: { $last: '$customerName' },
        phone: { $last: '$phone' },
      },
    },
    { $match: { orderCount: { $gte: minOrders } } },
    { $sort: { orderCount: -1 } },
    { $limit: clampLimit(input.limit ?? 100, 100) },
  ]);

  const uniques = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$userId' } },
    { $count: 'n' },
  ]);
  const uniqueCustomers = uniques[0]?.n || 0;
  const repeatCustomers = rows.length;
  const rate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;
  const primaryIsRate = /rate/i.test(String(preferred));

  return stripPiiDeep({
    type: 'metric_result',
    metric: primaryIsRate ? 'repeat_rate' : 'repeat_customers',
    value: primaryIsRate ? Math.round(rate * 10000) / 10000 : repeatCustomers,
    unit: primaryIsRate ? 'ratio' : 'customers',
    preferMetric: preferred,
    related: {
      unique_customers: uniqueCustomers,
      repeat_customers: repeatCustomers,
      repeat_rate: Math.round(rate * 10000) / 10000,
      min_orders: minOrders,
    },
    customers: rows.map((r) =>
      sanitizeCustomerRow({
        customerId: r._id,
        orders: r.orderCount,
        spend: r.revenue,
        name: r.name,
        phone: r.phone,
      })
    ),
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      min_orders: minOrders,
      statuses: statusList,
    },
    source: {
      dataset: 'orders',
      freshness: 'live',
      collection: 'orders',
      match: { status: statusList, min_orders: minOrders },
    },
    definition: `Customers with ≥${minOrders} orders in status set during the period.`,
  });
}

/**
 * Flexible customer segment by order frequency (any threshold).
 * Examples: more than 5 times, exactly 1 order, top spenders among frequent buyers.
 */
async function query_customers(input = {}) {
  const { Order } = await import('../../models/Model.js');
  const { COMPLETED_ORDER_STATUSES } = await import('../semantic/picosoModel.js');
  const minOrders = Math.max(1, Number(input.min_orders ?? input.minOrders ?? 1) || 1);
  const maxOrders =
    input.max_orders != null || input.maxOrders != null
      ? Number(input.max_orders ?? input.maxOrders)
      : null;
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const statuses = normalizeStatuses(input.statuses || input.status) || COMPLETED_ORDER_STATUSES;
  const limit = clampLimit(input.limit ?? 50, 50);
  const sortBy = String(input.sort_by || input.sortBy || 'orderCount');
  const periodLabel = input.periodLabel || input.period_label || null;

  const match = { status: { $in: statuses } };
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  } else {
    match.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  }

  const qtyMatch = { orderCount: { $gte: minOrders } };
  if (maxOrders != null && !Number.isNaN(maxOrders)) {
    qtyMatch.orderCount.$lte = maxOrders;
  }

  const sort =
    sortBy === 'spend' || sortBy === 'revenue'
      ? { revenue: -1 }
      : { orderCount: -1 };

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
        name: { $last: '$customerName' },
        phone: { $last: '$phone' },
      },
    },
    { $match: qtyMatch },
    { $sort: sort },
    { $limit: limit },
  ]);

  const totalSeg = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 },
      },
    },
    { $match: qtyMatch },
    { $count: 'n' },
  ]);
  const count = totalSeg[0]?.n || 0;

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'segment_customers',
    value: count,
    unit: 'customers',
    related: {
      min_orders: minOrders,
      max_orders: maxOrders,
      sample_size: rows.length,
    },
    customers: rows.map((r) =>
      sanitizeCustomerRow({
        customerId: r._id,
        orders: r.orderCount,
        spend: r.revenue,
        name: r.name,
        phone: r.phone,
      })
    ),
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      min_orders: minOrders,
      max_orders: maxOrders,
      statuses,
    },
    source: {
      dataset: 'orders',
      freshness: 'live',
      collection: 'orders',
      match: { status: statuses, min_orders: minOrders, max_orders: maxOrders },
    },
    definition: `Customers with order count in [${minOrders}, ${maxOrders ?? '∞'}] in period.`,
    calculationNote: `Grouped live orders by userId; filter orderCount ≥ ${minOrders}${maxOrders != null ? ` ≤ ${maxOrders}` : ''}`,
  });
}

async function get_clock_context() {
  const now = new Date();
  const partsFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    partsFmt
      .formatToParts(now)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  const y = Number(parts.year);
  const mo = Number(parts.month);
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const istStart = (yy, mm, dd) =>
    new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
  const thisMonthStart = istStart(y, mo, 1);
  const nextMonth = mo === 12 ? istStart(y + 1, 1, 1) : istStart(y, mo + 1, 1);
  let ly = y;
  let lmo = mo - 1;
  if (lmo < 1) {
    lmo = 12;
    ly -= 1;
  }
  const lastMonthStart = istStart(ly, lmo, 1);
  const lastMonthEnd = thisMonthStart;

  // Named months this year (and previous year for early months if needed)
  const monthWindows = {};
  for (let m = 1; m <= 12; m++) {
    const name = monthNames[m - 1].toLowerCase();
    monthWindows[name] = {
      fromDate: istStart(y, m, 1).toISOString(),
      toDate: (m === 12 ? istStart(y + 1, 1, 1) : istStart(y, m + 1, 1)).toISOString(),
      periodLabel: `${monthNames[m - 1]} ${y}`,
    };
  }

  return {
    type: 'clock',
    timezone: 'Asia/Kolkata',
    now_iso: now.toISOString(),
    today_ist: `${parts.year}-${parts.month}-${parts.day}`,
    current_month: monthNames[mo - 1],
    current_year: y,
    windows: {
      this_month: {
        fromDate: thisMonthStart.toISOString(),
        toDate: nextMonth.toISOString(),
        periodLabel: `This month ${monthNames[mo - 1]} ${y}`,
      },
      last_month: {
        fromDate: lastMonthStart.toISOString(),
        toDate: lastMonthEnd.toISOString(),
        periodLabel: `Last calendar month (${ly}-${String(lmo).padStart(2, '0')})`,
      },
      months: monthWindows,
    },
    note: 'When the user says a month (e.g. August), use windows.months.august fromDate/toDate + periodLabel on analytics tools.',
  };
}

async function calculate_revenue(input = {}) {
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const productId = input.product_id || input.productId || undefined;
  const statuses = normalizeStatuses(input.statuses || input.status);
  const statusLabel = input.statusLabel || input.status_label || null;
  const raw = await executeRevenue({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    productId,
    statuses,
  });
  const cancelled = isCancelledStatuses(statuses);
  return {
    type: 'metric_result',
    metric: cancelled ? 'cancelled_order_value' : 'revenue',
    value: raw.revenue,
    unit: 'INR',
    related: {
      orders: raw.orders,
      unique_customers: raw.unique_customers,
      aov: raw.aov,
    },
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      productId: productId || null,
      statuses,
      statusLabel,
    },
    source: raw.source,
    definition: cancelled
      ? 'Sum of totalPrice on cancelled orders (nominal — not booked revenue).'
      : GLOSSARY.revenue,
    calculationNote: `Matched orders with status ∈ [${(statuses || raw.filters?.statuses || []).join(', ')}]`,
  };
}

async function count_orders(input = {}) {
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const productId = input.product_id || input.productId || undefined;
  const statuses = normalizeStatuses(input.statuses || input.status);
  const statusLabel =
    input.statusLabel || input.status_label || 'completed (non-cancelled)';
  const raw = await executeRevenue({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    productId,
    statuses,
  });
  const cancelled = isCancelledStatuses(statuses);
  return {
    type: 'metric_result',
    metric: 'orders',
    value: raw.orders,
    unit: 'orders',
    related: {
      [cancelled ? 'cancelled_order_value' : 'revenue']: raw.revenue,
      unique_customers: raw.unique_customers,
      aov: raw.aov,
    },
    relatedLabels: {
      [cancelled ? 'cancelled_order_value' : 'revenue']: cancelled
        ? 'Cancelled order value (nominal)'
        : 'Revenue',
    },
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      productId: productId || null,
      statuses: statuses || raw.filters?.statuses,
      statusLabel,
    },
    source: raw.source,
    definition: cancelled
      ? 'Count of cancelled orders in the period (live Mongo orders collection).'
      : `Count of orders with status in ${(statuses || raw.filters?.statuses || []).join(', ') || 'completed'} (live Mongo).`,
    calculationNote: `status filter: ${statusLabel}`,
  };
}

async function get_aov(input = {}) {
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const productId = input.product_id || input.productId || undefined;
  const statuses = normalizeStatuses(input.statuses || input.status);
  const raw = await executeRevenue({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    productId,
    statuses,
  });
  return {
    type: 'metric_result',
    metric: 'aov',
    value: raw.aov,
    unit: 'INR',
    related: {
      revenue: raw.revenue,
      orders: raw.orders,
    },
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      productId: productId || null,
      statuses,
      statusLabel: input.statusLabel || null,
    },
    source: raw.source,
    definition: GLOSSARY.aov,
  };
}

function normalizeStatuses(raw) {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    if (raw.includes(',')) return raw.split(',').map((s) => s.trim()).filter(Boolean);
    return [raw];
  }
  return undefined;
}

function isCancelledStatuses(statuses) {
  if (!statuses?.length) return false;
  return statuses.every((s) => /cancel/i.test(String(s)));
}

async function top_products(input = {}) {
  const days = input.days != null ? clampDays(input.days, 90) : 90;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const limit = clampLimit(input.limit ?? 25);
  const raw = await executeTopProducts({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    limit,
  });
  return {
    type: 'list_result',
    metric: 'top_products',
    products: raw.products,
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      limit,
    },
    source: raw.source,
  };
}

async function inactive_customers(input = {}) {
  const daysInactive = clampDays(input.days_inactive ?? input.daysInactive ?? 60, 60);
  const daysLookback = clampDays(input.days_lookback ?? input.daysLookback ?? 365, 365);
  const minSpend = Number(input.min_spend ?? input.minSpend ?? 0) || 0;
  const limit = clampLimit(input.limit ?? 25, 25);
  const raw = await executeInactiveCustomers({
    daysInactive,
    daysLookback,
    minSpend,
    limit,
  });
  return stripPiiDeep({
    type: 'metric_result',
    metric: 'inactive_customers',
    value: raw.count,
    unit: 'customers',
    customers: (raw.customers || []).map(sanitizeCustomerRow),
    filters: raw.filters,
    source: raw.source,
    definition: GLOSSARY.inactive_customer,
  });
}

async function get_store_info() {
  return {
    type: 'store_info',
    ...STORE_LOCATION,
  };
}

// ── Schema-driven / trained-model tools ─────────────────────────────────────

async function list_schema(_input = {}) {
  const { model } = getToolContext();
  if (!model) {
    return {
      type: 'schema',
      trained: false,
      message:
        'No trained semantic model yet. Ask the user to open Train, paste sample ops data or discover MongoDB, and activate a model. Built-in Picoso tools still work.',
    };
  }
  return {
    type: 'schema',
    trained: true,
    name: model.name,
    source: model.source,
    domain: model.domain,
    entities: model.entities,
    metrics: (model.metrics || []).map((m) => ({
      id: m.id,
      name: m.name,
      aggregation: m.aggregation,
      entity: m.entity,
      field: m.field,
      description: m.description,
    })),
    dimensions: model.dimensions,
    relationships: model.relationships,
    glossary: model.glossary,
    parameters: (model.parameters || []).slice(0, 40),
    textBrainPreview: String(model.textBrain || '').slice(0, 1500),
  };
}

async function inspect_brain(_input = {}) {
  const { model } = getToolContext();
  if (!model) {
    return { type: 'error', error: 'No trained brain active.' };
  }
  const corpus = await getCorpusForModel(model);
  return {
    type: 'brain',
    name: model.name,
    source: model.source,
    domain: model.domain,
    mode: 'live_first',
    jsonSchema: model.jsonSchema || corpus?.jsonSchema || null,
    textBrain: model.textBrain || corpus?.textBrain || '',
    parameters: model.parameters || corpus?.parameters || [],
    liveFieldMap: model.liveFieldMap || null,
    queryPlan: model.queryPlan || null,
    recordCount: corpus?.recordCount || corpus?.records?.length || 0,
    sampleRecords: (corpus?.records || []).slice(0, 5).map((r) => {
      const { rawPreview, _source, _confidence, ...rest } = r || {};
      return rest;
    }),
    note: 'Samples teach structure. Ops numbers come from live Mongo tools.',
  };
}

async function query_trained_samples(input = {}) {
  const { model } = getToolContext();
  if (!model) return { type: 'error', error: 'No trained model' };
  const corpus = await getCorpusForModel(model);
  if (!corpus?.records?.length) {
    return {
      type: 'error',
      error:
        'No paste corpus on this brain. Train from unstructured data, or use Mongo metrics.',
    };
  }

  const aggregation = input.aggregation || 'count';
  const q = queryTrainedRecords(corpus.records, {
    aggregation,
    field: input.field || 'grandTotal',
    status: input.status,
    paymentMethod: input.payment_method || input.paymentMethod,
    minTotal: input.min_total,
    maxTotal: input.max_total,
    minDistanceM: input.min_distance_m,
    maxDistanceM: input.max_distance_m,
    includeRows: Boolean(input.include_rows),
  });

  const display =
    q.unit === 'INR' && typeof q.value === 'number'
      ? `₹${Math.round(q.value).toLocaleString('en-IN')}`
      : typeof q.value === 'object'
        ? JSON.stringify(q.value)
        : String(q.value);

  return {
    type: 'metric',
    source: 'trained_samples',
    aggregation,
    value: q.value,
    display,
    unit: q.unit === 'INR' ? 'INR' : undefined,
    sampleSize: corpus.recordCount || corpus.records.length,
    rows: q.rows
      ? q.rows.slice(0, 20).map((r) => ({
          orderId: r.orderId,
          status: r.status,
          grandTotal: r.grandTotal,
          customerName: r.customerName,
          distanceMeters: r.distanceMeters,
          items: r.items?.map((i) => i.name),
        }))
      : undefined,
    calculationSteps: [
      `Queried ${corpus.recordCount || corpus.records.length} trained records (paste corpus)`,
      `aggregation=${aggregation}`,
      `result=${display}`,
    ],
    confidence: { overall: 0.92 },
  };
}

async function list_metrics() {
  const { model } = getToolContext();
  if (!model) {
    return {
      type: 'list',
      trained: false,
      metrics: [
        'revenue',
        'orders',
        'aov',
        'unique product buyers',
        'repeat customers',
        'inactive customers',
        'top products',
      ],
    };
  }
  return {
    type: 'list',
    trained: true,
    metrics: model.metrics || [],
  };
}

async function run_metric(input = {}) {
  const { workspaceId, model } = getToolContext();
  if (!model || !workspaceId) {
    return {
      type: 'error',
      error: 'No active trained model. Use built-in tools or train first.',
    };
  }
  const metricId = input.metric_id || input.metricId || input.id;
  if (!metricId) return { type: 'error', error: 'metric_id required' };

  // Paste-trained corpus metrics only (sample QA). Live ops metrics use Mongo tools.
  if (String(metricId).startsWith('trained_')) {
    return runTrainedSampleMetric(model, metricId, {
      status: input.status,
      aggregation: input.aggregation,
      field: input.field,
    });
  }

  // Live commerce metrics → deterministic Mongo tools (not paste corpus)
  if (metricId === 'revenue') return calculate_revenue(input);
  if (metricId === 'orders' || metricId === 'order_count' || metricId === 'count_orders') {
    return count_orders(input);
  }
  if (metricId === 'aov') return get_aov(input);

  // If entity is trained samples corpus only
  const metricDef = (model.metrics || []).find((m) => m.id === metricId);
  if (
    metricDef &&
    String(metricDef.entity || '').includes('__trained')
  ) {
    return runTrainedSampleMetric(model, metricId, {
      status: input.status,
      aggregation: input.aggregation || metricDef.aggregation,
      field: input.field || metricDef.field,
    });
  }

  return executeModelMetric(workspaceId, model, metricId, {
    fromDate: input.fromDate || input.from_date,
    toDate: input.toDate || input.to_date,
    dateField: input.date_field || input.dateField || 'createdAt',
    groupBy: input.group_by || input.groupBy,
    filters: input.filters || [],
  });
}

async function semantic_query(input = {}) {
  const { workspaceId, model } = getToolContext();
  if (!workspaceId) return { type: 'error', error: 'No workspace' };
  return executeSemanticQuery(
    workspaceId,
    {
      collection: input.collection || input.entity,
      aggregation: input.aggregation || 'count',
      field: input.field,
      filters: input.filters || [],
      fromDate: input.fromDate || input.from_date,
      toDate: input.toDate || input.to_date,
      dateField: input.date_field || input.dateField || 'createdAt',
      groupBy: input.group_by || input.groupBy,
      limit: input.limit,
      metricId: input.metric_id,
    },
    model
  );
}

async function sample_collection(input = {}) {
  const { workspaceId } = getToolContext();
  const collection = input.collection;
  if (!collection) return { type: 'error', error: 'collection required' };
  const rows = await sampleCollection(
    workspaceId,
    collection,
    Math.min(Number(input.limit) || 5, 10)
  );
  return { type: 'sample', collection, rows };
}

/** Tool definitions for Cohere */
export const TOOL_DEFINITIONS = [
  {
    name: 'list_schema',
    description:
      'List the trained business brain: entities, metrics, dimensions, glossary, parameters. Call first for open-ended questions when a model is trained.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'inspect_brain',
    description:
      'Return full trained brain: JSON schema, text description, parameters, and sample normalized records from paste training.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'query_trained_samples',
    description:
      'Analytics over paste-trained records (not full Mongo unless also discovered). Use for status mix, AOV, revenue, distance filters on trained samples.',
    parameters: {
      type: 'object',
      properties: {
        aggregation: {
          type: 'string',
          description: 'count | sum | avg | min | max | group_by_status',
        },
        field: { type: 'string', description: 'default grandTotal' },
        status: { type: 'string' },
        payment_method: { type: 'string' },
        min_total: { type: 'number' },
        max_total: { type: 'number' },
        min_distance_m: { type: 'number' },
        max_distance_m: { type: 'number' },
        include_rows: { type: 'boolean' },
      },
      required: [],
    },
  },
  {
    name: 'list_metrics',
    description: 'List available named metrics (trained model and/or built-ins).',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'run_metric',
    description:
      'Run a named metric from the trained semantic model by metric_id (e.g. trained_revenue, revenue, orders).',
    parameters: {
      type: 'object',
      properties: {
        metric_id: { type: 'string' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        group_by: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['metric_id'],
    },
  },
  {
    name: 'semantic_query',
    description:
      'Flexible analytics: count/sum/avg on any trained collection + field. Prefer run_metric when a named metric exists.',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        aggregation: {
          type: 'string',
          description: 'count | count_distinct | sum | avg | min | max',
        },
        field: { type: 'string' },
        group_by: { type: 'string' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        date_field: { type: 'string' },
        filters: {
          type: 'array',
          description: '[{ field, op, value }] op: eq|in|gte|lte|regex',
        },
      },
      required: ['collection', 'aggregation'],
    },
  },
  {
    name: 'sample_collection',
    description: 'Return a few sample documents from a collection (for exploration).',
    parameters: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['collection'],
    },
  },
  {
    name: 'resolve_product',
    description:
      'Resolve a product name (e.g. Paneer Tikka Rice) to a product_id. Call this before product analytics on food menus.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Product name from user query' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_store_info',
    description: 'Get Picoso store coordinates and locale used for geo radius queries.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'find_customers_within_radius',
    description:
      'Count unique customers who ordered within a km radius of the store (uses delivery coordinates).',
    parameters: {
      type: 'object',
      properties: {
        radius_km: { type: 'number', description: 'Radius in kilometers (default 2)' },
        days: { type: 'number', description: 'Lookback days (default 90)' },
        limit: { type: 'number', description: 'Max customer samples to return' },
      },
      required: [],
    },
  },
  {
    name: 'count_unique_product_buyers',
    description:
      'Count unique customers who bought a product (Picoso food ops). USE after resolve_product for geo+product questions.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        product_name: { type: 'string' },
        days: { type: 'number' },
        radius_km: { type: 'number' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'get_repeat_customers',
    description:
      'Repeat / frequent buyers. Use min_orders (default 2). preferred_metric: "repeat_rate" or "repeat_customers". Supports fromDate/toDate/statuses.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        days: { type: 'number' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        radius_km: { type: 'number' },
        min_orders: { type: 'number', description: 'Minimum completed orders (default 2)' },
        preferred_metric: {
          type: 'string',
          description: 'repeat_rate | repeat_customers',
        },
        statuses: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'query_customers',
    description:
      'Flexible customer segment by order frequency. Use for “customers ordered more than 5 times”, “exactly 1 order”, etc. Pass min_orders/max_orders + dates.',
    parameters: {
      type: 'object',
      properties: {
        min_orders: { type: 'number' },
        max_orders: { type: 'number' },
        days: { type: 'number' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        statuses: { type: 'array', items: { type: 'string' } },
        sort_by: { type: 'string', description: 'orderCount | spend' },
        limit: { type: 'number' },
      },
      required: ['min_orders'],
    },
  },
  {
    name: 'get_clock_context',
    description:
      'Get timezone, today’s date, and precomputed month windows (January…December) so you can pass exact fromDate/toDate for “August orders”, last month, etc.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'calculate_revenue',
    description:
      'Sum totalPrice (INR) for orders. Pass statuses/fromDate/toDate/periodLabel. Default completed non-cancelled.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        product_id: { type: 'string' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        statuses: { type: 'array', items: { type: 'string' } },
        statusLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'count_orders',
    description:
      'Count orders. Pass statuses e.g. ["delivered"] or ["cancelled"], fromDate/toDate/periodLabel from get_clock_context for named months.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        product_id: { type: 'string' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        statuses: {
          type: 'array',
          items: { type: 'string' },
        },
        statusLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_aov',
    description: 'Average order value. Supports fromDate/toDate/statuses.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        product_id: { type: 'string' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        statuses: { type: 'array', items: { type: 'string' } },
      },
      required: [],
    },
  },
  {
    name: 'top_products',
    description:
      'Rank / list items sold by units. Use for “rank all items sold”, bestsellers, top products. increase limit for full ranking.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        limit: { type: 'number', description: 'How many products (default 10, max 50)' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'inactive_customers',
    description:
      'Customers whose last completed order is older than days_inactive (default 60).',
    parameters: {
      type: 'object',
      properties: {
        days_inactive: { type: 'number' },
        days_lookback: { type: 'number' },
        min_spend: { type: 'number' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
];

const EXECUTORS = {
  list_schema,
  inspect_brain,
  query_trained_samples,
  list_metrics,
  run_metric,
  semantic_query,
  sample_collection,
  resolve_product,
  get_store_info,
  find_customers_within_radius,
  count_unique_product_buyers,
  get_repeat_customers,
  query_customers,
  get_clock_context,
  calculate_revenue,
  count_orders,
  get_aov,
  top_products,
  inactive_customers,
};

export function getCohereToolDefs() {
  return TOOL_DEFINITIONS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

/**
 * Execute a named tool. Returns { status, result, durationMs }.
 */
export async function executeTool(name, rawInput = {}) {
  const start = Date.now();
  const fn = EXECUTORS[name];
  if (!fn) {
    return {
      status: 'error',
      result: { type: 'error', error: `Unknown tool: ${name}` },
      durationMs: Date.now() - start,
    };
  }
  try {
    const input = typeof rawInput === 'string' ? JSON.parse(rawInput || '{}') : rawInput || {};
    const result = await fn(input);
    return {
      status: result?.type === 'error' ? 'error' : 'success',
      result,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: 'error',
      result: { type: 'error', error: err.message || 'Tool failed' },
      durationMs: Date.now() - start,
    };
  }
}
