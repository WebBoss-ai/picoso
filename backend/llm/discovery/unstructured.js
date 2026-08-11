/**
 * Train from any messy paste: admin screenshots, CSR dumps, notes, JSON, logs.
 * Heuristic first; optional Cohere pass when structured extraction is incomplete.
 */

import { createLlmProvider } from '../provider/cohere.js';

const MONEY_RE = /₹\s*([\d,]+(?:\.\d+)?)/i;
const PHONE_RE = /(?:\+91[\s-]*)?([6-9]\d{9})/;
const LATLNG_RE = /(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/;
const ORDER_ID_RE = /#([A-F0-9]{6,12})\b/gi;
const DIST_RE = /([\d.]+)\s*(m|km)\s*away/i;
const DATE_RE =
  /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s*,?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i;

function parseMoney(s) {
  if (s == null) return null;
  const m = String(s).match(MONEY_RE) || String(s).match(/([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  return Number(String(m[1]).replace(/,/g, ''));
}

function parsePhone(line) {
  const m = String(line).match(PHONE_RE);
  return m ? m[1] : null;
}

function cleanLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Split blob into order-like blocks using #ORDERID anchors.
 * Falls back to blank-line paragraphs if no ids found.
 */
export function splitRecords(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];

  // Try JSON first
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((o, i) => ({
        kind: 'json',
        raw: JSON.stringify(o, null, 2),
        index: i,
        object: o,
      }));
    } catch {
      /* fall through */
    }
  }

  const ids = [...text.matchAll(ORDER_ID_RE)];
  if (ids.length >= 1) {
    const blocks = [];
    for (let i = 0; i < ids.length; i++) {
      const start = ids[i].index;
      const end = i + 1 < ids.length ? ids[i + 1].index : text.length;
      blocks.push({
        kind: 'block',
        raw: text.slice(start, end).trim(),
        index: i,
        orderIdHint: ids[i][1],
      });
    }
    return blocks;
  }

  // Paragraph split
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 40);
  if (parts.length > 1) {
    return parts.map((raw, index) => ({ kind: 'block', raw, index }));
  }

  return [{ kind: 'block', raw: text, index: 0 }];
}

/**
 * Parse a single operations-card / order paste into structured fields.
 */
