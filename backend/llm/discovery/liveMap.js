/**
 * Map concepts learned from samples → live Mongo collections/paths.
 * Samples teach structure; queries execute against live data.
 */

import { STORE_LOCATION } from '../semantic/picosoModel.js';

/**
 * Default Picoso live map — used when domain looks like food delivery / orders.
 */
export function defaultPicosoLiveMap() {
  return {
    collectionHints: {
      orders: ['orders', 'order'],
      products: ['bowls', 'products', 'items'],
      customers: ['users', 'customers'],
    },
    fields: {
      orderId: {
        concept: 'orderId',
        live: [
          { collection: 'orders', path: 'orderId' },
          { collection: 'orders', path: 'shortId' },
          { collection: 'orders', path: '_id' },
        ],
        description: 'Order identifier',
      },
      status: {
        concept: 'status',
        live: [{ collection: 'orders', path: 'status' }],
        description: 'Order lifecycle status',
      },
      paymentMethod: {
        concept: 'paymentMethod',
        live: [
          { collection: 'orders', path: 'paymentMethod' },
          { collection: 'orders', path: 'payment.method' },
        ],
      },
      grandTotal: {
        concept: 'price / grandTotal / revenue',
        live: [{ collection: 'orders', path: 'totalPrice' }],
        description: 'Order total in INR',
        metric: 'sum',
      },
      subtotal: {
        concept: 'subtotal',
        live: [
          { collection: 'orders', path: 'subtotal' },
          { collection: 'orders', path: 'itemsTotal' },
        ],
      },
      deliveryFee: {
        concept: 'delivery fee',
        live: [
          { collection: 'orders', path: 'deliveryFee' },
          { collection: 'orders', path: 'deliveryCharge' },
        ],
      },
      customerName: {
        concept: 'customer name',
        live: [
          { collection: 'orders', path: 'customerName' },
          { collection: 'orders', path: 'userName' },
          { collection: 'users', path: 'name' },
        ],
      },
      phone: {
        concept: 'phone',
        live: [
          { collection: 'orders', path: 'phone' },
          { collection: 'users', path: 'phone' },
        ],
      },
      customerLat: {
        concept: 'customer pin latitude',
        live: [
          { collection: 'orders', path: 'deliveryAddress.lat' },
          { collection: 'orders', path: 'deliveryLocation.lat' },
          { collection: 'users', path: 'location.coordinates.lat' },
        ],
        geo: true,
      },
      customerLng: {
        concept: 'customer pin longitude',
        live: [
          { collection: 'orders', path: 'deliveryAddress.lng' },
          { collection: 'orders', path: 'deliveryLocation.lng' },
          { collection: 'users', path: 'location.coordinates.lng' },
        ],
        geo: true,
      },
      items: {
        concept: 'line items / products ordered',
        live: [
          { collection: 'orders', path: 'items' },
          { collection: 'orders', path: 'orderItems' },
        ],
        productMatch: [
          { collection: 'orders', path: 'items.name' },
          { collection: 'orders', path: 'items.bowlId' },
          { collection: 'bowls', path: 'name' },
        ],
      },
      orderedAt: {
        concept: 'order time',
        live: [
          { collection: 'orders', path: 'createdAt' },
          { collection: 'orders', path: 'orderedAt' },
        ],
        date: true,
      },
      distanceMeters: {
        concept: 'distance from store',
        compute: 'haversine',
        from: ['customerLat', 'customerLng'],
        store: STORE_LOCATION,
        description: 'Computed live from lat/lng vs store; sample labels only teach the concept',
      },
    },
    tools: {
      product_in_radius: {
        description:
          'Resolve product via bowls → count buyers with radius on deliveryAddress lat/lng',
        flow: [
          'resolve_product',
          'count_unique_product_buyers { product_id, radius_km }',
        ],
      },
      revenue: {
        flow: ['calculate_revenue'],
      },
      orders: {
        flow: ['count_orders'],
      },
      aov: {
        flow: ['get_aov'],
      },
    },
    store: STORE_LOCATION,
  };
}

/**
 * Merge sample parameters into a live map (what was learned → where to query live).
 */
