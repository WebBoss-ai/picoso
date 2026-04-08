// Inline SVG food illustrations for each category

export function BowlIllustration({ className = 'w-10 h-10', color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Steam */}
      <path d="M20 17 Q19 12 21 9 Q23 6 22 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
      <path d="M28 16 Q27 11 29 8 Q31 5 30 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
      <path d="M36 17 Q35 12 37 9 Q39 6 38 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
      {/* Rim */}
      <rect x="10" y="22" width="36" height="4" rx="2" fill={color} opacity="0.25"/>
      {/* Bowl body */}
      <path d="M10 26 Q12 44 28 44 Q44 44 46 26 Z" fill={color} opacity="0.85"/>
      {/* Ingredient dots */}
      <circle cx="21" cy="33" r="3" fill="white" opacity="0.45"/>
      <circle cx="30" cy="31" r="2.5" fill="white" opacity="0.35"/>
      <circle cx="37" cy="35" r="2" fill="white" opacity="0.45"/>
      <circle cx="26" cy="38" r="1.8" fill="white" opacity="0.3"/>
    </svg>
  );
}

export function WrapIllustration({ className = 'w-10 h-10', color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Wrap body — tilted cylinder */}
      <ellipse cx="28" cy="28" rx="22" ry="10" fill={color} opacity="0.85" transform="rotate(-15 28 28)"/>
      {/* End caps */}
      <ellipse cx="12" cy="24" rx="3.5" ry="8" fill={color} opacity="0.55" transform="rotate(-15 12 24)"/>
      <ellipse cx="44" cy="32" rx="3.5" ry="8" fill={color} opacity="0.55" transform="rotate(-15 44 32)"/>
      {/* Filling peeking from one end */}
      <ellipse cx="12" cy="24" rx="2" ry="5" fill="white" opacity="0.35" transform="rotate(-15 12 24)"/>
      {/* Layer lines on wrap surface */}
      <path d="M14 20 Q28 16 42 24" stroke="white" strokeWidth="1.4" opacity="0.4" strokeLinecap="round"/>
      <path d="M13 26 Q28 22 43 30" stroke="white" strokeWidth="1.4" opacity="0.35" strokeLinecap="round"/>
      <path d="M14 32 Q28 28 42 36" stroke="white" strokeWidth="1.4" opacity="0.3" strokeLinecap="round"/>
      {/* Sesame seeds / dots */}
      <circle cx="22" cy="22" r="1.2" fill="white" opacity="0.5"/>
      <circle cx="32" cy="26" r="1.2" fill="white" opacity="0.5"/>
      <circle cx="26" cy="34" r="1.2" fill="white" opacity="0.45"/>
    </svg>
  );
}

export function SandwichIllustration({ className = 'w-10 h-10', color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Top bread slice — domed */}
      <path d="M11 26 Q11 16 28 15 Q45 16 45 26 L45 28 L11 28 Z" fill={color} opacity="0.9"/>
      {/* Highlight on top bread */}
      <path d="M16 19 Q22 16 32 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
      {/* Lettuce ruffles */}
      <path d="M11 28 Q14 25 17 28 Q20 25 23 28 Q26 25 29 28 Q32 25 35 28 Q38 25 41 28 Q43 25 45 28 L45 30 L11 30 Z" fill="white" opacity="0.45"/>
      {/* Tomato / filling layer */}
      <rect x="11" y="30" width="34" height="4" rx="0" fill={color} opacity="0.6"/>
      {/* Cheese layer */}
      <rect x="11" y="34" width="34" height="2.5" rx="0" fill="white" opacity="0.4"/>
      {/* Bottom bread */}
      <rect x="11" y="36.5" width="34" height="6" rx="3" fill={color} opacity="0.9"/>
      {/* Sesame seeds */}
      <circle cx="20" cy="21" r="1.3" fill="white" opacity="0.5"/>
      <circle cx="28" cy="19" r="1.3" fill="white" opacity="0.5"/>
      <circle cx="36" cy="21" r="1.3" fill="white" opacity="0.5"/>
    </svg>
  );
}

export function SaladIllustration({ className = 'w-10 h-10', color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Bowl */}
      <path d="M10 30 Q12 48 28 48 Q44 48 46 30 Z" fill={color} opacity="0.75"/>
      <rect x="10" y="27" width="36" height="4" rx="2" fill={color} opacity="0.5"/>
      {/* Leaves rising from bowl */}
      <path d="M22 30 Q16 18 22 12 Q25 20 22 30Z" fill={color} opacity="0.9"/>
      <path d="M28 29 Q24 17 30 12 Q31 21 28 29Z" fill={color} opacity="0.8"/>
      <path d="M34 30 Q30 18 36 14 Q36 23 34 30Z" fill={color} opacity="0.9"/>
      {/* Leaf veins */}
      <path d="M22 26 Q19 21 22 14" stroke="white" strokeWidth="0.8" opacity="0.4" strokeLinecap="round"/>
      <path d="M28 26 Q26 20 29 14" stroke="white" strokeWidth="0.8" opacity="0.35" strokeLinecap="round"/>
      <path d="M34 27 Q32 20 35 16" stroke="white" strokeWidth="0.8" opacity="0.4" strokeLinecap="round"/>
      {/* Cherry tomatoes in bowl */}
      <circle cx="19" cy="38" r="2.5" fill="white" opacity="0.45"/>
      <circle cx="28" cy="37" r="2" fill="white" opacity="0.35"/>
      <circle cx="37" cy="39" r="2.5" fill="white" opacity="0.45"/>
    </svg>
  );
}

export const CATEGORY_ILLUSTRATIONS = {
  'pf-meals':      BowlIllustration,
  'pf-wraps':      WrapIllustration,
  'pf-sandwiches': SandwichIllustration,
  'pf-salads':     SaladIllustration,
};

export const CATEGORY_THEMES = {
  'pf-meals':      { bg: 'bg-brand-500',   light: 'bg-brand-50',   ring: 'ring-brand-400',  text: 'text-brand-600',  color: '#22c55e' },
  'pf-wraps':      { bg: 'bg-amber-500',   light: 'bg-amber-50',   ring: 'ring-amber-400',  text: 'text-amber-600',  color: '#f59e0b' },
  'pf-sandwiches': { bg: 'bg-orange-500',  light: 'bg-orange-50',  ring: 'ring-orange-400', text: 'text-orange-600', color: '#f97316' },
  'pf-salads':     { bg: 'bg-emerald-500', light: 'bg-emerald-50', ring: 'ring-emerald-400',text: 'text-emerald-600',color: '#10b981' },
};
