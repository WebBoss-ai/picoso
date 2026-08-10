/**
 * Deterministic intent templates for common questions.
 * Used by agent fallback; full agent may still use Cohere when configured.
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

export function extractDays(message) {
  const daysMatch = String(message).match(/(?:last|pichle|past)\s+(\d+)\s*(?:din|days?)/i);
  return daysMatch ? Number(daysMatch[1]) : 90;
}

/** True if this looks like a business analytics question (prefer tools over free chat). */
export function isAnalyticsIntent(message = '') {
  const m = String(message);
  if (matchTemplate(m)) return true;
  return /\b(kitne|kitna|how many|count|revenue|sales|repeat|customer|order|product|km|buyers?|aov|inactive|segment)\b/i.test(
    m
  );
}

const FOOD =
  'rice|bowl|wrap|sandwich|salad|coffee|tikka|paneer|meal|snack|dessert|drink|biryani|thali|burger|pizza|pasta|smoothie|shake';

/**
 * Extract a plausible product phrase from free text (EN/Hinglish).
 */
export function extractProductQuery(message = '') {
  // Drop geo + noise tokens that pollute English product spans
  let s = String(message)
    .replace(/\d+(?:\.\d+)?\s*km/gi, ' ')
    .replace(
      /\b(ke|ki|ka|andar|mein|me|kitne|kitna|customers?|logon?|logo|ne|liya|liye|lene|wale|order|orders?|buyers?|aur|unmein|se|repeat|hain|hai|how|many|people|who|bought|buy|within|radius)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  // "Paneer Tikka Rice" — Title Case or multi-word ending in food term
  const eng = s.match(
    new RegExp(
      `\\b([A-Za-z][A-Za-z]+(?:\\s+[A-Za-z][A-Za-z]+){0,5}\\s+(?:${FOOD}))\\b`,
      'i'
    )
  );
  if (eng) return cleanProductPhrase(eng[1]);

  // Starts with food signal word
  const rev = s.match(new RegExp(`\\b((?:${FOOD})(?:\\s+[A-Za-z][A-Za-z]+){0,4})\\b`, 'i'));
  if (rev) return cleanProductPhrase(rev[1]);

  const q = String(message).match(/["“](.+?)["”]/);
  if (q) return cleanProductPhrase(q[1]);

  // Last resort: consecutive English words 2–5
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

export function matchTemplate(message = '') {
  const radiusKm = extractRadiusKm(message);
  const days = extractDays(message);
  const productQuery = extractProductQuery(message);

  if (/top product|best.?sell|sabse (zyada|jyada)|most sold|sell the most|products sell/i.test(message)) {
    return { id: 'top_products', args: { days, limit: 10 } };
  }
  if (/inactive|60\s*din|haven'?t ordered|nahi order/i.test(message)) {
    return { id: 'inactive_customers', args: { days_inactive: 60 } };
  }
  if (/\baov\b|average order/i.test(message)) {
    return { id: 'get_aov', args: { days } };
  }
  if (/revenue|sales|kitna sale|kitna kamaya|total revenue/i.test(message)) {
    return { id: 'calculate_revenue', args: { days } };
  }

  if (productQuery) {
    return {
      id: 'product_buyers',
      productQuery,
      args: { days, radius_km: radiusKm },
      wantRepeat: /repeat/i.test(message),
    };
  }

  if (/repeat/i.test(message)) {
    return { id: 'get_repeat_customers', args: { days, radius_km: radiusKm } };
  }

  if (radiusKm != null) {
    return { id: 'find_customers_within_radius', args: { radius_km: radiusKm, days } };
  }

  return null;
}
