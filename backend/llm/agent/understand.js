/**
 * Understanding layer — normalize messy human prompts into a structured plan.
 * Orchestration then executes steps and combines results.
 */

import {
  COMPLETED_ORDER_STATUSES,
  CANCELLED_STATUS,
} from '../semantic/picosoModel.js';
import {
  extractDateRange,
  extractRadiusKm,
  extractStatusFilter,
  extractProductQuery,
  isGreeting,
  isConversational,
  isAnalyticsIntent,
} from '../templates.js';

function istParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function istMidnightUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
}

/** Prefer explicit last-month / named-month over silent 90-day default. */
export function resolvePeriod(message = '') {
  const m = String(message).toLowerCase();
  const range = extractDateRange(message);

  // Named month (july / in july) — current IST year unless last year implied
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];
  const named = m.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  );
  const wantsLastMonth = /\blast\s*month\b|\bprevious\s*month\b|\bpichle\s*mahine\b/i.test(m);

  if (wantsLastMonth) {
    const now = istParts();
    let y = now.year;
    let mo = now.month - 1;
    if (mo < 1) {
      mo = 12;
      y -= 1;
    }
    const fromDate = istMidnightUtc(y, mo, 1);
    const toDate = istMidnightUtc(now.year, now.month, 1);
    return {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      days: null,
      label: `Last calendar month (${y}-${String(mo).padStart(2, '0')})`,
      kind: 'last_month',
    };
  }

  if (named) {
    const now = istParts();
    const mi = monthNames.indexOf(named[1].toLowerCase()) + 1;
    let y = now.year;
    // If named month is ahead of current month, use previous year
    if (mi > now.month) y -= 1;
    const fromDate = istMidnightUtc(y, mi, 1);
    const toDate =
      mi === 12 ? istMidnightUtc(y + 1, 1, 1) : istMidnightUtc(y, mi + 1, 1);
    const label = `${named[1][0].toUpperCase()}${named[1].slice(1).toLowerCase()} ${y}`;
    return {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      days: null,
      label,
      kind: 'named_month',
    };
  }

  // Only keep extractDateRange default if message actually had a time cue
  const hasTimeCue =
    /\b(yesterday|today|kal|aaj|last|this|week|month|din|days?|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
      m
    );

  if (!hasTimeCue) {
    return {
      fromDate: null,
      toDate: null,
      days: null,
      label: 'All time',
      kind: 'all_time',
    };
  }

  return {
    fromDate: range.fromDate ? new Date(range.fromDate).toISOString() : null,
    toDate: range.toDate ? new Date(range.toDate).toISOString() : null,
    days: range.days,
    label: range.label,
    kind: 'range',
  };
}

