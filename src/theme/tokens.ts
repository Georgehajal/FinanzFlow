// Finanzflow Design Tokens
// Saubere Skalen statt Magic Numbers — alle UI-Werte stammen von hier.

// ── Spacing-Skala (in pt) ────────────────────────────────────────────────────
// Refactoring UI Empfehlung: wachsende Sprünge, nicht linear.
export const space = {
  xxs: 4,
  xs:  8,
  sm:  12,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
} as const;

// ── Typografie-Skala (fontSize in pt) ────────────────────────────────────────
// Refactoring UI: 12, 14, 16, 18, 24, 32, 48 — feste Stufen.
export const type = {
  caption: 12,   // Hilfstexte, Labels
  small:   14,   // sekundäre Werte
  body:    16,   // Standard-Body, Buttons
  bodyLg:  18,   // hervorgehobener Body
  title:   22,   // Card-Titel
  heading: 28,   // Screen-Titel
  display: 40,   // Hero-Zahlen (Überschuss, Vermögen)
} as const;

// ── Font Weights ─────────────────────────────────────────────────────────────
// Nur 2 Gewichte verwenden: regular + bold (semibold für Hervorhebungen).
export const weight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

// ── Border-Radius ────────────────────────────────────────────────────────────
export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 999,
} as const;

// ── Touch-Targets — WCAG/Apple HIG Minimum ───────────────────────────────────
export const touch = {
  min: 44,   // Apple HIG / WCAG 2.5.5 — alle interaktiven Elemente
};

// ── Shadow-Skala ─────────────────────────────────────────────────────────────
// React Native Shadows. Sanfter Schatten unten — Lichtquelle von oben.
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ── Farben — HSL-basierte Skalen ─────────────────────────────────────────────

export type Theme = typeof darkTheme;

// Akzent bleibt Grün-Gelb (Markenfarbe). Im Light Mode etwas dunkler für Kontrast.
export const darkTheme = {
  dark: true,

  // Hintergrund-Stufen (kühl-graue Töne, leicht ins Blaue)
  bg:        '#000000',
  surface:   '#141414',
  surfaceHi: '#1F1F1F',
  surface2:  '#2A2A2A',
  border:    'rgba(255,255,255,0.10)',

  // Text-Hierarchie (mit korrigiertem Kontrast)
  text:      '#FFFFFF',
  textMuted: 'rgba(235,235,245,0.70)',  // war 0.62 — jetzt sicher AA
  textDim:   'rgba(235,235,245,0.50)',  // war 0.32 — jetzt AA-konform

  // Akzent (Markenfarbe — Grün-Gelb)
  accent:    '#B8F12C',
  accentInk: '#0E1A00',

  // Semantik
  income:    '#B8F12C',
  expense:   '#FF7A7A',  // etwas weicher als #FF6B6B für Dark
  warning:   '#FACC15',
  info:      '#60A5FA',

  // Sekundäre Akzente
  purple:    '#A78BFA',
  blue:      '#60A5FA',
  mint:      '#34D399',
  yellow:    '#FACC15',
  orange:    '#FB923C',
  pink:      '#F472B6',
};

export const lightTheme: Theme = {
  dark: false,

  bg:        '#F5F5F7',
  surface:   '#FFFFFF',
  surfaceHi: '#FFFFFF',
  surface2:  '#EFEFF4',
  border:    'rgba(60,60,67,0.14)',

  text:      '#000000',
  textMuted: 'rgba(60,60,67,0.70)',
  textDim:   'rgba(60,60,67,0.50)',

  accent:    '#67B400',    // dunkler als Dark-Variante für Kontrast auf weiß
  accentInk: '#FFFFFF',

  income:    '#2E7D2F',
  expense:   '#D32F2F',
  warning:   '#B45309',
  info:      '#2563EB',

  purple:    '#7C3AED',
  blue:      '#2563EB',
  mint:      '#10B981',
  yellow:    '#CA8A04',
  orange:    '#EA580C',
  pink:      '#DB2777',
};

// ── Money-Display-Helper ─────────────────────────────────────────────────────
// Nie Farbe als alleiniges Signal — immer Symbol + Vorzeichen + Farbe.
export type MoneyDirection = 'in' | 'out' | 'neutral';

export const moneySymbol = {
  in:      '↗',
  out:     '↘',
  neutral: '·',
};

export function moneyColor(theme: Theme, direction: MoneyDirection): string {
  if (direction === 'in') return theme.income;
  if (direction === 'out') return theme.expense;
  return theme.text;
}
