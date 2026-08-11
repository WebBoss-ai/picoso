/**
 * Deterministic intent templates + date/geo extractors for Picoso Intelligence.
 */

export function isGreeting(message = '') {
  return /^(hi|hello|hey|namaste|hola|yo|sup|hiya|good\s*(morning|evening|afternoon)|whats?\s*up|what'?s\s*up)[\s!.?]*$/i.test(
    String(message).trim()
  );
}

export function extractRadiusKm(message) {
  const radiusMatch = String(message).toLowerCase().match(/(\d+(?:\.\d+)?)\s*km/);
  return radiusMatch ? Number(radiusMatch[1]) : null;
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
  if (matchTemplate(m)) return true;
  return /\b(kitne|kitna|how many|count|revenue|sales|repeat|customer|order|product|km|buyers?|aov|inactive|segment|yesterday|today|month)\b/i.test(
    m
  );
}

const FOOD =
  'rice|bowl|wrap|sandwich|salad|coffee|tikka|paneer|meal|snack|dessert|drink|biryani|thali|burger|pizza|pasta|smoothie|shake';

/**
 * Extract a plausible product phrase from free text (EN/Hinglish).
 */
export function extractProductQuery(message = '') {
  let s = String(message)
    .replace(/\d+(?:\.\d+)?\s*km/gi, ' ')
    .replace(
      /\b(ke|ki|ka|andar|mein|me|kitne|kitna|customers?|logon?|logo|ne|liya|liye|lene|wale|order|orders?|buyers?|aur|unmein|se|repeat|hain|hai|how|many|people|who|bought|buy|within|radius|yesterday|today|last|month|total|sales|revenue)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  const eng = s.match(
    new RegExp(
      `\\b([A-Za-z][A-Za-z]+(?:\\s+[A-Za-z][A-Za-z]+){0,5}\\s+(?:${FOOD}))\\b`,
      'i'
    )
  );
  if (eng) return cleanProductPhrase(eng[1]);

  const rev = s.match(new RegExp(`\\b((?:${FOOD})(?:\\s+[A-Za-z][A-Za-z]+){0,4})\\b`, 'i'));
  if (rev) return cleanProductPhrase(rev[1]);

  const q = String(message).match(/["“](.+?)["”]/);
  if (q) return cleanProductPhrase(q[1]);

  const loose = s.match(/\b([A-Za-z][A-Za-z]+(?:\s+[A-Za-z][A-Za-z]+){1,4})\b/);
  if (loose && !/^(last|what|which|total|average)\b/i.test(loose[1])) {
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
  const radiusKm = extractRadiusKm(message);
  const dateArgs = dateArgsFromMessage(message);
  const productQuery = extractProductQuery(message);

  if (/top product|best.?sell|sabse (zyada|jyada)|most sold|sell the most|products sell/i.test(message)) {
    return { id: 'top_products', args: { ...dateArgs, limit: 10 } };
  }
  if (/inactive|60\s*din|haven'?t ordered|nahi order/i.test(message)) {
    return { id: 'inactive_customers', args: { days_inactive: 60 } };
  }
  if (/\baov\b|average order/i.test(message)) {
    return { id: 'get_aov', args: { ...dateArgs } };
  }

  // Orders count — including "total orders of yesterday"
  if (
    /\b(orders?|order count)\b/i.test(message) &&
    !/customer/i.test(message) &&
    !productQuery
  ) {
    return { id: 'count_orders', args: { ...dateArgs } };
  }

  // Revenue / sales
  if (
    /revenue|sales|kitna sale|kitna kamaya|total revenue|total sales|sale\b/i.test(
      message
    ) &&
    !productQuery
  ) {
    return { id: 'calculate_revenue', args: { ...dateArgs } };
  }

  if (productQuery) {
    return {
      id: 'product_buyers',
      productQuery,
      args: { ...dateArgs, radius_km: radiusKm },
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