export function parseOrderCardBlock(block) {
  const raw = block.raw || '';
  const lines = cleanLines(raw);
  const joined = lines.join('\n');

  const record = {
    _source: 'unstructured_paste',
    orderId: block.orderIdHint || null,
    status: null,
    paymentMethod: null,
    paymentStatus: null,
    distanceMeters: null,
    distanceLabel: null,
    customerName: null,
    phone: null,
    email: null,
    orderedAt: null,
    grandTotal: null,
    subtotal: null,
    deliveryFee: null,
    itemCountLabel: null,
    items: [],
    customerLat: null,
    customerLng: null,
    address: null,
    landmark: null,
    addressType: null,
    eta: null,
    lastUpdated: null,
    notes: [],
    rawPreview: raw.slice(0, 1200),
  };

  // Order id from first #TOKEN
  const idMatch = raw.match(/#([A-F0-9]{6,12})/i);
  if (idMatch) record.orderId = idMatch[1].toUpperCase();

  // Status / payment lines near the top
  const statusWords = new Set([
    'delivered',
    'cancelled',
    'canceled',
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'out for delivery',
    'placed',
    'failed',
    'refunded',
  ]);
  const payMethods = new Set(['cod', 'online', 'upi', 'card', 'wallet', 'razorpay', 'prepaid']);

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const low = lines[i].toLowerCase();
    if (!record.status && statusWords.has(low)) {
      record.status = low.replace(/\s+/g, '_');
      continue;
    }
    if (!record.paymentMethod && payMethods.has(low)) {
      record.paymentMethod = low.toUpperCase() === 'COD' ? 'COD' : low;
      continue;
    }
    // second pending often payment status
    if (low === 'pending' || low === 'paid' || low === 'unpaid' || low === 'failed') {
      if (!record.paymentStatus) record.paymentStatus = low;
      else if (!record.status && statusWords.has(low)) record.status = low;
    }
  }

  const dist = raw.match(DIST_RE);
  if (dist) {
    const n = Number(dist[1]);
    const unit = dist[2].toLowerCase();
    record.distanceLabel = `${dist[1]} ${unit} away`;
    record.distanceMeters = unit === 'km' ? Math.round(n * 1000) : Math.round(n);
  }

  // Name • phone
  for (const line of lines) {
    if (line.includes('•') || PHONE_RE.test(line)) {
      const phone = parsePhone(line);
      if (phone) record.phone = phone;
      const namePart = line.split('•')[0].replace(PHONE_RE, '').trim();
      if (namePart && !/^[₹#\d]/.test(namePart) && namePart.length < 60) {
        record.customerName = namePart.replace(/\s+/g, ' ').trim();
      }
      if (record.phone) break;
    }
  }
  if (!record.phone) {
    const p = parsePhone(raw);
    if (p) record.phone = p;
  }

  // Order datetime — first date-like after name
  for (const line of lines) {
    if (DATE_RE.test(line) && !/eta|updated/i.test(line)) {
      record.orderedAt = line.match(DATE_RE)?.[0] || line;
      break;
    }
  }

  // Grand total: prefer "Grand Total" then first standalone ₹ near item counts
  const grand = raw.match(/Grand\s*Total\s*\n?\s*₹\s*([\d,]+)/i);
  if (grand) record.grandTotal = Number(grand[1].replace(/,/g, ''));
  if (record.grandTotal == null) {
    // line that is only money after date
    for (const line of lines) {
      if (/^₹\s*[\d,]+/.test(line)) {
        record.grandTotal = parseMoney(line);
        break;
      }
    }
  }

  const sub = raw.match(/Subtotal\s*\n?\s*₹\s*([\d,]+)/i);
  if (sub) record.subtotal = Number(sub[1].replace(/,/g, ''));
  const fee = raw.match(/Delivery\s*fee\s*\n?\s*₹\s*([\d,]+)/i);
  if (fee) record.deliveryFee = Number(fee[1].replace(/,/g, ''));

  const itemCount = raw.match(/(\d+)\s*items?\s*\+\s*₹\s*([\d,]+)\s*delivery/i);
  if (itemCount) {
    record.itemCountLabel = `${itemCount[1]} item(s) + ₹${itemCount[2]} delivery`;
    if (record.deliveryFee == null) {
      record.deliveryFee = Number(itemCount[2].replace(/,/g, ''));
    }
  }

  // Items: look for "Items Ordered" section until "Price Breakdown"
  const itemsSection = raw.match(
    /Items\s*Ordered([\s\S]*?)(?:Price\s*Breakdown|Delivery\s*Details|$)/i
  );
  if (itemsSection) {
    const chunk = itemsSection[1];
    const namePrice = [
      ...chunk.matchAll(
        /([A-Za-z][A-Za-z0-9 &+',.\-]{2,60})\s*(?:\n\1\s*)?\n₹\s*([\d,]+)\s*[×x]\s*(\d+)/gi
      ),
    ];
    const seen = new Set();
    for (const m of namePrice) {
      const name = m[1].trim();
      if (/^(items|subtotal|price|delivery)/i.test(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const unitPrice = Number(m[2].replace(/,/g, ''));
      const qty = Number(m[3]);
      record.items.push({
        name,
        unitPrice,
        quantity: qty,
        lineTotal: unitPrice * qty,
      });
    }
  }

  const pin = raw.match(LATLNG_RE);
  if (pin) {
    record.customerLat = Number(pin[1]);
    record.customerLng = Number(pin[2]);
  }

  const landmark = raw.match(/Landmark:\s*(.+)/i);
  if (landmark) record.landmark = landmark[1].trim();

  // Address: line with Home · or flat, Sector
  for (const line of lines) {
    if (/Home\s*·|Sector\s*\d|Gurgaon|Gurugram|Delhi|Noida|apartment|houser/i.test(line)) {
      record.address = line.replace(/^Home\s*·\s*/i, '').trim();
      if (/^Home/i.test(line)) record.addressType = 'Home';
      break;
    }
  }

  const email = raw.match(/Email:\s*(\S+@\S+)/i);
  if (email) record.email = email[1].trim();
  else if (record.phone) {
    // picoso pattern often phone@picoso.in
    const em = raw.match(new RegExp(`${record.phone}@[^\\s]+`, 'i'));
    if (em) record.email = em[0];
  }

  const eta = raw.match(/ETA:\s*(.+)/i);
  if (eta) record.eta = eta[1].trim();

  const updated = raw.match(/Last\s*updated:\s*(.+)/i);
  if (updated) record.lastUpdated = updated[1].trim();

  // confidence score for this parse
  let score = 0;
  if (record.orderId) score += 2;
  if (record.status) score += 1;
  if (record.grandTotal != null) score += 2;
  if (record.phone) score += 1;
  if (record.items.length) score += 2;
  if (record.customerLat != null) score += 1;
  record._confidence = score / 9;

  return record;
}

export function parseBlock(block) {
  if (block.kind === 'json' && block.object && typeof block.object === 'object') {
    return { ...block.object, _source: 'json_paste', _confidence: 1 };
  }
  return parseOrderCardBlock(block);
}

function typeOfValue(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v) || DATE_RE.test(v)) return 'date_string';
    if (PHONE_RE.test(v) && v.replace(/\D/g, '').length >= 10) return 'phone';
    if (/@/.test(v)) return 'email';
    if (/^-?\d+(\.\d+)?$/.test(v)) return 'number_string';
    return 'string';
  }
  if (typeof v === 'object') return 'object';
  return typeof v;
}

/**
 * Build JSON Schema-ish object + parameter list from records.
 */
export function inferJsonSchema(records, title = 'TrainedEntity') {
  const fields = {};
  const samples = {};

  for (const rec of records) {
    for (const [k, v] of Object.entries(rec || {})) {
      if (k.startsWith('_')) continue;
      if (v === null || v === undefined || v === '') continue;
      const t = typeOfValue(v);
      if (!fields[k]) {
        fields[k] = { types: new Set(), enumCandidates: new Set(), arrayItem: null };
        samples[k] = [];
      }
      fields[k].types.add(t);
      if (t === 'string' || t === 'date_string') {
        if (String(v).length < 40) fields[k].enumCandidates.add(String(v));
      }
      if (samples[k].length < 6) {
        samples[k].push(
          Array.isArray(v) ? v.slice(0, 2) : typeof v === 'object' ? { ...v } : v
        );
      }
      if (Array.isArray(v) && v[0] && typeof v[0] === 'object') {
        fields[k].arrayItem = 'object';
      }
    }
  }

  const properties = {};
  const parameters = [];

  for (const [name, meta] of Object.entries(fields)) {
    const types = [...meta.types].filter((t) => t !== 'null');
    let jsonType = 'string';
    if (types.includes('integer') && types.length === 1) jsonType = 'integer';
    else if (types.includes('number') || types.includes('integer')) jsonType = 'number';
    else if (types.includes('boolean')) jsonType = 'boolean';
    else if (types.includes('array') || meta.arrayItem) jsonType = 'array';
    else if (types.includes('object')) jsonType = 'object';
    else if (types.includes('date_string')) jsonType = 'string';

    const enumVals =
      meta.enumCandidates.size >= 1 && meta.enumCandidates.size <= 12
        ? [...meta.enumCandidates]
        : undefined;

    properties[name] = {
      type: jsonType,
      description: describeField(name, jsonType),
      examples: samples[name],
    };
    if (enumVals && enumVals.length <= 12 && jsonType === 'string') {
      properties[name].enum = enumVals;
    }
    if (jsonType === 'array') {
      properties[name].items = { type: meta.arrayItem === 'object' ? 'object' : 'string' };
    }

    parameters.push({
      name,
      type: jsonType,
      description: properties[name].description,
      sampleValues: samples[name],
      enumValues: enumVals || [],
      nullRate: 1 - samples[name].length / Math.max(records.length, 1),
    });
  }

  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title,
    type: 'object',
    description: `Auto-inferred from ${records.length} unstructured sample(s)`,
    properties,
    required: parameters
      .filter((p) => p.nullRate < 0.35)
      .map((p) => p.name)
      .slice(0, 20),
  };

  return { schema, parameters };
}

function describeField(name, type) {
  const map = {
    orderId: 'Unique order / ticket id',
    status: 'Lifecycle status (delivered, cancelled, …)',
    paymentMethod: 'How the customer paid (COD, UPI, …)',
    paymentStatus: 'Payment settlement status',
    distanceMeters: 'Customer distance from store in meters',
    distanceLabel: 'Human distance label',
    customerName: 'Customer display name',
    phone: 'Customer phone (last 10 digits preference)',
    email: 'Customer email',
    orderedAt: 'Order placed time (as written)',
    grandTotal: 'Order grand total amount',
    subtotal: 'Items subtotal before delivery',
    deliveryFee: 'Delivery fee amount',
    itemCountLabel: 'Item count + delivery fee label',
    items: 'Line items ordered (name, unit price, qty)',
    customerLat: 'Customer pin latitude',
    customerLng: 'Customer pin longitude',
    address: 'Delivery address text',
    landmark: 'Landmark near delivery',
    addressType: 'Home / Work / Other',
    eta: 'Promised or ETA time text',
    lastUpdated: 'Last status update time text',
  };
  return map[name] || `Inferred ${type} field "${name}"`;
}

/**
 * Human-readable trained brain for operators.
 */
export function buildTextBrain({
  label,
  records,
  parameters,
  businessContext,
  domainGuess,
}) {
  const lines = [];
  lines.push(`# Trained brain: ${label}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Samples learned: ${records.length}`);
  if (domainGuess) lines.push(`Domain guess: ${domainGuess}`);
  if (businessContext) {
    lines.push('');
    lines.push('## Business context');
    lines.push(businessContext);
  }
  lines.push('');
  lines.push('## Parameters (what the AI understands)');
  for (const p of parameters) {
    const samples = (p.sampleValues || [])
      .slice(0, 3)
      .map((s) => (typeof s === 'object' ? JSON.stringify(s) : String(s)))
      .join(' | ');
    const enums =
      p.enumValues?.length > 0 ? ` · values: ${p.enumValues.join(', ')}` : '';
    lines.push(`- **${p.name}** (${p.type}): ${p.description}${enums}`);
    if (samples) lines.push(`  examples: ${samples}`);
  }

  // status distribution
  const statusCounts = {};
  for (const r of records) {
    const s = r.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  if (Object.keys(statusCounts).length) {
    lines.push('');
    lines.push('## Status mix in sample');
    for (const [k, v] of Object.entries(statusCounts)) {
      lines.push(`- ${k}: ${v}`);
    }
  }

  const money = records
    .map((r) => r.grandTotal)
    .filter((n) => typeof n === 'number');
  if (money.length) {
    const sum = money.reduce((a, b) => a + b, 0);
    lines.push('');
    lines.push('## Sample money check (paste only — not full DB)');
    lines.push(`- orders in paste: ${money.length}`);
    lines.push(`- sum grandTotal: ₹${sum}`);
    lines.push(`- avg grandTotal: ₹${Math.round(sum / money.length)}`);
  }

  lines.push('');
  lines.push('## Normalized sample records');
  records.slice(0, 8).forEach((r, i) => {
    lines.push('');
    lines.push(`### Record ${i + 1}${r.orderId ? ` · #${r.orderId}` : ''}`);
    lines.push(
      [
        r.status && `status=${r.status}`,
        r.paymentMethod && `pay=${r.paymentMethod}`,
        r.grandTotal != null && `total=₹${r.grandTotal}`,
        r.customerName && `customer=${r.customerName}`,
        r.phone && `phone=${r.phone}`,
        r.distanceLabel && r.distanceLabel,
        r.address && `addr=${r.address}`,
      ]
        .filter(Boolean)
        .join(' · ')
    );
    if (r.items?.length) {
      lines.push(
        'items: ' +
          r.items.map((it) => `${it.name} ×${it.quantity} @₹${it.unitPrice}`).join('; ')
      );
    }
    if (r.customerLat != null) {
      lines.push(`pin: ${r.customerLat}, ${r.customerLng}`);
    }
  });

  lines.push('');
  lines.push('## How to ask');
  lines.push('- “How many delivered vs cancelled in what I trained?”');
  lines.push('- “Average order value in trained samples”');
  lines.push('- “List customers beyond 2 km in samples”');
  lines.push('- After Mongo discover: same language maps onto live collections.');

  return lines.join('\n');
}

function guessDomain(records) {
  const keys = new Set();
  for (const r of records) Object.keys(r).forEach((k) => keys.add(k));
  if (keys.has('orderId') || keys.has('grandTotal') || keys.has('items')) {
    return 'food_delivery_orders';
  }
  if (keys.has('phone') && keys.has('customerName')) return 'crm_contacts';
  return 'generic_records';
}

/**
 * Draft semantic model pieces from unstructured training.
 */
export function draftModelFromUnstructured({ label, records, parameters, businessContext }) {
  const domain = guessDomain(records);
  const entities = [
    {
      id: 'trained_record',
      name: label || 'Trained records',
      collectionName: '__trained_samples__',
      description: `Unstructured paste corpus (${records.length} samples). Query via trained-samples tools.`,
      primaryKey: 'orderId',
      labelField: 'customerName',
      role: domain.includes('order') ? 'order' : 'other',
      confirmed: false,
    },
  ];

  if (records.some((r) => r.items?.length)) {
    entities.push({
      id: 'trained_line_item',
      name: 'Trained line items',
      collectionName: '__trained_line_items__',
      description: 'Line items nested under trained order records',
      primaryKey: 'name',
      labelField: 'name',
      role: 'line_item',
      confirmed: false,
    });
  }

  const metrics = [
    {
      id: 'trained_count',
      name: 'Trained sample count',
      description: 'Number of records in the trained paste corpus',
      aggregation: 'count',
      entity: '__trained_samples__',
      field: null,
      filters: [],
      confirmed: false,
    },
  ];

  if (records.some((r) => typeof r.grandTotal === 'number')) {
    metrics.push(
      {
        id: 'trained_revenue',
        name: 'Trained sample revenue',
        description: 'Sum of grandTotal in paste corpus',
        aggregation: 'sum',
        entity: '__trained_samples__',
        field: 'grandTotal',
        filters: [],
        confirmed: false,
      },
      {
        id: 'trained_aov',
        name: 'Trained sample AOV',
        description: 'Average grandTotal in paste corpus',
        aggregation: 'avg',
        entity: '__trained_samples__',
        field: 'grandTotal',
        filters: [],
        confirmed: false,
      }
    );
  }

  const dimensions = parameters
    .filter((p) =>
      ['status', 'paymentMethod', 'paymentStatus', 'addressType', 'customerName'].includes(
        p.name
      )
    )
    .map((p) => ({
      id: `dim_${p.name}`,
      name: p.name,
      entity: '__trained_samples__',
      field: p.name,
      dataType: p.type === 'number' || p.type === 'integer' ? 'numeric' : 'categorical',
      type: p.type === 'number' || p.type === 'integer' ? 'numeric' : 'categorical',
      confirmed: false,
    }));

  if (parameters.some((p) => p.name === 'customerLat')) {
    dimensions.push({
      id: 'dim_geo',
      name: 'Customer pin',
      entity: '__trained_samples__',
      field: 'customerLat',
      dataType: 'geo',
      type: 'geo',
      confirmed: false,
    });
  }

  const glossary = [
    {
      term: 'trained samples',
      definition:
        'Records extracted from user-pasted unorganized text/UI dumps. Numbers over this set come from the corpus only unless Mongo is also connected.',
    },
    {
      term: 'grand total',
      definition: 'Final payable amount including delivery fee when present on the card.',
    },
    {
      term: 'COD',
      definition: 'Cash on delivery payment method.',
    },
    {
      term: 'customer pin',
      definition: 'Lat/lng of delivery location when present as “Customer Pin”.',
    },
  ];

  if (businessContext) {
    glossary.push({ term: 'business context', definition: businessContext });
  }

  return {
    entities,
    metrics,
    dimensions,
    relationships: [],
    glossary,
    domain,
  };
}

/**
 * Optional Cohere pass: recover structure when heuristics are weak.
 */
async function enrichWithLlm(rawText, heuristicRecords) {
  if (!process.env.COHERE_API_KEY) return null;
  const avg =
    heuristicRecords.reduce((s, r) => s + (r._confidence || 0), 0) /
    Math.max(heuristicRecords.length, 1);
  if (avg >= 0.45 && heuristicRecords.length >= 1) return null;

  try {
    const provider = createLlmProvider();
    const sample = String(rawText).slice(0, 12000);
    const res = await provider.chat({
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You extract structured JSON from messy operational dumps (orders, tickets, CRM). Return ONLY a JSON object: {"records":[{...}]}. Fields when present: orderId,status,paymentMethod,paymentStatus,distanceMeters,customerName,phone,email,orderedAt,grandTotal,subtotal,deliveryFee,items[{name,unitPrice,quantity,lineTotal}],customerLat,customerLng,address,landmark,eta,lastUpdated. Numbers as numbers. No markdown.',
        },
        {
          role: 'user',
          content: `Extract all records from this paste:\n\n${sample}`,
        },
      ],
    });
    let text = (res.text || '').trim();
    text = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed?.records)
      ? parsed.records
      : Array.isArray(parsed)
        ? parsed
        : null;
    if (!arr?.length) return null;
    return arr.map((r) => ({
      ...r,
      _source: 'llm_extract',
      _confidence: 0.85,
    }));
  } catch {
    return null;
  }
}

