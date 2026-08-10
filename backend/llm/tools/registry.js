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
  const productId = input.product_id || input.productId;
  if (!productId) {
    return { type: 'error', error: 'product_id is required — call resolve_product first' };
  }
  const days = clampDays(input.days ?? 90, 90);
  const radiusKm =
    input.radius_km != null || input.radiusKm != null
      ? clampRadiusKm(input.radius_km ?? input.radiusKm, 2)
      : null;
  const listLimit = clampLimit(input.limit ?? 15, 15);
  const raw = await executeProductBuyers({
    productId,
    days,
    radiusKm,
    listLimit,
  });
  const totalProductOrders = await executeOrderCountForProduct(productId, days);

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
    },
    customers: (raw.customers || []).map(sanitizeCustomerRow),
    filters: {
      productId: String(productId),
      days,
      radiusKm,
      center: radiusKm != null ? STORE_LOCATION : undefined,
    },
    source: raw.source,
    definitions: {
      customer: GLOSSARY.customer,
      completed_order: GLOSSARY.completed_order,
      repeat_customer: GLOSSARY.repeat_customer,
    },
  });
}

async function get_repeat_customers(input = {}) {
  const productId = input.product_id || input.productId || null;
  const days = clampDays(input.days ?? 90, 90);
  const radiusKm =
    input.radius_km != null || input.radiusKm != null
      ? clampRadiusKm(input.radius_km ?? input.radiusKm, 2)
      : null;

  if (productId) {
    const raw = await executeProductBuyers({ productId, days, radiusKm, listLimit: 20 });
    return stripPiiDeep({
      type: 'metric_result',
      metric: 'repeat_customers',
      value: raw.repeatCustomers,
      unit: 'customers',
      related: {
        unique_customers: raw.uniqueCustomers,
        repeat_rate: raw.repeatRate,
        orders: raw.orders,
        revenue: raw.revenue,
      },
      customers: (raw.customers || [])
        .filter((c) => c.orderCount >= 2)
        .map(sanitizeCustomerRow),
      filters: { productId, days, radiusKm },
      source: raw.source,
      definition: GLOSSARY.repeat_customer,
    });
  }

  // all customers with 2+ orders in period
  const { Order } = await import('../../models/Model.js');
  const { COMPLETED_ORDER_STATUSES } = await import('../semantic/picosoModel.js');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    {
      $match: {
        status: { $in: COMPLETED_ORDER_STATUSES },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
        name: { $last: '$customerName' },
        phone: { $last: '$phone' },
      },
    },
    { $match: { orderCount: { $gte: 2 } } },
    { $sort: { orderCount: -1 } },
    { $limit: 100 },
  ]);

  const uniques = await Order.aggregate([
    {
      $match: {
        status: { $in: COMPLETED_ORDER_STATUSES },
        createdAt: { $gte: since },
      },
    },
    { $group: { _id: '$userId' } },
    { $count: 'n' },
  ]);
  const uniqueCustomers = uniques[0]?.n || 0;
  const repeatCustomers = rows.length;
  const rate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

  return stripPiiDeep({
    type: 'metric_result',
    metric: 'repeat_customers',
    value: repeatCustomers,
    unit: 'customers',
    related: {
      unique_customers: uniqueCustomers,
      repeat_rate: Math.round(rate * 10000) / 10000,
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
    filters: { days },
    source: { dataset: 'orders', freshness: 'live' },
    definition: GLOSSARY.repeat_customer,
  });
}

async function calculate_revenue(input = {}) {
  const days = clampDays(input.days ?? 90, 90);
  const productId = input.product_id || input.productId || undefined;
  const raw = await executeRevenue({ days, productId });
  return {
    type: 'metric_result',
    metric: 'revenue',
    value: raw.revenue,
    unit: 'INR',
    related: {
      orders: raw.orders,
      unique_customers: raw.unique_customers,
      aov: raw.aov,
    },
    filters: { days, productId: productId || null },
    source: raw.source,
    definition: GLOSSARY.revenue,
  };
}

async function count_orders(input = {}) {
  const days = clampDays(input.days ?? 90, 90);
  const productId = input.product_id || input.productId || undefined;
  const raw = await executeRevenue({ days, productId });
  return {
    type: 'metric_result',
    metric: 'orders',
    value: raw.orders,
    unit: 'orders',
    related: {
      revenue: raw.revenue,
      unique_customers: raw.unique_customers,
      aov: raw.aov,
    },
    filters: { days, productId: productId || null },
    source: raw.source,
  };
}

async function get_aov(input = {}) {
  const days = clampDays(input.days ?? 90, 90);
  const productId = input.product_id || input.productId || undefined;
  const raw = await executeRevenue({ days, productId });
  return {
    type: 'metric_result',
    metric: 'aov',
    value: raw.aov,
    unit: 'INR',
    related: {
      revenue: raw.revenue,
      orders: raw.orders,
    },
    filters: { days, productId: productId || null },
    source: raw.source,
    definition: GLOSSARY.aov,
  };
}

async function top_products(input = {}) {
  const days = clampDays(input.days ?? 90, 90);
  const limit = clampLimit(input.limit ?? 10, 10);
  const raw = await executeTopProducts({ days, limit });
  return {
    type: 'list_result',
    metric: 'top_products',
    products: raw.products,
    filters: { days, limit },
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

/** Tool definitions for Cohere */
export const TOOL_DEFINITIONS = [
  {
    name: 'resolve_product',
    description:
      'Resolve a product name (e.g. Paneer Tikka Rice) to a product_id. Call this before product analytics.',
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
      'Count unique customers who bought a specific product. Supports optional geo radius filter. Returns orders, revenue, repeat stats.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Bowl/product id from resolve_product' },
        days: { type: 'number', description: 'Lookback days default 90' },
        radius_km: {
          type: 'number',
          description: 'Optional geo filter: only buyers whose delivery address is within radius_km of store',
        },
        limit: { type: 'number', description: 'Sample customers to return' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_repeat_customers',
    description:
      'Count repeat customers (2+ completed orders). Optional product_id and radius_km.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        days: { type: 'number' },
        radius_km: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'calculate_revenue',
    description: 'Sum revenue (INR totalPrice) for completed orders in period.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        product_id: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'count_orders',
    description: 'Count completed orders in period, optional product filter.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        product_id: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_aov',
    description: 'Average order value for completed orders.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        product_id: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'top_products',
    description: 'Top selling products by units in the period.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number' },
        limit: { type: 'number' },
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
  resolve_product,
  get_store_info: get_store_info,
  find_customers_within_radius,
  count_unique_product_buyers,
  get_repeat_customers,
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