function detectPrimaryMetric(message = '') {
  const m = String(message).toLowerCase();

  // Referral system (must match before registered_users to avoid mis-routing "referral users")
  if (/\b(referral|refer|referred|friend link|invite link|invit|share link|referral code|referral program|joined.*referral|referral.*joined|referral.*user|how many.*referral|via referral)\b/.test(m)) {
    return 'referral_stats';
  }

  // Agent network
  if (/\b(agent|agents|agent commission|agent earnings|agent orders|agent lead|agent network|top agent|agent performance|agent code)\b/.test(m)) {
    return 'agent_stats';
  }

  // Marketing campaigns
  if (/\b(campaign|campaigns|free coffee|promo code|promo|campaign lead|campaign redemption|campaign scan|marketing campaign)\b/.test(m)) {
    return 'campaign_stats';
  }

  // Platinum membership
  if (/\b(platinum|platinum card|platinum member|premium member|membership|subscription card|paid member)\b/.test(m) &&
      !/\bhealthy|meal.?kit|bowl.?plan\b/.test(m)) {
    return 'platinum_stats';
  }

  // Healthy subscription / meal kit
  if (/\b(subscription plan|healthy plan|meal.?kit|healthy subscription|bowl.?plan|weekly plan|subscription)\b/.test(m)) {
    return 'subscription_stats';
  }

  // Feedback / ratings
  if (/\b(rating|ratings|review|reviews|feedback|star|stars|satisfaction|nps)\b/.test(m)) {
    return 'feedback_stats';
  }

  // Expansion / out-of-radius demand
  if (/\b(expansion|expand|out.?of.?radius|out of range|outside radius|outside.?delivery|outside our area|notify.?me|notify me|waitlist|areas requesting|demand outside|delivery area|requesting delivery|can'?t deliver|no delivery)\b/.test(m)) {
    return 'expansion_stats';
  }

  // Export / list customers
  if (/\b(export|list|download|csv)\b/.test(m) && /\b(customer|user|phone)\b/.test(m)) {
    return 'export_customers';
  }

  // Registered users (platform signups — check AFTER referral/agent)
  if (/\b(registered|signup|sign[- ]?up|platform users?|new users?|joined platform)\b/.test(m) &&
      !/referral|agent/.test(m)) {
    return 'registered_users';
  }

  if (/\brepeat\s*rate\b/.test(m)) return 'repeat_rate';
  if (/\brepeat\b/.test(m) && /\bcustomer/.test(m)) return 'repeat_customers';
  if (/\baov\b|average order/.test(m)) return 'aov';
  if (/\b(revenue|sales|sale\b|kamaya)\b/.test(m) && !/\bcancel/.test(m)) return 'revenue';
  if (/\binactive\b/.test(m)) return 'inactive_customers';
  if (/\b(rank|top|best.?sell|most sold)\b/.test(m)) return 'top_products';
  if (/\b(more than|at least|over)\s*\d+\s*(orders?|times)/.test(m)) {
    return 'segment_customers';
  }
  if (/\bcustomers?\b/.test(m) && /\b(order|within|km|radius)\b/.test(m)) {
    return 'unique_customers';
  }
  if (/\b(orders?|order count|total order)\b/.test(m)) return 'orders';
  if (/\bcustomers?\b/.test(m)) return 'unique_customers';
  return 'orders';
}

function buildNormalized(message, c) {
  const parts = [];
  const metricLabels = {
    orders: 'Count completed orders',
    revenue: 'Sum revenue (totalPrice)',
    aov: 'Average order value',
    unique_customers: 'Count unique customers',
    export_customers: 'List customers (name, phone, distance)',
    registered_users: 'Count registered platform users',
    segment_customers: `List customers with ≥${c.minOrders || 2} orders`,
    top_products: 'Rank top products by units',
    repeat_rate: 'Compute repeat rate',
    repeat_customers: 'Count repeat customers',
    inactive_customers: 'List inactive customers',
    referral_stats: 'Referral program analytics (users joined via referral link)',
    agent_stats: 'Agent network analytics (commissions, leads, orders)',
    campaign_stats: 'Marketing campaign analytics (leads, redemptions)',
    platinum_stats: 'Platinum card membership analytics',
    subscription_stats: 'Healthy subscription plan analytics',
    feedback_stats: 'Customer feedback & ratings analytics',
    expansion_stats: 'Expansion demand analytics (out-of-radius, notify-me)',
  };
  parts.push(metricLabels[c.metric] || 'Analyze live ops data');
  if (c.period?.label) parts.push(`in ${c.period.label}`);
  if (c.radiusKm != null) parts.push(`within ${c.radiusKm} km of store`);
  if (c.product) parts.push(`for product “${c.product}”`);
  if (c.status?.label) parts.push(`status: ${c.status.label}`);
  return parts.join(' · ');
}

function buildPlan(c) {
  const plan = [
    {
      id: 'understand',
      label: 'Understanding your question…',
    },
  ];
  if (c.period && c.period.kind !== 'all_time') {
    plan.push({
      id: 'period',
      label: `Resolving time window: ${c.period.label}…`,
    });
  }
  if (c.radiusKm != null) {
    plan.push({
      id: 'radius',
      label: `Applying ${c.radiusKm} km delivery radius from store…`,
    });
  }
  if (c.product) {
    plan.push({
      id: 'product',
      label: `Matching product “${c.product}” in catalog…`,
    });
  }
  const actionLabels = {
    orders: 'Counting matching live orders…',
    revenue: 'Summing live order revenue…',
    aov: 'Computing average order value…',
    unique_customers: 'Counting unique customers…',
    export_customers: 'Exporting customer rows (name, phone, distance)…',
    registered_users: 'Counting registered users in users collection…',
    segment_customers: 'Segmenting customers by order frequency…',
    top_products: 'Ranking products by units sold…',
    repeat_rate: 'Calculating repeat rate…',
    repeat_customers: 'Finding repeat customers…',
    inactive_customers: 'Finding inactive customers…',
    referral_stats: 'Querying FriendReferral + User.referredByAgent…',
    agent_stats: 'Querying Agent network (leads, orders, commissions)…',
    campaign_stats: 'Querying Campaign leads and redemptions…',
    platinum_stats: 'Querying PlatinumCard membership records…',
    subscription_stats: 'Querying HealthySubscription plan records…',
    feedback_stats: 'Aggregating Feedback ratings…',
    expansion_stats: 'Querying OutOfRadius + NotifyMe demand signals…',
  };
  plan.push({
    id: 'query',
    label: actionLabels[c.metric] || 'Running live Mongo aggregation…',
  });
  plan.push({
    id: 'compose',
    label: 'Combining results into a clear answer…',
  });
  return plan;
}

/**
 * Parse a free-form question into structured constraints + execution plan.
 */
export function understandQuery(message = '') {
  const original = String(message || '').trim();
  const lower = original.toLowerCase();

  if (isGreeting(original) || isConversational(original)) {
    return {
      original,
      kind: 'chat',
      normalized: original,
      analytics: false,
      constraints: {},
      plan: [{ id: 'chat', label: 'Preparing a reply…' }],
    };
  }

  const period = resolvePeriod(original);
  const radiusKm = extractRadiusKm(original);
  const status = extractStatusFilter(original);
  const product = extractProductQuery(original);
  const metric = detectPrimaryMetric(original);

  let minOrders = null;
  const moreThan = lower.match(/(?:more than|over|>\s*)\s*(\d+)\s*(?:times|orders?)/i);
  const atLeast = lower.match(/(?:at least|>=\s*)\s*(\d+)\s*(?:times|orders?)/i);
  if (moreThan) minOrders = Number(moreThan[1]) + 1;
  else if (atLeast) minOrders = Number(atLeast[1]);
  else if (metric === 'segment_customers') {
    const n = lower.match(/(\d+)\s*(?:times|orders?)/);
    if (n) minOrders = Number(n[1]);
  }

  const constraints = {
    metric,
    period,
    radiusKm,
    status: {
      statuses: status.statuses || [...COMPLETED_ORDER_STATUSES],
      label: status.label || 'completed (non-cancelled)',
    },
    product,
    minOrders,
    wantList: /\b(list|export|show|include|with name|phone)\b/i.test(lower),
    wantExport: /\b(export|csv|download)\b/i.test(lower),
  };

  const analytics = isAnalyticsIntent(original) || Boolean(metric);
  const normalized = buildNormalized(original, constraints);
  const plan = buildPlan(constraints);

  return {
    original,
    kind: analytics ? 'analytics' : 'chat',
    analytics,
    normalized,
    constraints,
    plan,
  };
}

/**
 * Map understood constraints → tool calls (ordered).
 */
export function planToolCalls(understanding) {
  const c = understanding?.constraints || {};
  const period = c.period || {};
  const dateArgs = {
    fromDate: period.fromDate || null,
    toDate: period.toDate || null,
    days: period.days,
    periodLabel: period.label || null,
    all_time: period.kind === 'all_time',
  };
  const statusArgs = {
    statuses: c.status?.statuses,
    statusLabel: c.status?.label,
  };
  const tools = [];

  if (c.product) {
    tools.push({
      name: 'resolve_product',
      arguments: { name: c.product },
      stepLabel: `Matching product “${c.product}”…`,
    });
  }

  // Product-specific path replaces generic order/customer counts
  if (c.product && (c.metric === 'orders' || c.metric === 'unique_customers' || c.metric === 'revenue')) {
    tools.push({
      name: 'count_unique_product_buyers',
      arguments: {
        ...dateArgs,
        radius_km: c.radiusKm,
        limit: c.wantList ? 100 : 50,
      },
      needsProductId: true,
      stepLabel: 'Counting product buyers on live orders…',
    });
    return tools;
  }

  switch (c.metric) {
    case 'orders':
      if (c.radiusKm != null) {
        tools.push({
          name: 'count_orders_in_radius',
          arguments: {
            ...dateArgs,
            ...statusArgs,
            radius_km: c.radiusKm,
          },
          stepLabel: `Counting orders within ${c.radiusKm} km…`,
        });
      } else {
        tools.push({
          name: 'count_orders',
          arguments: { ...dateArgs, ...statusArgs },
          stepLabel: 'Counting live orders…',
        });
      }
      break;
    case 'revenue':
      if (c.radiusKm != null) {
        tools.push({
          name: 'count_orders_in_radius',
          arguments: {
            ...dateArgs,
            ...statusArgs,
            radius_km: c.radiusKm,
            prefer_metric: 'revenue',
          },
          stepLabel: `Summing revenue within ${c.radiusKm} km…`,
        });
      } else {
        tools.push({
          name: 'calculate_revenue',
          arguments: { ...dateArgs, ...statusArgs },
          stepLabel: 'Summing live revenue…',
        });
      }
      break;
    case 'aov':
      tools.push({
        name: 'get_aov',
        arguments: { ...dateArgs, ...statusArgs },
        stepLabel: 'Computing AOV…',
      });
      break;
    case 'unique_customers':
      tools.push({
        name: 'find_customers_within_radius',
        arguments: {
          ...dateArgs,
          radius_km: c.radiusKm ?? 50,
          limit: 100,
        },
        stepLabel:
          c.radiusKm != null
            ? `Finding customers within ${c.radiusKm} km…`
            : 'Counting unique customers…',
      });
      break;
    case 'export_customers':
      tools.push({
        name: 'export_order_customers',
        arguments: {
          ...dateArgs,
          ...statusArgs,
          limit: 300,
          include_distance: true,
        },
        stepLabel: 'Exporting customers with phone & distance…',
      });
      break;
    case 'registered_users':
      tools.push({
        name: 'count_registered_users',
        arguments: {},
        stepLabel: 'Counting registered users…',
      });
      if (c.wantList) {
        tools.push({
          name: 'list_registered_users',
          arguments: { limit: 200 },
          stepLabel: 'Listing registered users…',
        });
      }
      break;
    case 'segment_customers':
      tools.push({
        name: 'query_customers',
        arguments: {
          ...dateArgs,
          ...statusArgs,
          min_orders: c.minOrders || 2,
          all_time: period.kind === 'all_time',
          limit: 200,
        },
        stepLabel: `Finding customers with ≥${c.minOrders || 2} orders…`,
      });
      break;
    case 'top_products':
      tools.push({
        name: 'top_products',
        arguments: { ...dateArgs, limit: 40 },
        stepLabel: 'Ranking products…',
      });
      break;
    case 'repeat_rate':
    case 'repeat_customers':
      tools.push({
        name: 'get_repeat_customers',
        arguments: {
          ...dateArgs,
          preferred_metric: c.metric === 'repeat_rate' ? 'repeat_rate' : 'repeat_customers',
          radius_km: c.radiusKm,
          min_orders: 2,
        },
        stepLabel: 'Computing repeat metrics…',
      });
      break;
    case 'inactive_customers':
      tools.push({
        name: 'inactive_customers',
        arguments: { days_inactive: 60, limit: 100 },
        stepLabel: 'Finding inactive customers…',
      });
      break;
    case 'referral_stats':
      tools.push({
        name: 'get_referral_stats',
        arguments: { ...dateArgs, limit: c.wantList ? 100 : 50 },
        stepLabel: 'Querying referral program data…',
      });
      break;
    case 'agent_stats':
      tools.push({
        name: 'get_agent_stats',
        arguments: { ...dateArgs, limit: c.wantList ? 50 : 30 },
        stepLabel: 'Querying agent network performance…',
      });
      break;
    case 'campaign_stats':
      tools.push({
        name: 'get_campaign_stats',
        arguments: { ...dateArgs, limit: 20 },
        stepLabel: 'Querying campaign leads and redemptions…',
      });
      break;
    case 'platinum_stats':
      tools.push({
        name: 'get_platinum_stats',
        arguments: { ...dateArgs },
        stepLabel: 'Querying platinum membership data…',
      });
      break;
    case 'subscription_stats':
      tools.push({
        name: 'get_subscription_stats',
        arguments: { ...dateArgs },
        stepLabel: 'Querying healthy subscription plans…',
      });
      break;
    case 'feedback_stats':
      tools.push({
        name: 'get_feedback_stats',
        arguments: { ...dateArgs },
        stepLabel: 'Aggregating customer ratings…',
      });
      break;
    case 'expansion_stats':
      tools.push({
        name: 'get_expansion_stats',
        arguments: { ...dateArgs },
        stepLabel: 'Querying expansion demand signals…',
      });
      break;
    default:
      tools.push({
        name: 'count_orders',
        arguments: { ...dateArgs, ...statusArgs },
        stepLabel: 'Running default order count…',
      });
  }

  return tools;
}

export { CANCELLED_STATUS, COMPLETED_ORDER_STATUSES };
