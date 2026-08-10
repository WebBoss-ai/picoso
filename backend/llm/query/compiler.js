import mongoose from 'mongoose';
import { COMPLETED_ORDER_STATUSES } from '../semantic/picosoModel.js';
import { clampDays, clampLimit, clampRadiusKm } from './validator.js';
import { storeCoords, latLngBoundingBox, orderHasCoordsMatch } from '../geo.js';

/**
 * Build reusable Mongo match fragments from a logical filter object.
 */
export function compileOrderBaseMatch({
  days,
  productId,
  productIds,
  productNameRegex,
  statuses,
  fromDate,
  toDate,
} = {}) {
  const match = {
    status: { $in: statuses || COMPLETED_ORDER_STATUSES },
  };

  if (fromDate || toDate || days) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
    if (!fromDate && !toDate && days) {
      const d = clampDays(days, 90);
      match.createdAt.$gte = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
    }
  }

  if (productId) {
    match['items.bowlId'] = new mongoose.Types.ObjectId(String(productId));
  } else if (productIds?.length) {
    match['items.bowlId'] = {
      $in: productIds.map((id) => new mongoose.Types.ObjectId(String(id))),
    };
  } else if (productNameRegex) {
    match['items.name'] = {
      $regex: productNameRegex,
      $options: 'i',
    };
  }

  return match;
}

export function compileGeoBboxMatch(radiusKm, center) {
  const r = clampRadiusKm(radiusKm, 2);
  const c = storeCoords(center);
  const bbox = latLngBoundingBox(c.lat, c.lng, r);
  return {
    radiusKm: r,
    center: c,
    bbox,
    match: orderHasCoordsMatch(bbox),
  };
}

/**
 * Aggregation stages: base match → optional product item filter expand → group.
 */
export function compileProductBuyerPipeline({
  productId,
  days = 90,
  radiusKm = null,
  center = null,
  requireGeo = false,
  limitCustomers = 0,
} = {}) {
  const base = compileOrderBaseMatch({ days, productId });
  const pipeline = [{ $match: base }];

  // Keep only the product line items of interest when productId set
  if (productId) {
    pipeline.push({
      $addFields: {
        items: {
          $filter: {
            input: '$items',
            as: 'it',
            cond: {
              $eq: ['$$it.bowlId', new mongoose.Types.ObjectId(String(productId))],
            },
          },
        },
      },
    });
    pipeline.push({ $match: { 'items.0': { $exists: true } } });
  }

  let geoMeta = null;
  if (radiusKm != null || requireGeo) {
    geoMeta = compileGeoBboxMatch(radiusKm ?? 2, center);
    pipeline.push({ $match: geoMeta.match });
  }

  pipeline.push({
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
  });

  if (limitCustomers > 0) {
    pipeline.push({ $limit: clampLimit(limitCustomers, 50) });
  }

  return { pipeline, geoMeta, baseMatch: base };
}

export function compileRevenuePipeline(filters = {}) {
  const base = compileOrderBaseMatch(filters);
  return [
    { $match: base },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
        uniqueCustomers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        _id: 0,
        orders: 1,
        revenue: 1,
        unique_customers: { $size: '$uniqueCustomers' },
        aov: {
          $cond: [
            { $gt: ['$orders', 0] },
            { $divide: ['$revenue', '$orders'] },
            0,
          ],
        },
      },
    },
  ];
}

export function compileTopProductsPipeline({ days = 90, limit = 10 } = {}) {
  const base = compileOrderBaseMatch({ days });
  return [
    { $match: base },
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          bowlId: '$items.bowlId',
          name: '$items.name',
        },
        orders: { $sum: 1 },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { units: -1 } },
    { $limit: clampLimit(limit, 10) },
    {
      $project: {
        _id: 0,
        productId: '$_id.bowlId',
        name: '$_id.name',
        orders: 1,
        units: 1,
        revenue: 1,
      },
    },
  ];
}
