/**
 * Query / result safety checks for the LLM analytics plane.
 */

const MAX_LIMIT = 500;
const MAX_RADIUS_KM = 50;
const MAX_DAYS_LOOKBACK = 365 * 5;

export function clampLimit(n, fallback = 50) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(Math.floor(v), MAX_LIMIT);
}

export function clampRadiusKm(n, fallback = 2) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(v, MAX_RADIUS_KM);
}

export function clampDays(n, fallback = 90) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(Math.floor(v), MAX_DAYS_LOOKBACK);
}

/**
 * Sanity checks on structured analytics results.
 * Returns { ok, issues[] }.
 */
export function validateMetricResult(payload = {}) {
  const issues = [];
  const metrics = payload.metrics || [];
  const byId = Object.fromEntries(
    metrics.filter((m) => m && m.id != null).map((m) => [m.id, m.value])
  );

  const unique = byId.unique_customers;
  const orders = byId.orders;
  const revenue = byId.revenue;
  const repeat = byId.repeat_customers;
  const rate = byId.repeat_rate;

  if (unique != null && unique < 0) issues.push('unique_customers negative');
  if (orders != null && orders < 0) issues.push('orders negative');
  if (revenue != null && revenue < 0) issues.push('revenue negative');
  if (unique != null && orders != null && unique > orders * 2 && orders > 0) {
    // unusual but not impossible if multi product filters — soft warn only
  }
  if (repeat != null && unique != null && repeat > unique) {
    issues.push('repeat_customers exceeds unique_customers');
  }
  if (rate != null && (rate < 0 || rate > 1.0001)) {
    issues.push('repeat_rate out of [0,1]');
  }
  if (orders != null && unique != null && unique > 0 && orders < unique) {
    // each unique customer has at least one order; orders should be >= uniques
    issues.push('orders less than unique_customers');
  }

  return { ok: issues.length === 0, issues };
}

export function withTimeout(promise, ms = 20000, label = 'query') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
