/**
 * Deterministic intent templates + date/geo/status extractors for Picoso Intelligence.
 */

import {
  COMPLETED_ORDER_STATUSES,
  CANCELLED_STATUS,
  STORE_LOCATION,
} from './semantic/picosoModel.js';

export function isGreeting(message = '') {
  return /^(hi|hello|hey|namaste|hola|yo|sup|hiya|good\s*(morning|evening|afternoon)|whats?\s*up|what'?s\s*up)[\s!.?]*$/i.test(
    String(message).trim()
  );
}

function isAnalyticsIntentQuick(m) {
  return /\b(kitne|kitna|how many|count|revenue|sales|repeat|customer|order|product|km|buyers?|aov|inactive|segment|yesterday|today|month|cancel|deliver|total)\b/i.test(
    m
  );
}

/** Non-analytics chat — never force product resolution */
export function isConversational(message = '') {
  const m = String(message || '').trim().toLowerCase();
  if (!m) return false;
  if (isGreeting(m)) return true;
  if (isAnalyticsIntentQuick(m)) return false;
  return (
    /\b(where are you|who are you|what are you|how are you|based out|your (name|location|address)|what can you do|help me|thank(s| you))\b/i.test(
      m
    ) ||
    /^(where|who|what|how)\s+(are|is)\s+you\b/i.test(m) ||
    /\bbased\s+out\b/i.test(m)
  );
}

export function extractRadiusKm(message) {
  const radiusMatch = String(message).toLowerCase().match(/(\d+(?:\.\d+)?)\s*km/);
  return radiusMatch ? Number(radiusMatch[1]) : null;
}

/**
 * Status filter from NL: cancelled / delivered / default completed set.
 */
export function extractStatusFilter(message = '') {
  const m = String(message).toLowerCase();

  if (/\b(cancel+e?d|cancelled|cancellation)\b/i.test(m)) {
    return {
      statuses: [CANCELLED_STATUS],
      label: 'cancelled',
      includeRevenueLabel: 'Cancelled order value (nominal)',
    };
  }

  if (/\bdelivered\b/i.test(m) && !/\bcancel/i.test(m)) {
    return {
      statuses: ['delivered'],
      label: 'delivered',
      includeRevenueLabel: 'Revenue from delivered orders',
    };
  }

  if (/\bpending\b/i.test(m) && /\border/i.test(m)) {
    return {
      statuses: ['pending'],
      label: 'pending',
      includeRevenueLabel: 'Order value (pending)',
    };
  }

  if (/\b(out[- ]for[- ]delivery|ofd)\b/i.test(m)) {
    return {
      statuses: ['out-for-delivery'],
      label: 'out-for-delivery',
      includeRevenueLabel: 'Order value (out for delivery)',
    };
  }

  if (/\bpreparing\b/i.test(m)) {
    return {
      statuses: ['preparing'],
      label: 'preparing',
      includeRevenueLabel: 'Order value (preparing)',
    };
  }

  if (/\bconfirmed\b/i.test(m) && /\border/i.test(m)) {
    return {
      statuses: ['confirmed'],
      label: 'confirmed',
      includeRevenueLabel: 'Order value (confirmed)',
    };
  }

  return {
    statuses: [...COMPLETED_ORDER_STATUSES],
    label: 'completed (non-cancelled)',
    includeRevenueLabel: 'Revenue from completed orders',
  };
}

/**
 * Instant in Asia/Kolkata parts (no external deps).
 */
function istParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Local calendar midnight IST as UTC Date */
function istMidnightUtc(y, m, d) {
  // Asia/Kolkata is UTC+5:30 year-round
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
}

