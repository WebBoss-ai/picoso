import mongoose from 'mongoose';
import { COMPLETED_ORDER_STATUSES } from '../semantic/picosoModel.js';
import { clampDays, clampLimit, clampRadiusKm } from './validator.js';
import { storeCoords, latLngBoundingBox, orderHasCoordsMatch } from '../geo.js';

/**
 * Match product line items by bowlId (ObjectId or string) and/or name regex.
 */
export function productItemMatch(productId, productName) {
  const parts = [];
  if (productId) {
    const idStr = String(productId);
    parts.push({
      $eq: [{ $toString: { $ifNull: ['$$it.bowlId', ''] } }, idStr],
    });
    // also raw ObjectId when valid
    if (mongoose.Types.ObjectId.isValid(idStr) && idStr.length === 24) {
      parts.push({
        $eq: ['$$it.bowlId', new mongoose.Types.ObjectId(idStr)],
      });
    }
  }
  if (productName) {
    const escaped = String(productName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    parts.push({
      $regexMatch: {
        input: { $ifNull: ['$$it.name', ''] },
        regex: escaped,
        options: 'i',
      },
    });
  }
  if (!parts.length) return { $literal: true };
  return parts.length === 1 ? parts[0] : { $or: parts };
}

/**
 * Build reusable Mongo match fragments from a logical filter object.
 */
export function compileOrderBaseMatch({
  days,
  productId,
  productIds,
  productName,
  productNameRegex,
  statuses,
  fromDate,
  toDate,
  requireCoords = false,
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

  // Soft product prefilter on order (exact id when possible)
  if (productId && mongoose.Types.ObjectId.isValid(String(productId))) {
    match.$or = [
      { 'items.bowlId': new mongoose.Types.ObjectId(String(productId)) },
      { 'items.bowlId': String(productId) },
    ];
    if (productName) {
      match.$or.push({
        'items.name': { $regex: productName, $options: 'i' },
      });
    }
  } else if (productIds?.length) {
    match['items.bowlId'] = {
      $in: productIds.flatMap((id) => {
        const s = String(id);
        return mongoose.Types.ObjectId.isValid(s)
          ? [new mongoose.Types.ObjectId(s), s]
          : [s];
      }),
    };
  } else if (productNameRegex || productName) {
    match['items.name'] = {
      $regex: productNameRegex || productName,
      $options: 'i',
    };
  }

  if (requireCoords) {
    match['deliveryAddress.lat'] = { $type: 'number' };
    match['deliveryAddress.lng'] = { $type: 'number' };
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
 * Aggregation: match orders → filter items by product → group per user.
 * Geo bbox is optional (requireGeo); exact haversine is applied in executor after.
 */
export function compileProductBuyerPipeline({
  productId,
  productName,
  days = 90,
  radiusKm = null,
  center = null,
  requireGeo = false,
  limitCustomers = 0,
} = {}) {
  const base = compileOrderBaseMatch({
    days,
    productId: productId || undefined,
    productName: productName || undefined,
  });
  const pipeline = [{ $match: base }];

  if (productId || productName) {
    pipeline.push({
      $addFields: {
        items: {
          $filter: {
            input: { $ifNull: ['$items', []] },
            as: 'it',
            cond: productItemMatch(productId, productName),
          },
        },
      },
    });
    pipeline.push({ $match: { 'items.0': { $exists: true } } });
  }

  let geoMeta = null;
  if (requireGeo && radiusKm != null) {
    geoMeta = compileGeoBboxMatch(radiusKm, center);
    // Soft geo: only filter if coords exist in bbox; orders with no coords
    // are kept for optional secondary distance from user later (executor).
    pipeline.push({
      $match: {
        $or: [
          geoMeta.match,
          {
            $or: [
              { 'deliveryAddress.lat': { $exists: false } },
              { 'deliveryAddress.lat': null },
              { 'deliveryAddress.lng': { $exists: false } },
              { 'deliveryAddress.lng': null },
            ],
          },
        ],
      },
    });
  }

  pipeline.push({
    $group: {
      _id: '$userId',
      orderCount: { $sum: 1 },
      revenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
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
        revenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
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
        units: { $sum: { $ifNull: ['$items.quantity', 1] } },
        revenue: {
          $sum: {
            $multiply: [
              { $ifNull: ['$items.price', 0] },
              { $ifNull: ['$items.quantity', 1] },
            ],
          },
        },
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
