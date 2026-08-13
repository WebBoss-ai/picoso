import mongoose from 'mongoose';
import { Bowl } from '../../models/Model.js';
import {
  executeProductBuyers,
  executeRevenue,
  executeTopProducts,
  executeInactiveCustomers,
  executeCustomersInRadius,
  executeOrdersInRadius,
  executeOrderCountForProduct,
  executeReferralStats,
  executeAgentStats,
  executeCampaignStats,
  executePlatinumStats,
  executeSubscriptionStats,
  executeFeedbackStats,
  executeExpansionStats,
} from '../query/executor.js';
import { clampDays, clampLimit, clampRadiusKm } from '../query/validator.js';
import { stripPiiDeep, sanitizeCustomerRow } from '../pii.js';
import { STORE_LOCATION, GLOSSARY } from '../semantic/picosoModel.js';
import { getToolContext } from './context.js';
import {
  executeSemanticQuery,
  executeModelMetric,
  sampleCollection,
  executePipeline,
  getSchemaForPrompt,
  getAllClustersSchema,
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
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const days =
    fromDate || toDate
      ? null
      : clampDays(input.days ?? 90, 90);
  const limit = clampLimit(input.limit ?? 100, 100);
  const raw = await executeCustomersInRadius({
    radiusKm,
    days,
    fromDate,
    toDate,
    limit,
  });
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
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      center: STORE_LOCATION,
    },
    source: raw.source,
    definition: GLOSSARY.distance_from_store,
    calculationNote: periodLabel
      ? `Unique customers with delivery within ${radiusKm} km · ${periodLabel}`
      : `Unique customers with delivery within ${radiusKm} km`,
  });
}