/**
 * Full unstructured training pipeline.
 */
export async function trainFromUnstructuredText(rawText, options = {}) {
  const text = String(rawText || '').trim();
  if (text.length < 20) {
    throw new Error('Paste at least a bit of real data (order cards, JSON, notes).');
  }
  if (text.length > 400_000) {
    throw new Error('Paste too large (max ~400KB). Split into batches.');
  }

  const label = options.label || 'Unstructured corpus';
  const businessContext = options.businessContext || '';

  const blocks = splitRecords(text);
  let records = blocks.map(parseBlock).filter((r) => {
    // drop empty noise
    return (
      r.orderId ||
      r.grandTotal != null ||
      r.phone ||
      r.customerName ||
      (r.items && r.items.length) ||
      Object.keys(r).filter((k) => !k.startsWith('_') && r[k] != null).length >= 3
    );
  });

  if (!records.length) {
    const llm = await enrichWithLlm(text, []);
    if (llm?.length) records = llm;
  } else {
    const low =
      records.reduce((s, r) => s + (r._confidence || 0), 0) / records.length < 0.35;
    if (low) {
      const llm = await enrichWithLlm(text, records);
      if (llm?.length) records = llm;
    }
  }

  if (!records.length) {
    throw new Error(
      'Could not extract records from this paste. Try including order cards with IDs like #A47C9AFD, or paste raw JSON.'
    );
  }

  // strip internal keys for schema but keep for analysis
  const cleanRecords = records.map((r) => {
    const o = { ...r };
    delete o.rawPreview;
    return o;
  });

  const { schema, parameters } = inferJsonSchema(cleanRecords, label);
  const domain = guessDomain(cleanRecords);
  const textBrain = buildTextBrain({
    label,
    records: cleanRecords,
    parameters,
    businessContext,
    domainGuess: domain,
  });
  const draft = draftModelFromUnstructured({
    label,
    records: cleanRecords,
    parameters,
    businessContext,
  });

  return {
    label,
    domain,
    recordCount: cleanRecords.length,
    records: cleanRecords,
    jsonSchema: schema,
    parameters,
    textBrain,
    draft,
    rawPreview: text.slice(0, 4000),
    extraction: {
      method: cleanRecords[0]?._source || 'heuristic',
      avgConfidence:
        Math.round(
          (cleanRecords.reduce((s, r) => s + (r._confidence || 0), 0) /
            cleanRecords.length) *
            100
        ) / 100,
    },
  };
}