function addDaysIst(y, m, d, delta) {
  const base = new Date(Date.UTC(y, m - 1, d + delta));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

/**
 * Parse natural language window. Returns { fromDate, toDate, days, label }.
 */
export function extractDateRange(message = '') {
  const m = String(message).toLowerCase();
  const now = istParts();

  // yesterday / kal
  if (/\b(yesterday|kal)\b/i.test(m)) {
    const y = addDaysIst(now.year, now.month, now.day, -1);
    const fromDate = istMidnightUtc(y.year, y.month, y.day);
    const toDate = istMidnightUtc(now.year, now.month, now.day);
    return {
      fromDate,
      toDate,
      days: null,
      label: 'Yesterday (IST)',
    };
  }

  // today / aaj
  if (/\b(today|aaj)\b/i.test(m)) {
    const fromDate = istMidnightUtc(now.year, now.month, now.day);
    const next = addDaysIst(now.year, now.month, now.day, 1);
    const toDate = istMidnightUtc(next.year, next.month, next.day);
    return {
      fromDate,
      toDate,
      days: null,
      label: 'Today (IST)',
    };
  }

  // last week / pichle week
  if (/\b(last\s+week|pichle\s+week|previous\s+week)\b/i.test(m)) {
    const end = addDaysIst(now.year, now.month, now.day, 0);
    const start = addDaysIst(now.year, now.month, now.day, -7);
    return {
      fromDate: istMidnightUtc(start.year, start.month, start.day),
      toDate: istMidnightUtc(end.year, end.month, end.day),
      days: 7,
      label: 'Last 7 days',
    };
  }

  // last month / previous month / pichle mahine
  if (
    /\b(last\s+month|previous\s+month|pichle\s+mahine|pichhla\s+mahina|last\s+mahine)\b/i.test(
      m
    )
  ) {
    let y = now.year;
    let mo = now.month - 1;
    if (mo < 1) {
      mo = 12;
      y -= 1;
    }
    const fromDate = istMidnightUtc(y, mo, 1);
    // first day of this month = end exclusive of last month
    const toDate = istMidnightUtc(now.year, now.month, 1);
    return {
      fromDate,
      toDate,
      days: null,
      label: `Last calendar month (${y}-${String(mo).padStart(2, '0')})`,
    };
  }

  // this month
  if (/\b(this\s+month|is\s+mahine|iss\s+mahine)\b/i.test(m)) {
    const fromDate = istMidnightUtc(now.year, now.month, 1);
    const next =
      now.month === 12
        ? { year: now.year + 1, month: 1, day: 1 }
        : { year: now.year, month: now.month + 1, day: 1 };
    const toDate = istMidnightUtc(next.year, next.month, next.day);
    return {
      fromDate,
      toDate,
      days: null,
      label: 'This month (IST)',
    };
  }

  // last N days / pichle N din
  const daysMatch = m.match(/(?:last|pichle|past)\s+(\d+)\s*(?:din|days?)/i);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    return {
      fromDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      toDate: new Date(),
      days,
      label: `Last ${days} days`,
    };
  }

  // default
  return {
    fromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    toDate: new Date(),
    days: 90,
    label: 'Last 90 days (default)',
  };
}

/** Back-compat helper: day count when no absolute window */
export function extractDays(message) {
  const range = extractDateRange(message);
  if (range.days != null) return range.days;
  if (range.fromDate && range.toDate) {
    const ms = range.toDate - range.fromDate;
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }
  return 90;
}

/** True if this looks like a business analytics question. */
export function isAnalyticsIntent(message = '') {
  const m = String(message);
  if (isConversational(m)) return false;
  if (matchTemplate(m)) return true;
  return /\b(kitne|kitna|how many|count|revenue|sales|repeat|customer|order|product|km|buyers?|aov|inactive|segment|yesterday|today|month|cancel|deliver|export|list|phone|registered|signup|users?|distance)\b/i.test(
    m
  );
}

const FOOD =
  'rice|bowl|wrap|sandwich|salad|coffee|tikka|paneer|meal|snack|dessert|drink|biryani|thali|burger|pizza|pasta|smoothie|shake|cappuccino|coke|protein|matar|beast|nutty';

const ANALYTICS_STOP =
  'ke|ki|ka|andar|mein|me|kitne|kitna|customers?|logon?|logo|ne|liya|liye|lene|wale|order|orders?|buyers?|aur|unmein|se|repeat|hain|hai|how|many|people|who|bought|buy|within|radius|yesterday|today|last|month|total|sales|revenue|canceled|cancelled|delivered|pending|confirmed|complete|completed|aov|unique|count|please|tell|show|give|list';

