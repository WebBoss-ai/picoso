/** Mask PII before anything reaches Cohere or the public answer surface. */

export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone ?? null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string') return email ?? null;
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const visible = user.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function maskName(name) {
  if (!name || typeof name !== 'string') return name ?? '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length <= 1 ? '*' : `${parts[0][0]}***`;
  }
  return `${parts[0][0]}*** ${parts[parts.length - 1][0]}***`;
}

export function sanitizeCustomerRow(row = {}) {
  return {
    customerId: row.customerId ?? row._id ?? row.userId ?? null,
    name: maskName(row.name || row.customerName || ''),
    phone: maskPhone(row.phone),
    email: row.email ? maskEmail(row.email) : undefined,
    orders: row.orders ?? row.orderCount ?? undefined,
    spend: row.spend ?? row.totalSpend ?? undefined,
    lastOrder: row.lastOrder ?? row.lastOrderAt ?? undefined,
    distanceKm: row.distanceKm ?? row.distance ?? undefined,
  };
}

export function stripPiiDeep(value) {
  if (Array.isArray(value)) return value.map(stripPiiDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = k.toLowerCase();
      if (key === 'phone' || key === 'mobile') out[k] = maskPhone(String(v ?? ''));
      else if (key === 'email') out[k] = maskEmail(String(v ?? ''));
      else if (key === 'name' || key === 'customername' || key === 'fullname') {
        out[k] = maskName(String(v ?? ''));
      } else if (key.includes('password') || key.includes('uri') || key.includes('secret') || key.includes('apikey')) {
        out[k] = '[redacted]';
      } else {
        out[k] = stripPiiDeep(v);
      }
    }
    return out;
  }
  return value;
}
