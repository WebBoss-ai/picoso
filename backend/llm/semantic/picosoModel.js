/**
 * Picoso-only semantic layer (single-tenant control definitions).
 * LLM should use these metrics/glossary instead of inventing definitions.
 */

export const STORE_LOCATION = {
  lat: 28.437099,
  lng: 77.072771,
  name: 'Picoso store',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  locale: 'en-IN',
};

/** Orders that count as completed business volume */
export const COMPLETED_ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'out-for-delivery',
  'delivered',
];

export const CANCELLED_STATUS = 'cancelled';

export const GLOSSARY = {
  customer:
    'A unique registered User (_id). Identified by userId on orders.',
  revenue:
    'Sum of order.totalPrice for completed (non-cancelled) orders. Currency INR.',
  completed_order:
    'Order whose status is one of: confirmed, preparing, out-for-delivery, delivered. Cancelled excluded.',
  repeat_customer:
    'Customer with 2 or more completed orders (any products, unless product/geo filters applied).',
  unique_customers:
    'Count of distinct userId values matching filters.',
  aov:
    'Average order value = revenue / order_count for matching completed orders.',
  inactive_customer:
    'Customer whose last completed order is older than N days (default 60).',
  distance_from_store:
    'Great-circle distance from store (28.437099, 77.072771) to order deliveryAddress.lat/lng or user location. Units: km.',
};

export const ENTITIES = [
  'Customer',
  'Order',
  'Product',
  'OrderItem',
  'Location',
];

export const METRICS = [
  {
    id: 'unique_customers',
    definition: 'Count distinct userId',
  },
  {
    id: 'orders',
    definition: 'Count completed orders matching filters',
  },
  {
    id: 'revenue',
    definition: 'Sum totalPrice of completed orders',
  },
  {
    id: 'aov',
    definition: 'revenue / orders',
  },
  {
    id: 'repeat_customers',
    definition: 'Customers with orders_count >= 2',
  },
  {
    id: 'repeat_rate',
    definition: 'repeat_customers / unique_customers',
  },
];

export const DIMENSIONS = [
  'product',
  'category',
  'date',
  'area',
  'city',
  'radius_km',
  'status',
];

export function semanticContextForPrompt() {
  return {
    store: STORE_LOCATION,
    glossary: GLOSSARY,
    metrics: METRICS.map((m) => m.id),
    entities: ENTITIES,
    completedOrderStatuses: COMPLETED_ORDER_STATUSES,
    notes: [
      'Products live in Bowl collection; order line items use bowlId and name.',
      'Customer geo prefers order.deliveryAddress.lat/lng; fallback user.location.coordinates or savedAddresses.',
      'Never invent numbers. Only use tool results.',
      'Hinglish and Hindi are valid input languages.',
    ],
  };
}
