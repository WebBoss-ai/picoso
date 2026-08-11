/**
 * Data hygiene for company-owned ops console.
 * Customer identity (name, phone, email, address) is intentionally fully visible —
 * this surface is for the business operators, not public end-users.
 * Only credentials / secrets stay redacted.
 */

export function maskPhone(phone) {
  // Pass-through for company console (kept for callers that import the name).
  return phone == null ? null : String(phone);
}

export function maskEmail(email) {
  return email == null ? null : String(email);
}

export function maskName(name) {
  return name == null ? '' : String(name);
}

/** Normalize a customer row for tools, answers, and export — full identity fields. */
export function sanitizeCustomerRow(row = {}) {
  const id = row.customerId ?? row._id ?? row.userId ?? null;
  const out = {
    customerId: id != null ? String(id) : null,
    name: row.name || row.customerName || row.fullname || '',
    phone: row.phone ?? row.mobile ?? row.contact ?? null,
    email: row.email ?? null,
    orders: row.orders ?? row.orderCount ?? undefined,
    spend: row.spend ?? row.totalSpend ?? row.revenue ?? undefined,
    lastOrder: row.lastOrder ?? row.lastOrderAt ?? undefined,
    distanceKm: row.distanceKm ?? row.distance ?? undefined,
  };

  if (row.address != null) out.address = row.address;
  if (row.pin != null || row.pincode != null || row.postalCode != null) {
    out.pincode = row.pin ?? row.pincode ?? row.postalCode;
  }
  if (row.city != null) out.city = row.city;
  if (row.lat != null || row.lng != null) {
    out.lat = row.lat;
    out.lng = row.lng;
  }

  // Drop undefined keys so export columns stay clean
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

/**
 * Deep clean: keep contact fields; redact only secrets / connection material.
 */
export function stripPiiDeep(value) {
  if (Array.isArray(value)) return value.map(stripPiiDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = k.toLowerCase();
      if (
        key.includes('password') ||
        key.includes('secret') ||
        key.includes('apikey') ||
        key.includes('api_key') ||
        key === 'uri' ||
        key === 'connectionstring' ||
        key === 'connection_string' ||
        key === 'token' ||
        key === 'authorization'
      ) {
        out[k] = '[redacted]';
      } else {
        out[k] = stripPiiDeep(v);
      }
    }
    return out;
  }
  return value;
}