async function count_orders_in_radius(input = {}) {
  const radiusKm = clampRadiusKm(input.radius_km ?? input.radiusKm ?? 2, 2);
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const days =
    fromDate || toDate
      ? null
      : clampDays(input.days ?? 90, 90);
  const statuses = normalizeStatuses(input.statuses || input.status);
  const statusLabel =
    input.statusLabel || input.status_label || 'completed (non-cancelled)';
  const preferMetric =
    input.prefer_metric || input.preferMetric || input.preferred_metric || 'orders';

  const raw = await executeOrdersInRadius({
    radiusKm,
    days,
    fromDate,
    toDate,
    statuses,
    periodLabel,
  });

  const cancelled = isCancelledStatuses(statuses);
  const primaryMetric = preferMetric === 'revenue' ? 'revenue' : 'orders';
  const primaryValue = primaryMetric === 'revenue' ? raw.revenue : raw.orders;

  return {
    type: 'metric_result',
    metric: primaryMetric,
    preferMetric: primaryMetric,
    value: primaryValue,
    unit: primaryMetric === 'revenue' ? 'INR' : 'orders',
    related: {
      [primaryMetric === 'revenue' ? 'orders' : cancelled ? 'cancelled_order_value' : 'revenue']:
        primaryMetric === 'revenue' ? raw.orders : raw.revenue,
      unique_customers: raw.uniqueCustomers,
      aov: raw.aov,
    },
    relatedLabels: {
      revenue: cancelled ? 'Cancelled order value (nominal)' : 'Revenue',
      unique_customers: 'Unique customers',
      aov: 'AOV',
      orders: 'Orders',
    },
    filters: {
      radiusKm,
      days: fromDate || toDate ? null : days,
      fromDate,
      toDate,
      periodLabel,
      statuses: statuses || raw.filters?.statuses,
      statusLabel,
      center: STORE_LOCATION,
    },
    source: raw.source,
    definition:
      primaryMetric === 'revenue'
        ? `Sum of totalPrice for orders delivered within ${radiusKm} km of store (${statusLabel}).`
        : `Count of orders with deliveryAddress within ${radiusKm} km of store (${statusLabel}).`,
    calculationNote: [
      periodLabel ? `Period: ${periodLabel}` : days != null ? `Period: last ${days} days` : null,
      `Radius ${radiusKm} km · haversine on deliveryAddress.lat/lng`,
      `Status: ${statusLabel}`,
      `BBox candidates ${raw.candidatesInBbox ?? '—'} → in-radius ${raw.orders}`,
    ]
      .filter(Boolean)
      .join(' · '),
  };
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
  const listLimit = clampLimit(input.limit ?? 100, 100);

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
  const { Order, User } = await import('../../models/Model.js');
  const { COMPLETED_ORDER_STATUSES } = await import('../semantic/picosoModel.js');
  const { haversineKm, storeCoords } = await import('../geo.js');
  const minOrders = Math.max(1, Number(input.min_orders ?? input.minOrders ?? 1) || 1);
  const maxOrders =
    input.max_orders != null || input.maxOrders != null
      ? Number(input.max_orders ?? input.maxOrders)
      : null;
  const allTime =
    input.all_time === true ||
    input.allTime === true ||
    (input.days == null &&
      !input.fromDate &&
      !input.from_date &&
      !input.toDate &&
      !input.to_date);
  const days =
    !allTime && input.days != null ? clampDays(input.days, 90) : allTime ? null : 90;
  const fromDate = allTime ? null : input.fromDate || input.from_date || null;
  const toDate = allTime ? null : input.toDate || input.to_date || null;
  const statuses = normalizeStatuses(input.statuses || input.status) || COMPLETED_ORDER_STATUSES;
  const limit = clampLimit(input.limit ?? 200, 200);
  const sortBy = String(input.sort_by || input.sortBy || 'orderCount');
  const periodLabel =
    input.periodLabel ||
    input.period_label ||
    (allTime ? 'All time' : days != null ? `Last ${days} days` : null);
  const center = storeCoords();

  const match = { status: { $in: statuses } };
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  } else if (days != null) {
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
        lat: { $last: '$deliveryAddress.lat' },
        lng: { $last: '$deliveryAddress.lng' },
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

  const ids = rows
    .map((r) => r._id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));
  const users = ids.length
    ? await User.find({ _id: { $in: ids } })
        .select('_id name phone email location.coordinates savedAddresses')
        .lean()
        .catch(() => [])
    : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const customers = rows.map((r) => {
    const u = byId.get(String(r._id));
    let lat = r.lat != null ? Number(r.lat) : null;
    let lng = r.lng != null ? Number(r.lng) : null;
    if ((lat == null || lng == null) && u) {
      lat = u.location?.coordinates?.lat ?? lat;
      lng = u.location?.coordinates?.lng ?? lng;
      if (lat == null || lng == null) {
        const addr =
          (u.savedAddresses || []).find((a) => a.isDefault && a.lat != null) ||
          (u.savedAddresses || []).find((a) => a.lat != null);
        if (addr) {
          lat = addr.lat;
          lng = addr.lng;
        }
      }
    }
    let distanceKm = null;
    if (lat != null && lng != null) {
      distanceKm = haversineKm(center.lat, center.lng, lat, lng);
      if (distanceKm != null) distanceKm = Math.round(distanceKm * 1000) / 1000;
    }
    return sanitizeCustomerRow({
      customerId: r._id,
      orders: r.orderCount,
      spend: r.revenue,
      name: r.name || u?.name || '',
      phone: r.phone || u?.phone || null,
      email: u?.email || null,
      distanceKm,
      lat,
      lng,
    });
  });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'segment_customers',
    value: count,
    unit: 'customers',
    preferMetric: 'segment_customers',
    related: {
      min_orders: minOrders,
      max_orders: maxOrders,
      sample_size: customers.length,
    },
    relatedLabels: {
      min_orders: 'Min orders',
      sample_size: 'Rows returned',
    },
    customers,
    filters: {
      days,
      fromDate,
      toDate,
      periodLabel,
      min_orders: minOrders,
      max_orders: maxOrders,
      statuses,
      statusLabel: 'completed (non-cancelled)',
      allTime: Boolean(allTime && !fromDate && !toDate && days == null),
    },
    source: {
      dataset: 'orders+users',
      freshness: 'live',
      collection: 'orders',
      match: { status: statuses, min_orders: minOrders, max_orders: maxOrders },
    },
    definition: `Live customers with ≥${minOrders} completed orders (${periodLabel || 'window'}). Full name & phone.`,
    calculationNote: `Grouped live orders by userId; filter orderCount ≥ ${minOrders}; returned ${customers.length} rows.`,
  });
}

/**
 * Export unique customers who placed orders in a period — full name, phone, distance.
 * Company ops console: no PII masking.
 */
