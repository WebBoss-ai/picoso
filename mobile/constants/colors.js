export const Colors = {
  // Primary brand greens (Swiggy-inspired vibrant leaf green)
  primary: '#1BA672',
  primaryDark: '#158F61',
  primaryDarker: '#0F7A52',
  primaryDeep: '#0A5C3D',
  primaryBg: '#E8F8F1',
  primaryLight: '#D1F2E4',

  // Deep dark greens (hero backgrounds)
  deepBg: '#0B3D2E',
  deepBg2: '#0F4A38',
  deepBg3: '#166534',
  deepBg4: '#1A7A3C',

  // Surfaces
  white: '#ffffff',
  surface: '#F7F8FA',
  surfaceGreen: '#F0FDF6',
  cardBg: '#ffffff',
  surfaceGray: '#F1F3F5',

  // Text
  textPrimary: '#1C1C1C',
  textSecondary: '#4A4A4A',
  textMuted: '#8E8E8E',
  textWhite: '#ffffff',
  textLight: '#dcfce7',
  textOnDark: 'rgba(255,255,255,0.85)',
  textDark: '#02060C',

  // Borders
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  borderMedium: '#D4D4D4',
  borderDark: '#86efac',
  borderGreen: '#B8E6D4',

  // Status
  success: '#1BA672',
  error: '#EF4F5F',
  warning: '#F97316',
  info: '#3b82f6',

  // Platinum / Premium
  platinum: '#f97316',
  platinumLight: '#fff7ed',
  platinumDark: '#c2410c',

  // Offer / Promo
  offerGreen: '#1BA672',
  offerBg: '#E8F8F1',
  offerYellow: '#FFF7E6',
  offerPurple: '#F3E8FF',

  // Order status colors
  statusPending: '#f59e0b',
  statusConfirmed: '#3b82f6',
  statusPreparing: '#8b5cf6',
  statusOutForDelivery: '#f97316',
  statusDelivered: '#1BA672',
  statusCancelled: '#EF4F5F',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',
  overlayDark: 'rgba(0,0,0,0.7)',
  greenOverlay: 'rgba(11,61,46,0.7)',

  // Cart bar
  cartBarBg: '#1C1C1C',
  cartBarGreen: '#1BA672',

  // Gradients (start/end arrays)
  gradientPrimary: ['#1BA672', '#158F61'],
  gradientHero: ['#0B3D2E', '#166534'],
  gradientCard: ['#F0FDF6', '#D1F2E4'],
  gradientPlatinum: ['#f97316', '#c2410c'],
  gradientOffer: ['#1BA672', '#0F7A52'],
};

export const CategoryColors = {
  all: { bg: '#E8F8F1', text: '#0F7A52', icon: '#1BA672', accent: '#D1F2E4' },
  'pf-meals': { bg: '#E8F8F1', text: '#0F7A52', icon: '#1BA672', accent: '#D1F2E4' },
  'pf-salads': { bg: '#D1FAE5', text: '#065f46', icon: '#10b981', accent: '#A7F3D0' },
  'pf-beverages': { bg: '#CFFAFE', text: '#164e63', icon: '#06b6d4', accent: '#A5F3FC' },
  'pf-wraps': { bg: '#FEF9C3', text: '#713f12', icon: '#ca8a04', accent: '#FDE68A' },
  'pf-sandwiches': { bg: '#FEE2E2', text: '#7f1d1d', icon: '#dc2626', accent: '#FECACA' },
  // legacy aliases (older mobile code)
  meals: { bg: '#E8F8F1', text: '#0F7A52', icon: '#1BA672', accent: '#D1F2E4' },
  salads: { bg: '#D1FAE5', text: '#065f46', icon: '#10b981', accent: '#A7F3D0' },
  beverages: { bg: '#CFFAFE', text: '#164e63', icon: '#06b6d4', accent: '#A5F3FC' },
  wraps: { bg: '#FEF9C3', text: '#713f12', icon: '#ca8a04', accent: '#FDE68A' },
  sandwiches: { bg: '#FEE2E2', text: '#7f1d1d', icon: '#dc2626', accent: '#FECACA' },
};

/** Matches backend CategoryConfig / Bowl.pfCategory enum */
export const MENU_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'pf-meals', label: 'Bowls', icon: 'restaurant-outline' },
  { id: 'pf-wraps', label: 'Wraps', icon: 'layers-outline' },
  { id: 'pf-sandwiches', label: 'Sandwiches', icon: 'fast-food-outline' },
  { id: 'pf-salads', label: 'Salads', icon: 'leaf-outline' },
  { id: 'pf-beverages', label: 'Cold Drinks', icon: 'cafe-outline' },
];

export default Colors;
