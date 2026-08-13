import mongoose from 'mongoose';
import {
  Order,
  User,
  FriendReferral,
  FriendReferralRequest,
  Agent,
  AgentLead,
  AgentCommission,
  Campaign,
  CampaignLead,
  CampaignRedemption,
  PlatinumCard,
  HealthySubscription,
  Feedback,
  NotifyRequest,
  OutOfRadiusAttempt,
} from '../../models/Model.js';
import { withTimeout } from './validator.js';
import { haversineKm, storeCoords, latLngBoundingBox, filterByRadius } from '../geo.js';
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
  const { days, fromDate, toDate, productId, productName, statuses } = filters;
  const pipeline = compileRevenuePipeline({
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    productId,
    productName,
    statuses: statuses || undefined,
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
      statuses: statuses || COMPLETED_ORDER_STATUSES,
    },
    source: {
      dataset: 'orders',
      freshness: 'live',
      collection: 'orders',
      match: {
        status: statuses || COMPLETED_ORDER_STATUSES,
        period: { fromDate, toDate, days },
      },
    },
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
  fromDate = null,
  toDate = null,
  limit = 100,
} = {}) {
  const max = Number(radiusKm);
  const result = await executeProductBuyers({
    productId: null,
    days: fromDate || toDate ? undefined : days,
    fromDate,
    toDate,
    radiusKm: max,
    listLimit: limit,
  });
  return {
    uniqueCustomers: result.uniqueCustomers,
    orders: result.orders,
    revenue: result.revenue,
    customers: result.customers,
    totalsWithoutRadius: result.totalsWithoutRadius,
    filters: {
      radiusKm: max,
      days: fromDate || toDate ? null : days,
      fromDate: fromDate || null,
      toDate: toDate || null,
      center: result.filters.center,
    },
    source: result.source,
  };
}

/**
 * Count individual orders (not unique customers) within a delivery radius.
 * Uses each order's deliveryAddress lat/lng with haversine from store.
 */
export async function executeOrdersInRadius({
  radiusKm = 2,
  days = 90,
  fromDate = null,
  toDate = null,
  statuses = COMPLETED_ORDER_STATUSES,
  periodLabel = null,
} = {}) {
  const c = storeCoords();
  const max = Number(radiusKm);
  const bbox = latLngBoundingBox(c.lat, c.lng, max * 1.2);

  const match = {
    status: { $in: statuses?.length ? statuses : COMPLETED_ORDER_STATUSES },
    'deliveryAddress.lat': { $gte: bbox.minLat, $lte: bbox.maxLat },
    'deliveryAddress.lng': { $gte: bbox.minLng, $lte: bbox.maxLng },
  };

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  } else if (days != null) {
    match.createdAt = {
      $gte: new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000),
    };
  }

  const rows = await runAggregation([
    { $match: match },
    {
      $project: {
        totalPrice: 1,
        userId: 1,
        status: 1,
        createdAt: 1,
        customerName: 1,
        phone: 1,
        lat: '$deliveryAddress.lat',
        lng: '$deliveryAddress.lng',
      },
    },
  ]);

  const inRadius = filterByRadius(
    rows,
    (d) => d.lat,
    (d) => d.lng,
    max,
    c
  );

  const orders = inRadius.length;
  const revenue =
    Math.round(inRadius.reduce((s, o) => s + Number(o.totalPrice || 0), 0) * 100) / 100;
  const uniqueIds = new Set(
    inRadius.map((o) => (o.userId != null ? String(o.userId) : null)).filter(Boolean)
  );

  return {
    orders,
    revenue,
    uniqueCustomers: uniqueIds.size,
    aov: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
    candidatesInBbox: rows.length,
    filters: {
      radiusKm: max,
      days: fromDate || toDate ? null : days,
      fromDate: fromDate || null,
      toDate: toDate || null,
      periodLabel: periodLabel || null,
      statuses,
      center: c,
    },
    source: { dataset: 'orders', freshness: 'live' },
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

// ── Referral stats ────────────────────────────────────────────────────────────
export async function executeReferralStats({ fromDate = null, toDate = null, listLimit = 50 } = {}) {
  const createdFilter = {};
  if (fromDate) createdFilter.$gte = new Date(fromDate);
  if (toDate) createdFilter.$lte = new Date(toDate);
  const hasDateFilter = fromDate || toDate;

  // Aggregate across all FriendReferral docs
  const allReferrals = await FriendReferral.find({}).lean().catch(() => []);

  let totalReferrers = 0;
  let totalJoined = 0;
  let totalOrdered = 0;
  let totalRewards = 0;
  const referrerRows = [];

  for (const ref of allReferrals) {
    const friends = (ref.referredFriends || []).filter((f) => {
      if (!hasDateFilter) return true;
      const d = f.joinedAt ? new Date(f.joinedAt) : null;
      if (!d) return false;
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate)) return false;
      return true;
    });
    if (friends.length === 0 && hasDateFilter) continue;
    totalReferrers++;
    totalJoined += hasDateFilter ? friends.length : (ref.totalJoined || friends.length);
    totalOrdered += hasDateFilter
      ? friends.filter((f) => f.firstOrderAt).length
      : (ref.totalOrdered || friends.filter((f) => f.firstOrderAt).length);
    totalRewards += hasDateFilter
      ? friends.filter((f) => f.rewardEarned).length
      : (ref.totalRewardsEarned || friends.filter((f) => f.rewardEarned).length);

    if (referrerRows.length < listLimit) {
      referrerRows.push({
        referrerName: ref.referrerName,
        referrerPhone: ref.referrerPhone,
        code: ref.code,
        joined: hasDateFilter ? friends.length : (ref.totalJoined || 0),
        ordered: hasDateFilter
          ? friends.filter((f) => f.firstOrderAt).length
          : (ref.totalOrdered || 0),
        rewards: ref.totalRewardsEarned || 0,
        status: ref.status,
      });
    }
  }

  // Also count users with referredByAgent set (agent-referred registrations)
  const agentReferralFilter = hasDateFilter
    ? { referredByAgent: { $ne: null }, createdAt: createdFilter }
    : { referredByAgent: { $ne: null } };
  const agentReferredCount = await User.countDocuments(agentReferralFilter).catch(() => 0);

  // Pending requests
  const pendingRequests = await FriendReferralRequest.countDocuments({ status: 'pending' }).catch(() => 0);

  return {
    totalReferrers,
    totalJoined,
    totalOrdered,
    totalRewards,
    conversionRate: totalJoined > 0 ? Math.round((totalOrdered / totalJoined) * 100) / 100 : 0,
    agentReferredUsers: agentReferredCount,
    pendingRequests,
    referrers: referrerRows,
    filters: { fromDate, toDate },
    source: { dataset: 'friendreferrals + users', freshness: 'live' },
  };
}