async function export_order_customers(input = {}) {
  const { Order, User } = await import('../../models/Model.js');
  const { COMPLETED_ORDER_STATUSES } = await import('../semantic/picosoModel.js');
  const { haversineKm, storeCoords } = await import('../geo.js');
  const days = input.days != null ? clampDays(input.days, 90) : null;
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const statuses = normalizeStatuses(input.statuses || input.status) || COMPLETED_ORDER_STATUSES;
  const limit = clampLimit(input.limit ?? 300, 300);
  const center = storeCoords(input.center);
  const includeDistance = input.include_distance !== false && input.includeDistance !== false;

  const match = { status: { $in: statuses } };
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  } else if (days != null) {
    match.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  } else {
    // Default last 30 days if no window
    match.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
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
        lat: { $last: '$deliveryAddress.lat' },
        lng: { $last: '$deliveryAddress.lng' },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  // Enrich from User when missing phone/name/coords
  const ids = rows
    .map((r) => r._id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));
  const users = ids.length
    ? await User.find({ _id: { $in: ids } })
        .select('_id name phone email location.coordinates savedAddresses createdAt')
        .lean()
        .catch(() => [])
    : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const customers = rows.map((r) => {
    const u = byId.get(String(r._id));
    let lat = r.lat != null ? Number(r.lat) : null;
    let lng = r.lng != null ? Number(r.lng) : null;
    if ((lat == null || lng == null) && u) {
      lat = u.location?.coordinates?.lat ?? lat;
      lng = u.location?.coordinates?.lng ?? lng;
      if (lat == null || lng == null) {
        const addr =
          (u.savedAddresses || []).find((a) => a.isDefault && a.lat != null) ||
          (u.savedAddresses || []).find((a) => a.lat != null && a.lng != null);
        if (addr) {
          lat = addr.lat;
          lng = addr.lng;
        }
      }
    }
    let distanceKm = null;
    if (includeDistance && lat != null && lng != null) {
      distanceKm = haversineKm(center.lat, center.lng, lat, lng);
      if (distanceKm != null) distanceKm = Math.round(distanceKm * 1000) / 1000;
    }
    return sanitizeCustomerRow({
      customerId: r._id,
      name: r.name || u?.name || '',
      phone: r.phone || u?.phone || null,
      email: u?.email || null,
      orders: r.orderCount,
      spend: r.revenue,
      lastOrder: r.lastOrderAt,
      distanceKm,
      lat,
      lng,
    });
  });

  const totalCount = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$userId' } },
    { $count: 'n' },
  ]);
  const unique = totalCount[0]?.n || customers.length;

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'export_customers',
    value: unique,
    unit: 'customers',
    preferMetric: 'export_customers',
    related: {
      rows_returned: customers.length,
      total_unique: unique,
    },
    relatedLabels: {
      rows_returned: 'Rows in export',
      total_unique: 'Unique customers in window',
    },
    customers,
    filters: {
      days: fromDate || toDate ? null : days || 30,
      fromDate,
      toDate,
      periodLabel: periodLabel || (days ? `Last ${days} days` : 'Last 30 days'),
      statuses,
      statusLabel: 'completed (non-cancelled)',
      include_distance: includeDistance,
      export: true,
    },
    source: {
      dataset: 'orders+users',
      freshness: 'live',
      collection: 'orders',
      match: { status: statuses },
    },
    definition:
      'Unique customers (userId) who placed completed orders in the window, with full name/phone and haversine distance from store when coords exist.',
    calculationNote: `Exported ${customers.length} of ${unique} unique customers (ops console — full contact fields).`,
  });
}

async function count_registered_users(input = {}) {
  const { User } = await import('../../models/Model.js');
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const match = {};
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  }
  // Prefer role user / all docs
  const total = await User.countDocuments(match);
  const withRoleUser = await User.countDocuments({
    ...match,
    $or: [{ role: 'user' }, { role: { $exists: false } }, { role: null }],
  }).catch(() => total);

  return {
    type: 'metric_result',
    metric: 'registered_users',
    value: total,
    unit: 'customers',
    preferMetric: 'registered_users',
    related: {
      role_user_est: withRoleUser,
    },
    relatedLabels: {
      role_user_est: 'Approx non-admin users',
    },
    filters: {
      fromDate,
      toDate,
      periodLabel: input.periodLabel || input.period_label || 'All time',
      collection: 'users',
    },
    source: {
      dataset: 'users',
      freshness: 'live',
      collection: 'users',
    },
    definition: 'Count of documents in the live users collection (platform registrations).',
    calculationNote: `User.countDocuments() → ${total}`,
  };
}

