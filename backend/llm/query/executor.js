import { Order } from '../../models/Model.js';
import { withTimeout } from './validator.js';
import { haversineKm, storeCoords } from '../geo.js';
import {
  compileProductBuyerPipeline,
  compileRevenuePipeline,
  compileTopProductsPipeline,
} from './compiler.js';
import { COMPLETED_ORDER_STATUSES } from '../semantic/picosoModel.js';
import mongoose from 'mongoose';

const QUERY_TIMEOUT_MS = Number(process.env.LLM_QUERY_TIMEOUT_MS || 20000);

export async function runAggregation(pipeline, { timeoutMs = QUERY_TIMEOUT_MS } = {}) {
  return withTimeout(
    Order.aggregate(pipeline).allowDiskUse(true).exec(),
    timeoutMs,
    'mongo aggregate'
  );
}

/**
 * Unique product buyers, optional geographic filter post bbox.
 * productId optional — if omitted, all completed order customers.
 */
export async function executeProductBuyers({
  productId = null,
  days = 90,
  radiusKm = null,
  center = null,
  listLimit = 0,
} = {}) {
  const { pipeline, geoMeta } = compileProductBuyerPipeline({
    productId: productId || undefined,
    days,
    radiusKm,
    center,
    requireGeo: radiusKm != null,
    limitCustomers: 0,
  });

  const rows = await runAggregation(pipeline);
  const c = storeCoords(center || geoMeta?.center);

  let customers = rows.map((r) => {
    const lat = r.sampleLat;
    const lng = r.sampleLng;
    const distanceKm =
      lat != null && lng != null ? haversineKm(c.lat, c.lng, lat, lng) : null;
    return {
      customerId: r._id,
      orderCount: r.orderCount,
      revenue: r.revenue,
      lastOrderAt: r.lastOrderAt,
      lat,
      lng,
      name: r.sampleName,
      phone: r.samplePhone,
      distanceKm: distanceKm != null ? Math.round(distanceKm * 1000) / 1000 : null,
    };
  });

  if (radiusKm != null) {
    const max = Number(radiusKm);
    customers = customers.filter(
      (cu) => cu.distanceKm != null && cu.distanceKm <= max
    );
  }

  const uniqueCustomers = customers.length;
  const orders = customers.reduce((s, cu) => s + cu.orderCount, 0);
  const revenue = customers.reduce((s, cu) => s + (cu.revenue || 0), 0);
  const repeatCustomers = customers.filter((cu) => cu.orderCount >= 2).length;
  const repeatRate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

  const sample =
    listLimit > 0
      ? customers
          .slice()
          .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
          .slice(0, listLimit)
      : [];

  return {
    uniqueCustomers,
    orders,
    revenue: Math.round(revenue * 100) / 100,
    repeatCustomers,
    repeatRate: Math.round(repeatRate * 10000) / 10000,
    customers: sample,
    filters: {
      productId: productId || null,
      days,
      radiusKm: radiusKm != null ? Number(radiusKm) : null,
      center: c,
    },
    source: { dataset: 'orders', freshness: 'live' },
  };
}

export async function executeRevenue(filters = {}) {
  const pipeline = compileRevenuePipeline(filters);
  const [row] = await runAggregation(pipeline);
  return {
    orders: row?.orders || 0,
    revenue: Math.round((row?.revenue || 0) * 100) / 100,
    unique_customers: row?.unique_customers || 0,
    aov: Math.round((row?.aov || 0) * 100) / 100,
    filters,
    source: { dataset: 'orders', freshness: 'live' },
  };
}

export async function executeTopProducts(filters = {}) {
  const pipeline = compileTopProductsPipeline(filters);
  const rows = await runAggregation(pipeline);
  return {
    products: rows.map((r) => ({
      ...r,
      revenue: Math.round((r.revenue || 0) * 100) / 100,
    })),
    filters,
    source: { dataset: 'orders', freshness: 'live' },
  };
}

export async function executeInactiveCustomers({
  daysInactive = 60,
  daysLookback = 365,
  minSpend = 0,
  limit = 50,
} = {}) {
  const since = new Date(Date.now() - daysLookback * 24 * 60 * 60 * 1000);
  const cutoff = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

  const pipeline = [
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
        spend: { $sum: '$totalPrice' },
        lastOrderAt: { $max: '$createdAt' },
        name: { $last: '$customerName' },
        phone: { $last: '$phone' },
      },
    },
    {
      $match: {
        lastOrderAt: { $lte: cutoff },
        spend: { $gte: Number(minSpend) || 0 },
      },
    },
    { $sort: { spend: -1 } },
    { $limit: Math.min(Number(limit) || 50, 500) },
  ];

  const rows = await runAggregation(pipeline);
  return {
    count: rows.length,
    customers: rows.map((r) => ({
      customerId: r._id,
      orders: r.orderCount,
      spend: Math.round((r.spend || 0) * 100) / 100,
      lastOrderAt: r.lastOrderAt,
      name: r.name,
      phone: r.phone,
    })),
    filters: { daysInactive, daysLookback, minSpend },
    source: { dataset: 'orders', freshness: 'live' },
  };
}

export async function executeCustomersInRadius({
  radiusKm = 2,
  days = 90,
  limit = 100,
} = {}) {
  const max = Number(radiusKm);
  const result = await executeProductBuyers({
    productId: null,
    days,
    radiusKm: max,
    listLimit: limit,
  });
  return {
    uniqueCustomers: result.uniqueCustomers,
    orders: result.orders,
    revenue: result.revenue,
    customers: result.customers,
    filters: { radiusKm: max, days, center: result.filters.center },
    source: result.source,
  };
}

export async function executeOrderCountForProduct(productId, days = 90) {
  if (!productId) return 0;
  const count = await Order.countDocuments({
    status: { $in: COMPLETED_ORDER_STATUSES },
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    'items.bowlId': new mongoose.Types.ObjectId(String(productId)),
  });
  return count;
}