// ── Agent stats ───────────────────────────────────────────────────────────────
export async function executeAgentStats({ fromDate = null, toDate = null, listLimit = 30 } = {}) {
  const agents = await Agent.find({}).lean().catch(() => []);
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.isActive).length;
  const totalEarnings = agents.reduce((s, a) => s + (a.totalEarnings || 0), 0);
  const totalOrders = agents.reduce((s, a) => s + (a.totalOrders || 0), 0);
  const totalLeads = agents.reduce((s, a) => s + (a.totalLeads || 0), 0);

  const top = agents
    .filter((a) => a.isActive)
    .sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0))
    .slice(0, listLimit)
    .map((a) => ({
      name: a.name,
      phone: a.phone,
      code: a.agentCode,
      orders: a.totalOrders || 0,
      leads: a.totalLeads || 0,
      earnings: a.totalEarnings || 0,
      wallet: a.wallet || 0,
    }));

  return {
    totalAgents,
    activeAgents,
    totalOrders,
    totalLeads,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    agents: top,
    filters: { fromDate, toDate },
    source: { dataset: 'agents', freshness: 'live' },
  };
}

// ── Campaign stats ────────────────────────────────────────────────────────────
export async function executeCampaignStats({ fromDate = null, toDate = null, listLimit = 20 } = {}) {
  const campaigns = await Campaign.find({}).lean().catch(() => []);
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.active).length;
  const totalRedeemed = campaigns.reduce((s, c) => s + (c.redeemedCount || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.totalBudget || 0), 0);

  const dateFilter = {};
  if (fromDate) dateFilter.$gte = new Date(fromDate);
  if (toDate) dateFilter.$lte = new Date(toDate);
  const leadQuery = Object.keys(dateFilter).length ? { registeredAt: dateFilter } : {};
  const totalLeads = await CampaignLead.countDocuments(leadQuery).catch(() => 0);
  const totalRedemptions = await CampaignRedemption.countDocuments(
    Object.keys(dateFilter).length ? { redeemedAt: dateFilter } : {}
  ).catch(() => 0);

  const campaignRows = campaigns
    .sort((a, b) => (b.redeemedCount || 0) - (a.redeemedCount || 0))
    .slice(0, listLimit)
    .map((c) => ({
      code: c.code,
      name: c.name,
      benefit: c.benefit,
      freeItem: c.freeItemLabel,
      budget: c.totalBudget,
      redeemed: c.redeemedCount,
      active: c.active,
    }));

  return {
    totalCampaigns,
    activeCampaigns,
    totalLeads,
    totalRedemptions,
    totalRedeemed,
    totalBudget,
    campaigns: campaignRows,
    filters: { fromDate, toDate },
    source: { dataset: 'campaigns + campaignleads + campaignredemptions', freshness: 'live' },
  };
}