async function list_registered_users(input = {}) {
  const { User } = await import('../../models/Model.js');
  const { haversineKm, storeCoords } = await import('../geo.js');
  const limit = clampLimit(input.limit ?? 200, 200);
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const center = storeCoords();
  const match = {};
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  }
  const rows = await User.find(match)
    .select('_id name phone email location.coordinates savedAddresses createdAt role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const total = await User.countDocuments(match);
  const customers = rows.map((u) => {
    let lat = u.location?.coordinates?.lat;
    let lng = u.location?.coordinates?.lng;
    if (lat == null || lng == null) {
      const addr =
        (u.savedAddresses || []).find((a) => a.isDefault && a.lat != null) ||
        (u.savedAddresses || []).find((a) => a.lat != null);
      if (addr) {
        lat = addr.lat;
        lng = addr.lng;
      }
    }
    let distanceKm = null;
    if (lat != null && lng != null) {
      distanceKm = haversineKm(center.lat, center.lng, lat, lng);
      if (distanceKm != null) distanceKm = Math.round(distanceKm * 1000) / 1000;
    }
    return sanitizeCustomerRow({
      customerId: u._id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      lastOrder: u.createdAt,
      distanceKm,
      lat,
      lng,
    });
  });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'registered_users',
    value: total,
    unit: 'customers',
    preferMetric: 'registered_users',
    related: { rows_returned: customers.length },
    customers,
    filters: {
      fromDate,
      toDate,
      periodLabel: input.periodLabel || 'All time',
      collection: 'users',
      limit,
    },
    source: { dataset: 'users', freshness: 'live', collection: 'users' },
    definition: 'Registered platform users from live users collection (name, phone, distance when available).',
    calculationNote: `Listed ${customers.length} of ${total} users.`,
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
  const limit = clampLimit(input.limit ?? 100, 100);
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

// ── Referral / Agent / Campaign / Platinum / Subscription / Feedback ─────────

async function get_referral_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || input.period_label || null;
  const listLimit = clampLimit(input.limit ?? 50, 50);
  const raw = await executeReferralStats({ fromDate, toDate, listLimit });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'referral_stats',
    preferMetric: 'referral_stats',
    value: raw.totalJoined,
    unit: 'users',
    related: {
      referrers: raw.totalReferrers,
      ordered: raw.totalOrdered,
      rewards_earned: raw.totalRewards,
      agent_referred: raw.agentReferredUsers,
      pending_requests: raw.pendingRequests,
    },
    relatedLabels: {
      referrers: 'Active referrers',
      ordered: 'Joined & placed order',
      rewards_earned: 'Rewards earned',
      agent_referred: 'Joined via agent link',
      pending_requests: 'Pending referral requests',
    },
    customers: (raw.referrers || []).map((r) => ({
      name: r.referrerName,
      phone: r.referrerPhone,
      orders: r.ordered,
      spend: r.rewards,
      distanceKm: null,
      code: r.code,
      joined: r.joined,
      status: r.status,
    })),
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition:
      'Friends who joined the platform via a unique referral link (FriendReferral.referredFriends) or agent referral link (User.referredByAgent).',
    calculationNote: `${raw.totalJoined} users joined · ${raw.totalOrdered} placed first order · ${raw.totalRewards} rewards earned · conversion ${Math.round((raw.conversionRate || 0) * 100)}%`,
  });
}

async function get_agent_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || null;
  const listLimit = clampLimit(input.limit ?? 30, 30);
  const raw = await executeAgentStats({ fromDate, toDate, listLimit });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'agent_stats',
    preferMetric: 'agent_stats',
    value: raw.totalAgents,
    unit: 'agents',
    related: {
      active_agents: raw.activeAgents,
      total_orders: raw.totalOrders,
      total_leads: raw.totalLeads,
      total_earnings: raw.totalEarnings,
    },
    relatedLabels: {
      active_agents: 'Active agents',
      total_orders: 'Orders via agents',
      total_leads: 'Leads generated',
      total_earnings: 'Total commissions paid (₹)',
    },
    customers: (raw.agents || []).map((a) => ({
      name: a.name,
      phone: a.phone,
      orders: a.orders,
      spend: a.earnings,
      distanceKm: null,
      code: a.code,
      leads: a.leads,
      wallet: a.wallet,
    })),
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition: 'Agent network performance: registrations, leads, orders attributed, commissions.',
    calculationNote: `${raw.activeAgents}/${raw.totalAgents} agents active · ₹${raw.totalEarnings} total commissions`,
  });
}

