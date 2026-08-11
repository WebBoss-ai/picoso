import mongoose from 'mongoose';
import { Order, User } from '../../models/Model.js';
import { withTimeout } from './validator.js';
import { haversineKm, storeCoords } from '../geo.js';
import {
  compileProductBuyerPipeline,
  compileRevenuePipeline,
  compileTopProductsPipeline,
} from './compiler.js';
import { COMPLETED_ORDER_STATUSES } from '../semantic/picosoModel.js';

const QUERY_TIMEOUT_MS = Number(process.env.LLM_QUERY_TIMEOUT_MS || 25000);

export async function runAggregation(pipeline, { timeoutMs = QUERY_TIMEOUT_MS } = {}) {
  return withTimeout(
    Order.aggregate(pipeline).allowDiskUse(true).exec(),
    timeoutMs,
    'mongo aggregate'
  );
}

/**
 * Resolve lat/lng for a customer: order sample coords, else user profile / addresses.
 */
async function enrichUserLocations(customers, center) {
  const missing = customers.filter((c) => c.lat == null || c.lng == null);
  if (!missing.length) return customers;

  const ids = missing
    .map((c) => c.customerId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));

  if (!ids.length) return customers;

  const users = await User.find({ _id: { $in: ids } })
    .select('_id name phone location.coordinates savedAddresses')
    .lean()
    .catch(() => []);

  const byId = new Map(users.map((u) => [String(u._id), u]));

  return customers.map((cu) => {
    if (cu.lat != null && cu.lng != null) return cu;
    const u = byId.get(String(cu.customerId));
    if (!u) return cu;

    let lat = u.location?.coordinates?.lat;
    let lng = u.location?.coordinates?.lng;
    if (lat == null || lng == null) {
      const addr =
        (u.savedAddresses || []).find((a) => a.isDefault && a.lat != null) ||
        (u.savedAddresses || []).find((a) => a.lat != null && a.lng != null);
      if (addr) {
        lat = addr.lat;
        lng = addr.lng;
      }
    }
    if (lat == null || lng == null) return cu;

    const distanceKm = haversineKm(center.lat, center.lng, lat, lng);
    return {
      ...cu,
      lat,
      lng,
      name: cu.name || u.name,
      phone: cu.phone || u.phone,
      distanceKm:
        distanceKm != null ? Math.round(distanceKm * 1000) / 1000 : null,
      locationSource: 'user_profile',
    };
  });
}

/**
 * Unique product buyers with optional radius.
 * Always returns a full metrics object (never throws on empty data).
 * When radius is set, returns both in-radius and total (all geo) stats.
 */