// ── Platinum card stats ───────────────────────────────────────────────────────
export async function executePlatinumStats({ fromDate = null, toDate = null } = {}) {
  const dateFilter = {};
  if (fromDate) dateFilter.$gte = new Date(fromDate);
  if (toDate) dateFilter.$lte = new Date(toDate);
  const hasFilter = Object.keys(dateFilter).length > 0;

  const total = await PlatinumCard.countDocuments({}).catch(() => 0);
  const active = await PlatinumCard.countDocuments({ active: true }).catch(() => 0);
  const newInPeriod = hasFilter
    ? await PlatinumCard.countDocuments({ createdAt: dateFilter }).catch(() => 0)
    : null;
  const monthlyRevenue = active * 299;

  const recentCards = await PlatinumCard.find({ active: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
    .catch(() => []);

  const userIds = recentCards.map((c) => c.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name phone')
    .lean()
    .catch(() => []);
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return {
    totalCards: total,
    activeCards: active,
    newInPeriod,
    estimatedMonthlyRevenue: monthlyRevenue,
    recentMembers: recentCards.slice(0, 20).map((c) => ({
      name: byId.get(String(c.userId))?.name || '—',
      phone: byId.get(String(c.userId))?.phone || '—',
      active: c.active,
      fee: c.monthlyFee || 299,
      startDate: c.startDate,
    })),
    filters: { fromDate, toDate },
    source: { dataset: 'platinumcards + users', freshness: 'live' },
  };
}

// ── Subscription stats ────────────────────────────────────────────────────────
export async function executeSubscriptionStats({ fromDate = null, toDate = null } = {}) {
  const all = await HealthySubscription.find({}).lean().catch(() => []);

  const byStatus = {};
  for (const s of all) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  }
  const active = byStatus.active || 0;
  const pending = (byStatus.pending_payment || 0) + (byStatus.pending_approval || 0);
  const paused = byStatus.paused || 0;
  const cancelled = byStatus.cancelled || 0;
  const totalRevenue = all
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.weeklyPrice || 0), 0);

  const userIds = all.filter((s) => s.status === 'active').map((s) => s.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name phone')
    .lean()
    .catch(() => []);
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return {
    totalSubscriptions: all.length,
    activeSubscriptions: active,
    pendingSubscriptions: pending,
    pausedSubscriptions: paused,
    cancelledSubscriptions: cancelled,
    weeklyRevenueActive: Math.round(totalRevenue * 100) / 100,
    activeMembers: all
      .filter((s) => s.status === 'active')
      .slice(0, 30)
      .map((s) => ({
        name: byId.get(String(s.userId))?.name || '—',
        phone: byId.get(String(s.userId))?.phone || '—',
        bowlsPerWeek: s.bowlsPerWeek,
        weeklyPrice: s.weeklyPrice,
        status: s.status,
      })),
    filters: { fromDate, toDate },
    source: { dataset: 'healthysubscriptions + users', freshness: 'live' },
  };
}

// ── Feedback / ratings ────────────────────────────────────────────────────────
export async function executeFeedbackStats({ fromDate = null, toDate = null } = {}) {
  const match = {};
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        oneToThree: { $sum: { $cond: [{ $lte: ['$rating', 3] }, 1, 0] } },
      },
    },
  ];

  const rows = await Feedback.aggregate(pipeline).catch(() => []);
  const result = rows[0] || { total: 0, avgRating: 0, fiveStars: 0, fourStars: 0, oneToThree: 0 };

  const recent = await Feedback.find(match)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
    .catch(() => []);

  return {
    totalFeedback: result.total,
    averageRating: result.avgRating ? Math.round(result.avgRating * 100) / 100 : null,
    fiveStars: result.fiveStars,
    fourStars: result.fourStars,
    oneToThreeStars: result.oneToThree,
    recent: recent.map((f) => ({
      rating: f.rating,
      message: f.message || '',
      createdAt: f.createdAt,
    })),
    filters: { fromDate, toDate },
    source: { dataset: 'feedback', freshness: 'live' },
  };
}

// ── Out-of-radius / notify-me captures ───────────────────────────────────────
export async function executeExpansionStats({ fromDate = null, toDate = null } = {}) {
  const dateFilter = {};
  if (fromDate) dateFilter.$gte = new Date(fromDate);
  if (toDate) dateFilter.$lte = new Date(toDate);
  const hasFilter = Object.keys(dateFilter).length > 0;

  const outOfRadiusCount = await OutOfRadiusAttempt.countDocuments(
    hasFilter ? { createdAt: dateFilter } : {}
  ).catch(() => 0);

  const notifyCount = await NotifyRequest.countDocuments(
    hasFilter ? { createdAt: dateFilter } : {}
  ).catch(() => 0);

  // Top areas requesting delivery
  const areaPipeline = [
    ...(hasFilter ? [{ $match: { createdAt: dateFilter } }] : []),
    { $group: { _id: '$area', count: { $sum: 1 }, city: { $first: '$city' } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ];
  const topAreas = await OutOfRadiusAttempt.aggregate(areaPipeline).catch(() => []);

  return {
    outOfRadiusAttempts: outOfRadiusCount,
    notifyMeRequests: notifyCount,
    totalInterest: outOfRadiusCount + notifyCount,
    topRequestedAreas: topAreas.map((a) => ({
      area: a._id || '—',
      city: a.city,
      count: a.count,
    })),
    filters: { fromDate, toDate },
    source: { dataset: 'outofradiusattempts + notifyrequests', freshness: 'live' },
  };
}