async function get_campaign_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || null;
  const listLimit = clampLimit(input.limit ?? 20, 20);
  const raw = await executeCampaignStats({ fromDate, toDate, listLimit });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'campaign_stats',
    preferMetric: 'campaign_stats',
    value: raw.totalLeads,
    unit: 'leads',
    related: {
      campaigns: raw.totalCampaigns,
      active_campaigns: raw.activeCampaigns,
      redemptions: raw.totalRedemptions,
      budget_used: raw.totalRedeemed,
    },
    relatedLabels: {
      campaigns: 'Total campaigns',
      active_campaigns: 'Active campaigns',
      redemptions: 'Orders with campaign discount',
      budget_used: 'Free items redeemed',
    },
    customers: (raw.campaigns || []).map((c) => ({
      name: c.name,
      phone: '',
      orders: c.redeemed,
      spend: 0,
      distanceKm: null,
      code: c.code,
      benefit: c.benefit,
      freeItem: c.freeItem,
      budget: c.budget,
      active: c.active,
    })),
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition: 'Marketing campaign performance: leads registered, discounts redeemed, free items given.',
    calculationNote: `${raw.activeCampaigns} active campaigns · ${raw.totalLeads} leads · ${raw.totalRedemptions} redemptions`,
  });
}

async function get_platinum_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || null;
  const raw = await executePlatinumStats({ fromDate, toDate });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'platinum_stats',
    preferMetric: 'platinum_stats',
    value: raw.activeCards,
    unit: 'members',
    related: {
      total_issued: raw.totalCards,
      new_in_period: raw.newInPeriod,
      monthly_revenue: raw.estimatedMonthlyRevenue,
    },
    relatedLabels: {
      total_issued: 'Total platinum cards issued',
      new_in_period: 'New in period',
      monthly_revenue: 'Est. monthly revenue (₹299/member)',
    },
    customers: (raw.recentMembers || []).map((m) => ({
      name: m.name,
      phone: m.phone,
      orders: null,
      spend: m.fee,
      distanceKm: null,
      active: m.active,
      startDate: m.startDate,
    })),
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition: 'Platinum card holders: active members, monthly fee (₹299), estimated recurring revenue.',
    calculationNote: `${raw.activeCards} active · ₹${raw.estimatedMonthlyRevenue}/month estimated`,
  });
}

async function get_subscription_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || null;
  const raw = await executeSubscriptionStats({ fromDate, toDate });

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'subscription_stats',
    preferMetric: 'subscription_stats',
    value: raw.activeSubscriptions,
    unit: 'subscriptions',
    related: {
      total: raw.totalSubscriptions,
      pending: raw.pendingSubscriptions,
      paused: raw.pausedSubscriptions,
      cancelled: raw.cancelledSubscriptions,
      weekly_revenue: raw.weeklyRevenueActive,
    },
    relatedLabels: {
      total: 'Total subscriptions',
      pending: 'Pending approval/payment',
      paused: 'Paused',
      cancelled: 'Cancelled',
      weekly_revenue: 'Weekly revenue (active, ₹)',
    },
    customers: (raw.activeMembers || []).map((m) => ({
      name: m.name,
      phone: m.phone,
      orders: m.bowlsPerWeek,
      spend: m.weeklyPrice,
      distanceKm: null,
    })),
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition: 'Healthy subscription plan (meal kit) — bowls per week, weekly price, status breakdown.',
    calculationNote: `${raw.activeSubscriptions} active · ₹${raw.weeklyRevenueActive}/week`,
  });
}

async function get_feedback_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || null;
  const raw = await executeFeedbackStats({ fromDate, toDate });

  return {
    type: 'metric_result',
    metric: 'feedback_stats',
    preferMetric: 'feedback_stats',
    value: raw.totalFeedback,
    unit: 'reviews',
    related: {
      avg_rating: raw.averageRating,
      five_stars: raw.fiveStars,
      four_stars: raw.fourStars,
      low_ratings: raw.oneToThreeStars,
    },
    relatedLabels: {
      avg_rating: 'Average rating',
      five_stars: '5-star reviews',
      four_stars: '4-star reviews',
      low_ratings: '1–3 star reviews',
    },
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition: 'Customer feedback ratings (1–5 stars) submitted via the app.',
    calculationNote: `${raw.totalFeedback} reviews · avg ${raw.averageRating}/5`,
    recent: raw.recent,
  };
}