export function buildLiveFieldMapFromSamples({ parameters = [], domain = '', discovery = null } = {}) {
  const base = defaultPicosoLiveMap();
  const learned = {};
  const paramNames = new Set((parameters || []).map((p) => p.name));

  for (const name of paramNames) {
    if (base.fields[name]) {
      learned[name] = {
        ...base.fields[name],
        fromSample: true,
        sampleType: parameters.find((p) => p.name === name)?.type || null,
        sampleValues: parameters.find((p) => p.name === name)?.sampleValues?.slice?.(0, 4) || [],
      };
    } else {
      // unknown concept — still record for agent
      learned[name] = {
        concept: name,
        fromSample: true,
        live: [],
        sampleType: parameters.find((p) => p.name === name)?.type || null,
        note: 'Seen in samples; search schema / glossary when querying live',
      };
    }
  }

  // Always attach core commerce live paths when domain is orders-like
  const orderLike =
    /order|food|delivery|commerce|ops/i.test(domain || '') ||
    paramNames.has('grandTotal') ||
    paramNames.has('orderId') ||
    paramNames.has('status');

  if (orderLike) {
    for (const [k, v] of Object.entries(base.fields)) {
      if (!learned[k]) {
        learned[k] = { ...v, fromSample: false, inferredDefault: true };
      }
    }
  }

  // Refine collection names from discovery if available
  if (discovery?.collections?.length) {
    const cols = discovery.collections;
    const findCol = (...preds) =>
      cols.find((c) => preds.some((p) => p.test(c.name))) || null;
    const orderCol = findCol(/order/i);
    const productCol = findCol(/bowl|product/i);
    const userCol = findCol(/^user|customer/i);

    const rewriteCollection = (entry, actual) => {
      if (!entry?.live || !actual) return entry;
      return {
        ...entry,
        live: entry.live.map((l) => ({
          ...l,
          collection: actual.name,
          resolvedPath: pickBestPath(actual, l.path) || l.path,
        })),
      };
    };

    if (orderCol) {
      for (const key of [
        'orderId',
        'status',
        'grandTotal',
        'paymentMethod',
        'customerLat',
        'customerLng',
        'items',
        'orderedAt',
        'deliveryFee',
        'subtotal',
        'phone',
        'customerName',
      ]) {
        if (learned[key]) learned[key] = rewriteCollection(learned[key], orderCol);
      }
    }
    if (productCol && learned.items) {
      learned.items = {
        ...learned.items,
        productCollection: productCol.name,
        productNamePath:
          productCol.fields?.find((f) => (f.path || '') === 'name')?.path || 'name',
      };
    }
    if (userCol) {
      for (const key of ['customerName', 'phone', 'customerLat', 'customerLng']) {
        if (learned[key]?.live) {
          learned[key] = {
            ...learned[key],
            live: learned[key].live.map((l) =>
              l.collection === 'users' ? { ...l, collection: userCol.name } : l
            ),
          };
        }
      }
    }
  }

  return {
    version: 1,
    domain: domain || (orderLike ? 'food_delivery_orders' : 'generic'),
    mode: 'live_first',
    note:
      'Samples taught field meanings. Numeric answers for ops questions come from live Mongo via tools, not paste-only rows.',
    store: STORE_LOCATION,
    tools: base.tools,
    fields: learned,
    collectionsSeen: discovery?.collections?.map((c) => ({
      name: c.name,
      count: c.estimatedCount,
      fieldCount: c.fields?.length || 0,
    })),
  };
}

function pickBestPath(collection, preferredPath) {
  const fields = collection.fields || [];
  const paths = fields.map((f) => f.path || f.dataType);
  if (paths.includes(preferredPath)) return preferredPath;
  // try leaf match
  const leaf = preferredPath.split('.').pop();
  const hit = paths.find((p) => p === leaf || p.endsWith(`.${leaf}`));
  return hit || null;
}

/**
 * Human + agent query plan appended to text brain.
 */
export function buildLiveQueryPlanText(liveMap) {
  if (!liveMap?.fields) return '';
  const lines = [
    '',
    '## Live Mongo query plan (samples only taught structure)',
    'When the user asks about real-time business numbers:',
    '1. Prefer live tools over trained-sample corpus metrics.',
    '2. Product + km radius → resolve_product then count_unique_product_buyers with radius_km.',
    '3. Revenue / orders / AOV → calculate_revenue, count_orders, get_aov on live orders.',
    '4. Customer pin ≈ deliveryAddress.lat / deliveryAddress.lng (or user profile fallback).',
    '5. Distance is computed with haversine from store coordinates, not paste "458 m" labels alone.',
    '',
    '### Concept → live field map',
  ];
  for (const [name, meta] of Object.entries(liveMap.fields)) {
    if (meta.compute) {
      lines.push(
        `- **${name}**: computed (${meta.compute}) from ${JSON.stringify(meta.from)} vs store`
      );
      continue;
    }
    const live = (meta.live || [])
      .slice(0, 3)
      .map((l) => `${l.collection}.${l.resolvedPath || l.path}`)
      .join(' | ');
    lines.push(
      `- **${name}**${meta.fromSample ? ' (seen in samples)' : ''}: live → ${live || 'search schema'}`
    );
  }
  lines.push('');
  lines.push(`Store center: ${liveMap.store?.lat}, ${liveMap.store?.lng}`);
  return lines.join('\n');
}

/**
 * Executable query plan object for agent prompt.
 */
export function buildQueryPlan(liveMap) {
  return {
    priority: 'live_mongodb',
    sampleCorpus: 'structure_and_definitions_only',
    routes: [
      {
        intent: 'product_buyers_in_radius',
        match: ['km', 'radius', 'product', 'paneer', 'bowl', 'buyers', 'customers'],
        tools: ['resolve_product', 'count_unique_product_buyers'],
        inputs: { radius_km: 'from user', product_name: 'from user' },
        geo: liveMap?.fields?.customerLat || null,
      },
      {
        intent: 'revenue',
        match: ['revenue', 'sales', 'total sales', 'kitni bikri'],
        tools: ['calculate_revenue'],
      },
      {
        intent: 'orders',
        match: ['orders', 'kitne order'],
        tools: ['count_orders'],
      },
      {
        intent: 'aov',
        match: ['aov', 'average order'],
        tools: ['get_aov'],
      },
      {
        intent: 'sample_only_stats',
        match: ['in trained samples', 'in paste', 'what did I train'],
        tools: ['query_trained_samples', 'run_metric'],
        note: 'Only when user explicitly asks about sample corpus',
      },
    ],
    liveFieldMapSummary: Object.fromEntries(
      Object.entries(liveMap?.fields || {}).map(([k, v]) => [
        k,
        {
          paths: (v.live || []).map((l) => `${l.collection}.${l.resolvedPath || l.path}`),
          compute: v.compute || null,
          fromSample: Boolean(v.fromSample),
        },
      ])
    ),
  };
}