/**
 * Extract a plausible product phrase from free text (EN/Hinglish).
 * Never returns rubbish for chitchat or pure order-status questions.
 */
export function extractProductQuery(message = '') {
  if (isConversational(message)) return null;
  const raw = String(message || '');
  if (
    /\b(cancel+e?d|cancelled|delivered|pending)\b/i.test(raw) &&
    /\borders?\b/i.test(raw) &&
    !new RegExp(FOOD, 'i').test(raw)
  ) {
    return null;
  }

  let s = raw
    .replace(/\d+(?:\.\d+)?\s*km/gi, ' ')
    .replace(new RegExp(`\\b(${ANALYTICS_STOP})\\b`, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Require a food-ish signal somewhere unless quoted
  if (!new RegExp(FOOD, 'i').test(raw) && !/["“].+["”]/.test(raw)) {
    return null;
  }

  const eng = s.match(
    new RegExp(
      `\\b([A-Za-z][A-Za-z]+(?:\\s+[A-Za-z][A-Za-z]+){0,5}\\s+(?:${FOOD}))\\b`,
      'i'
    )
  );
  if (eng) return cleanProductPhrase(eng[1]);

  const rev = s.match(new RegExp(`\\b((?:${FOOD})(?:\\s+[A-Za-z][A-Za-z]+){0,4})\\b`, 'i'));
  if (rev) return cleanProductPhrase(rev[1]);

  const q = raw.match(/["“](.+?)["”]/);
  if (q) return cleanProductPhrase(q[1]);

  const loose = s.match(/\b([A-Za-z][A-Za-z]+(?:\s+[A-Za-z][A-Za-z]+){0,4})\b/);
  if (
    loose &&
    !/^(last|what|which|total|average|where|based|out|from|you|are)$/i.test(loose[1]) &&
    new RegExp(FOOD, 'i').test(loose[1])
  ) {
    return cleanProductPhrase(loose[1]);
  }

  return null;
}

function cleanProductPhrase(phrase) {
  let p = String(phrase || '')
    .replace(/\d+\s*km/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  p = p.replace(/^(the|a|an|of|for|about)\s+/i, '').trim();
  if (p.length < 3) return null;
  if (/^(where|what|who|how|based|you|out|of)$/i.test(p)) return null;
  return p;
}

function dateArgsFromMessage(message) {
  const range = extractDateRange(message);
  return {
    days: range.days,
    fromDate: range.fromDate?.toISOString?.() || range.fromDate,
    toDate: range.toDate?.toISOString?.() || range.toDate,
    periodLabel: range.label,
  };
}

export function matchTemplate(message = '') {
  if (isConversational(message)) return null;

  const radiusKm = extractRadiusKm(message);
  const dateArgs = dateArgsFromMessage(message);
  const productQuery = extractProductQuery(message);
  const status = extractStatusFilter(message);
  const statusArgs = {
    statuses: status.statuses,
    statusLabel: status.label,
    revenueLabel: status.includeRevenueLabel,
  };

  if (/top product|best.?sell|sabse (zyada|jyada)|most sold|sell the most|products sell/i.test(message)) {
    return { id: 'top_products', args: { ...dateArgs, limit: 10 } };
  }
  if (/inactive|60\s*din|haven'?t ordered|nahi order/i.test(message)) {
    return { id: 'inactive_customers', args: { days_inactive: 60 } };
  }
  if (/\baov\b|average order/i.test(message) && !productQuery) {
    return { id: 'get_aov', args: { ...dateArgs, ...statusArgs } };
  }

  // Orders / revenue + radius must use geo tool (never bare count_orders)
  if (
    radiusKm != null &&
    /\b(orders?|order count|revenue|sales|sale\b)\b/i.test(message) &&
    !/customer/i.test(message) &&
    !productQuery
  ) {
    const preferRevenue =
      /revenue|sales|kitna sale|kitna kamaya|total sales|sale\b/i.test(message) &&
      !/\bcancel/i.test(message);
    return {
      id: 'count_orders_in_radius',
      args: {
        ...dateArgs,
        ...statusArgs,
        radius_km: radiusKm,
        prefer_metric: preferRevenue ? 'revenue' : 'orders',
      },
    };
  }

  // Status-specific counts first (cancelled / delivered must never collapse to completed)
  if (
    /\b(cancel+e?d|cancelled|delivered|pending|confirmed|preparing|out[- ]for[- ]delivery)\b/i.test(
      message
    ) &&
    /\b(orders?|order count)\b/i.test(message) &&
    !productQuery
  ) {
    return { id: 'count_orders', args: { ...dateArgs, ...statusArgs } };
  }

  // Generic order counts → completed set by default (via statusArgs)
  if (
    /\b(orders?|order count)\b/i.test(message) &&
    !/customer/i.test(message) &&
    !productQuery
  ) {
    return { id: 'count_orders', args: { ...dateArgs, ...statusArgs } };
  }

  // Revenue / sales — completed; never treat cancelled as revenue
  if (
    /revenue|sales|kitna sale|kitna kamaya|total revenue|total sales|sale\b/i.test(
      message
    ) &&
    !productQuery &&
    !/\bcancel/i.test(message)
  ) {
    return {
      id: 'calculate_revenue',
      args: {
        ...dateArgs,
        statuses: [...COMPLETED_ORDER_STATUSES],
        statusLabel: 'completed (non-cancelled)',
      },
    };
  }

  if (productQuery) {
    return {
      id: 'product_buyers',
      productQuery,
      args: {
        ...dateArgs,
        radius_km: radiusKm,
        statuses: [...COMPLETED_ORDER_STATUSES],
        statusLabel: 'completed (non-cancelled)',
      },
      wantRepeat: /repeat/i.test(message),
    };
  }

  if (/repeat/i.test(message)) {
    return { id: 'get_repeat_customers', args: { ...dateArgs, radius_km: radiusKm } };
  }

  if (radiusKm != null) {
    return {
      id: 'find_customers_within_radius',
      args: { ...dateArgs, radius_km: radiusKm },
    };
  }

  return null;
}

/** Short store/identity answers without analytics tools */
export function conversationalAnswer(message = '') {
  const store = STORE_LOCATION;
  if (/\b(based|where|location|store|from)\b/i.test(message)) {
    return {
      kind: 'chat',
      headline: 'Picoso store — Gurugram operations origin',
      narrative: `We measure every distance from the Picoso store pin used in ops: ${store.lat}, ${store.lng} (${store.name}). Geo answers (e.g. “2 km ke andar…”) compare customer deliveryAddress.lat/lng (with user-profile fallback) against this origin using haversine.`,
      metrics: [],
      primaryMetric: null,
      definitions: [
        {
          id: 'store_origin',
          text: `Store origin ${store.lat}, ${store.lng} — radius math center`,
        },
      ],
      calculationSteps: ['Conversational location question — no order aggregate run'],
      sources: [
        {
          kind: 'config',
          name: 'STORE_LOCATION',
          detail: `${store.lat}, ${store.lng}`,
        },
      ],
      dimensions: {
        store_lat: store.lat,
        store_lng: store.lng,
        timezone: store.timezone,
        currency: store.currency,
      },
      explanation:
        'This is about where distance is measured from, not a product or order query.',
      confidence: { overall: 1 },
      clarification: null,
      freshness: 'live',
      period: null,
    };
  }

  return {
    kind: 'chat',
    headline: 'Intelligence Partner · analytics on live Picoso orders',
    narrative:
      'Ask about customers, products, radius (km), revenue, cancelled vs delivered counts, AOV, or top products. Numbers always come from live Mongo aggregates — training samples only teach field meanings.',
    metrics: [],
    definitions: [],
    calculationSteps: [],
    sources: [],
    dimensions: {},
    explanation: 'General chat — no metric query required.',
    confidence: { overall: 1 },
    clarification: null,
    freshness: 'live',
    period: null,
  };
}