async function get_expansion_stats(input = {}) {
  const fromDate = input.fromDate || input.from_date || null;
  const toDate = input.toDate || input.to_date || null;
  const periodLabel = input.periodLabel || null;
  const raw = await executeExpansionStats({ fromDate, toDate });

  return {
    type: 'metric_result',
    metric: 'expansion_stats',
    preferMetric: 'expansion_stats',
    value: raw.totalInterest,
    unit: 'requests',
    related: {
      out_of_radius: raw.outOfRadiusAttempts,
      notify_me: raw.notifyMeRequests,
    },
    relatedLabels: {
      out_of_radius: 'Out-of-radius delivery attempts',
      notify_me: '"Notify me" waitlist signups',
    },
    customers: (raw.topRequestedAreas || []).map((a) => ({
      name: a.area || '—',
      phone: '',
      orders: a.count,
      spend: null,
      distanceKm: null,
      city: a.city,
    })),
    filters: { fromDate, toDate, periodLabel },
    source: raw.source,
    definition: 'Demand signals from outside current delivery radius — useful for expansion planning.',
    calculationNote: `${raw.outOfRadiusAttempts} out-of-radius attempts · ${raw.notifyMeRequests} notify-me requests`,
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

/**
 * Universal MongoDB aggregation pipeline runner.
 * The LLM writes the full pipeline based on discovered schema.
 * Pass connection_id to target a specific cluster (from get_live_schema results).
 */
async function execute_pipeline(input = {}) {
  const { workspaceId } = getToolContext();
  if (!workspaceId) return { type: 'error', error: 'No workspace' };

  const { collection, pipeline, connection_id } = input;
  if (!collection) return { type: 'error', error: 'collection is required' };
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    return { type: 'error', error: 'pipeline must be a non-empty array of stage objects' };
  }

  return executePipeline(workspaceId, {
    collection,
    pipeline,
    limit: Number(input.limit) || 200,
    connectionId: connection_id || null,
  });
}

/**
 * Returns live schema for ALL connected clusters:
 * cluster label, connectionId, collection names, document counts, field paths with sample values.
 * ALWAYS call this first for unknown questions. Use connectionId from results in execute_pipeline
 * to target the right cluster. For multi-cluster questions, run execute_pipeline multiple times.
 */
async function get_live_schema(input = {}) {
  const { workspaceId } = getToolContext();
  if (!workspaceId) return { type: 'error', error: 'No workspace' };
  const clusters = await getAllClustersSchema(workspaceId);
  const totalCollections = clusters.reduce((s, c) => s + c.collections.length, 0);
  return {
    type: 'live_schema',
    clusterCount: clusters.length,
    totalCollections,
    clusters,
  };
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
    name: 'get_live_schema',
    description:
      'Returns LIVE schema for ALL connected MongoDB clusters: cluster names, connectionIds, collection names, document counts, field paths with sample values. Call this FIRST for any unknown question, discovery query ("what do you know?", "what data is available?"), or before writing an execute_pipeline call. Also use when user asks about a collection you cannot identify. The schema is always live — no manual training needed.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'execute_pipeline',
    description:
      'Execute ANY MongoDB aggregation pipeline on a connected cluster. Use for any question that cannot be answered by simpler tools: joins ($lookup), nested arrays ($unwind), date grouping, complex filters, percentages, rankings, cross-collection queries, referral/agent/campaign/platinum/subscription/feedback/expansion stats, or ANY custom collection. Always call get_live_schema first to get exact collection names, field paths, and the connectionId. Pass connection_id to target a specific cluster. Do NOT use $out, $merge, or write stages.',
    parameters: {
      type: 'object',
      properties: {
        collection: {
          type: 'string',
          description: 'Exact collection name from get_live_schema',
        },
        pipeline: {
          type: 'array',
          description: 'MongoDB aggregation pipeline array. E.g. [{"$match":{"status":"delivered"}},{"$group":{"_id":null,"total":{"$sum":"$totalPrice"}}}]',
        },
        connection_id: {
          type: 'string',
          description: 'connectionId from get_live_schema to target a specific cluster. Omit to use the default (self) cluster.',
        },
        limit: {
          type: 'number',
          description: 'Max rows to return (default 200, max 500)',
        },
      },
      required: ['collection', 'pipeline'],
    },
  },
  {
    name: 'semantic_query',
    description:
      'Simple analytics shorthand: count/sum/avg on any collection + field with optional date range and group_by. Use execute_pipeline for anything more complex.',
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
      'Count unique customers who ordered within a km radius of the store (uses delivery coordinates). Pass fromDate/toDate for last month / named months.',
    parameters: {
      type: 'object',
      properties: {
        radius_km: { type: 'number', description: 'Radius in kilometers (default 2)' },
        days: { type: 'number', description: 'Lookback days (default 90)' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        limit: { type: 'number', description: 'Max customer samples to return' },
      },
      required: [],
    },
  },
  {
    name: 'count_orders_in_radius',
    description:
      'Count completed orders (or sum revenue) whose delivery pin is within radius_km of the store. REQUIRED when the question mentions km/radius + orders/sales. Pass fromDate/toDate/periodLabel for last month / July.',
    parameters: {
      type: 'object',
      properties: {
        radius_km: { type: 'number', description: 'Radius in kilometers (default 2)' },
        days: { type: 'number' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        statuses: { type: 'array', items: { type: 'string' } },
        statusLabel: { type: 'string' },
        prefer_metric: {
          type: 'string',
          description: 'orders | revenue',
        },
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
      'Flexible customer segment by order frequency. Use for “customers ordered more than 5 times”. For export with phones/distance prefer export_order_customers. min_orders defaults to 1.',
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
      required: [],
    },
  },
  {
    name: 'export_order_customers',
    description:
      'REQUIRED for export/list of customers who ordered in a period. Returns full name, phone, email, distanceKm, order count, spend. Company ops — full contact fields allowed. Use get_clock_context for last month dates first.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        statuses: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number', description: 'Max rows (default 300)' },
        include_distance: { type: 'boolean' },
      },
      required: [],
    },
  },
  {
    name: 'count_registered_users',
    description:
      'Count platform-registered users (User collection). Use for “customers registered on platform”, total users, signups — NOT order unique customers.',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'list_registered_users',
    description:
      'List registered platform users with name, phone, email, distance. Use for export/list of all signups.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_clock_context',
    description:
      'Get timezone, today’s date, last_month + precomputed month windows so you can pass exact fromDate/toDate for “last month” or “August orders”.',
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
  {
    name: 'get_referral_stats',
    description:
      'Users who joined via referral/friend link (FriendReferral) or agent link (User.referredByAgent). Use for "how many users joined through referral", "referral conversions", "who referred the most friends", "referral program performance".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'get_agent_stats',
    description:
      'Agent network analytics: total agents, active agents, leads generated, orders placed via agents, total commissions paid. Use for "agent performance", "how many agents", "top agents", "agent commissions".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'get_campaign_stats',
    description:
      'Marketing campaign performance: leads registered, free-item redemptions, active campaigns. Use for "campaign stats", "how many redeemed free coffee", "which campaigns are active", "campaign leads".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'get_platinum_stats',
    description:
      'Platinum card membership: active members, total issued, estimated monthly recurring revenue (₹299/member). Use for "platinum members", "platinum card holders", "premium subscribers", "membership revenue".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_subscription_stats',
    description:
      'Healthy subscription (meal-kit) plan stats: active/pending/paused/cancelled subscriptions, bowls per week, weekly revenue. Use for "subscription plan", "meal kit subscribers", "healthy plan members", "weekly subscriptions".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_feedback_stats',
    description:
      'Customer ratings and reviews: average rating, 5-star count, low ratings. Use for "ratings", "reviews", "customer feedback", "how many 5 star", "satisfaction".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_expansion_stats',
    description:
      'Demand outside delivery radius: out-of-radius attempts and notify-me waitlist. Use for "expansion", "areas requesting delivery", "out of range customers", "notify me requests", "delivery expansion".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string' },
        toDate: { type: 'string' },
        periodLabel: { type: 'string' },
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
  execute_pipeline,
  get_live_schema,
  semantic_query,
  sample_collection,
  resolve_product,
  get_store_info,
  find_customers_within_radius,
  count_orders_in_radius,
  count_unique_product_buyers,
  get_repeat_customers,
  query_customers,
  export_order_customers,
  count_registered_users,
  list_registered_users,
  get_referral_stats,
  get_agent_stats,
  get_campaign_stats,
  get_platinum_stats,
  get_subscription_stats,
  get_feedback_stats,
  get_expansion_stats,
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