/**
 * Aggregate helpers over in-memory trained samples.
 */
export function queryTrainedRecords(records, options = {}) {
  let rows = Array.isArray(records) ? [...records] : [];
  const { status, paymentMethod, minTotal, maxTotal, minDistanceM, maxDistanceM } =
    options;

  if (status) {
    const s = String(status).toLowerCase();
    rows = rows.filter((r) => String(r.status || '').toLowerCase() === s);
  }
  if (paymentMethod) {
    const p = String(paymentMethod).toLowerCase();
    rows = rows.filter((r) => String(r.paymentMethod || '').toLowerCase() === p);
  }
  if (minTotal != null) rows = rows.filter((r) => (r.grandTotal ?? 0) >= Number(minTotal));
  if (maxTotal != null) rows = rows.filter((r) => (r.grandTotal ?? 0) <= Number(maxTotal));
  if (minDistanceM != null) {
    rows = rows.filter((r) => (r.distanceMeters ?? 0) >= Number(minDistanceM));
  }
  if (maxDistanceM != null) {
    rows = rows.filter((r) => (r.distanceMeters ?? Infinity) <= Number(maxDistanceM));
  }

  const aggregation = options.aggregation || 'count';
  const field = options.field || 'grandTotal';

  if (aggregation === 'count') {
    return { value: rows.length, unit: 'count', rows: options.includeRows ? rows : undefined };
  }
  const nums = rows.map((r) => r[field]).filter((n) => typeof n === 'number');
  if (aggregation === 'sum') {
    return {
      value: nums.reduce((a, b) => a + b, 0),
      unit: field === 'grandTotal' ? 'INR' : 'number',
    };
  }
  if (aggregation === 'avg') {
    return {
      value: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0,
      unit: field === 'grandTotal' ? 'INR' : 'number',
    };
  }
  if (aggregation === 'min') {
    return { value: nums.length ? Math.min(...nums) : null, unit: 'number' };
  }
  if (aggregation === 'max') {
    return { value: nums.length ? Math.max(...nums) : null, unit: 'number' };
  }
  if (aggregation === 'group_by_status') {
    const g = {};
    for (const r of rows) {
      const k = r.status || 'unknown';
      g[k] = (g[k] || 0) + 1;
    }
    return { value: g, unit: 'map' };
  }
  return { value: rows.length, unit: 'count' };
}
