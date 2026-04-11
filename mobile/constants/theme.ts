// ─── THEME ───────────────────────────────────────────────────────────────────
// Edit these to change the global look of the app.

export const COLORS = {
  bg: '#0a0a0f',
  bgCard: '#111118',
  bgCardHover: '#16161f',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#e8e8f0',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.28)',

  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.12)',
  blue: '#60a5fa',
  blueDim: 'rgba(96,165,250,0.12)',
  purple: '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.12)',
  yellow: '#facc15',
  red: '#f87171',

  tabBar: '#0d0d16',
};

// ─── ANIMATION TIMINGS ────────────────────────────────────────────────────────
// Tune these to speed up / slow down animations site-wide.
export const ANIM = {
  fast: 200,   // quick feedback (button press)
  normal: 350, // standard transition
  slow: 600,   // entry animations
  orb: 2500,   // health orb pulse period
};

// ─── CARD GRADIENTS ──────────────────────────────────────────────────────────
export const CARD_GRADIENTS: Record<string, [string, string]> = {
  amex:    ['#1a1a2e', '#0f3460'],
  chase:   ['#1a0533', '#2d0d63'],
  citi:    ['#0a1628', '#1a3a5c'],
  discover:['#1a0a00', '#5c2a00'],
  capital: ['#001a0a', '#005c26'],
};