export async function executeProductBuyers({
  productId = null,
  productName = null,
  days = 90,
  fromDate = null,
  toDate = null,
  radiusKm = null,
  center = null,
  listLimit = 0,
} = {}) {
  const c = storeCoords(center ?? undefined);

  const { pipeline } = compileProductBuyerPipeline({
    productId: productId || undefined,
    productName: productName || undefined,
    days: fromDate || toDate ? undefined : days,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    radiusKm: null,
    requireGeo: false,
  });

  let rows = [];
  try {
    rows = await runAggregation(pipeline);
  } catch (err) {
    if (productName || productId) {
      const createdAt = {};
      if (fromDate) createdAt.$gte = new Date(fromDate);
      if (toDate) createdAt.$lte = new Date(toDate);
      if (!fromDate && !toDate) {
        createdAt.$gte = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000);
      }
      const simple = [
        {
          $match: {
            status: { $in: COMPLETED_ORDER_STATUSES },
            createdAt,
            ...(productName
              ? { 'items.name': { $regex: productName, $options: 'i' } }
              : {}),
          },
        },
        {
          $group: {
            _id: '$userId',
            orderCount: { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
            lastOrderAt: { $max: '$createdAt' },
            sampleLat: { $last: '$deliveryAddress.lat' },
            sampleLng: { $last: '$deliveryAddress.lng' },
            sampleName: { $last: '$customerName' },
            samplePhone: { $last: '$phone' },
          },
        },
      ];
      try {
        rows = await runAggregation(simple);
      } catch (err2) {
        throw new Error(`Product buyer query failed: ${err2.message || err.message}`);
      }
    } else {
      throw err;
    }
  }

  let customers = rows.map((r) => {
    const lat = r.sampleLat;
    const lng = r.sampleLng;
    const distanceKm =
      lat != null && lng != null ? haversineKm(c.lat, c.lng, lat, lng) : null;
    return {
      customerId: r._id,
      orderCount: r.orderCount,
      revenue: r.revenue || 0,
      lastOrderAt: r.lastOrderAt,
      lat,
      lng,
      name: r.sampleName,
      phone: r.samplePhone,
      distanceKm: distanceKm != null ? Math.round(distanceKm * 1000) / 1000 : null,
    };
  });

  customers = await enrichUserLocations(customers, c);

  const totalUnique = customers.length;
  const totalOrders = customers.reduce((s, cu) => s + cu.orderCount, 0);
  const totalRevenue = customers.reduce((s, cu) => s + (cu.revenue || 0), 0);
  const totalRepeat = customers.filter((cu) => cu.orderCount >= 2).length;

  let inRadius = customers;
  let appliedRadius = null;
  if (radiusKm != null && Number.isFinite(Number(radiusKm))) {
    appliedRadius = Number(radiusKm);
    inRadius = customers.filter(
      (cu) => cu.distanceKm != null && cu.distanceKm <= appliedRadius
    );
  }

  const uniqueCustomers = inRadius.length;
  const orders = inRadius.reduce((s, cu) => s + cu.orderCount, 0);
  const revenue = inRadius.reduce((s, cu) => s + (cu.revenue || 0), 0);
  const repeatCustomers = inRadius.filter((cu) => cu.orderCount >= 2).length;
  const repeatRate = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;
  const withCoords = customers.filter((cu) => cu.distanceKm != null).length;

  const sample =
    listLimit > 0
      ? inRadius
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
    totalsWithoutRadius: {
      uniqueCustomers: totalUnique,
      orders: totalOrders,
      revenue: Math.round(totalRevenue * 100) / 100,
      repeatCustomers: totalRepeat,
      customersWithCoordinates: withCoords,
    },
    filters: {
      productId: productId || null,
      productName: productName || null,
      days: fromDate || toDate ? null : days,
      fromDate: fromDate || null,
      toDate: toDate || null,
      radiusKm: appliedRadius,
      center: c,
    },
    source: { dataset: 'orders', freshness: 'live' },
  };
}

export async function executeRevenue(filters = {}) {
  const { days, fromDate, toDate, productId, productName } = filters;
  const pipeline = compileRevenuePipeline({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    productId,
    productName,
  });
  const [row] = await runAggregation(pipeline);
  return {
    orders: row?.orders || 0,
    revenue: Math.round((row?.revenue || 0) * 100) / 100,
    unique_customers: row?.unique_customers || 0,
    aov: Math.round((row?.aov || 0) * 100) / 100,
    filters: {
      days: fromDate || toDate ? null : days,
      fromDate: fromDate || null,
      toDate: toDate || null,
      productId: productId || null,
    },
    source: { dataset: 'orders', freshness: 'live' },
  };
}

export async function executeTopProducts(filters = {}) {
  const { days, fromDate, toDate, limit = 10 } = filters;
  const pipeline = compileTopProductsPipeline({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    limit,
  });
  // compileTopProductsPipeline may not support fromDate yet — patch compiler
  const rows = await runAggregation(
    pipeline.length
      ? pipeline
      : compileTopProductsPipeline({ days: days || 90, limit })
  );
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
        spend: { $sum: { $ifNull: ['$totalPrice', 0] } },
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
    totalsWithoutRadius: result.totalsWithoutRadius,
    filters: { radiusKm: max, days, center: result.filters.center },
    source: result.source,
  };
}

export async function executeOrderCountForProduct(
  productId,
  days = 90,
  productName = null,
  fromDate = null,
  toDate = null
) {
  if (!productId && !productName) return 0;
  const createdAt = {};
  if (fromDate) createdAt.$gte = new Date(fromDate);
  if (toDate) createdAt.$lte = new Date(toDate);
  if (!fromDate && !toDate) {
    createdAt.$gte = new Date(Date.now() - (days || 90) * 24 * 60 * 60 * 1000);
  }
  const or = [];
  if (productId && mongoose.Types.ObjectId.isValid(String(productId))) {
    or.push({ 'items.bowlId': new mongoose.Types.ObjectId(String(productId)) });
    or.push({ 'items.bowlId': String(productId) });
  }
  if (productName) {
    or.push({ 'items.name': { $regex: productName, $options: 'i' } });
  }
  if (!or.length) return 0;
  return Order.countDocuments({
    status: { $in: COMPLETED_ORDER_STATUSES },
    createdAt,
    $or: or,
  });
}
