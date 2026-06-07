// Finanzflow Design Tokens
// Saubere Skalen statt Magic Numbers — alle UI-Werte stammen von hier.

// ── Spacing-Skala (in pt) ────────────────────────────────────────────────────
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
export const type = {
  caption: 12,
  small:   14,
  body:    16,
  bodyLg:  18,
  title:   22,
  heading: 28,
  display: 40,
} as const;

export const weight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  pill: 999,
} as const;

export const touch = {
  min: 44,
};

export const shadow = {
  sm: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  md: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 3,
  },
  lg: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
} as const;

// ── Theme-Varianten ──────────────────────────────────────────────────────────
export type ThemeId = 'lime' | 'indigo' | 'petrol' | 'royal' | 'amber';

export interface ThemePreset {
  id: ThemeId;
  label: string;        // Anzeigename
  description: string;  // kurze Beschreibung
  accentDark: string;   // Akzent für Dark Mode
  accentLight: string;  // Akzent für Light Mode (oft etwas dunkler für Kontrast)
  inkOnAccent: string;  // Textfarbe auf Akzent (für Buttons)
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'lime',
    label: 'Lime',
    description: 'Sportlich, frisch',
    accentDark:  '#B8F12C',
    accentLight: '#67B400',
    inkOnAccent: '#0E1A00',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    description: 'Modern, Tech',
    accentDark:  '#818CF8',
    accentLight: '#4F46E5',
    inkOnAccent: '#FFFFFF',
  },
  {
    id: 'petrol',
    label: 'Petrol',
    description: 'Seriös, modern',
    accentDark:  '#2DD4BF',
    accentLight: '#0F766E',
    inkOnAccent: '#FFFFFF',
  },
  {
    id: 'royal',
    label: 'Royal',
    description: 'Klassisch Bank',
    accentDark:  '#60A5FA',
    accentLight: '#1D4ED8',
    inkOnAccent: '#FFFFFF',
  },
  {
    id: 'amber',
    label: 'Amber',
    description: 'Premium, Wertanlage',
    accentDark:  '#FBBF24',
    accentLight: '#B45309',
    inkOnAccent: '#1A0F00',
  },
];

export function presetById(id: ThemeId | undefined): ThemePreset {
  return THEME_PRESETS.find(p => p.id === id) ?? THEME_PRESETS[0];
}

// ── Theme ────────────────────────────────────────────────────────────────────
export type Theme = typeof darkBaseTheme;

// Income/Expense sind jetzt SEMANTISCH (immer Grün/Rot) und vom Akzent getrennt.
// Das ist eine bewährte Konvention in Finanzapps (N26, Revolut, Mint usw.).
const incomeColorDark   = '#16A34A';  // sattes Grün — klar von Lime-Akzent unterscheidbar
const incomeColorLight  = '#15803D';  // dunkler für weiß
const expenseColorDark  = '#EF4444';
const expenseColorLight = '#DC2626';

const darkBaseTheme = {
  dark: true,

  bg:        '#000000',
  surface:   '#141414',
  surfaceHi: '#1F1F1F',
  surface2:  '#2A2A2A',
  border:    'rgba(255,255,255,0.10)',

  text:      '#FFFFFF',
  textMuted: 'rgba(235,235,245,0.70)',
  textDim:   'rgba(235,235,245,0.50)',

  // Akzent (Marke) — wird per Theme-Preset überschrieben
  accent:    '#B8F12C',
  accentInk: '#0E1A00',

  // Semantik (separat von Akzent!)
  income:    incomeColorDark,
  expense:   expenseColorDark,
  warning:   '#FACC15',
  info:      '#60A5FA',

  // Sekundäre Akzente (für Tiles im Dashboard)
  purple:    '#A78BFA',
  blue:      '#60A5FA',
  mint:      '#34D399',
  yellow:    '#FACC15',
  orange:    '#FB923C',
  pink:      '#F472B6',
};

const lightBaseTheme: Theme = {
  dark: false,

  bg:        '#F5F5F7',
  surface:   '#FFFFFF',
  surfaceHi: '#FFFFFF',
  surface2:  '#EFEFF4',
  border:    'rgba(60,60,67,0.14)',

  text:      '#000000',
  textMuted: 'rgba(60,60,67,0.70)',
  textDim:   'rgba(60,60,67,0.50)',

  accent:    '#67B400',
  accentInk: '#FFFFFF',

  income:    incomeColorLight,
  expense:   expenseColorLight,
  warning:   '#B45309',
  info:      '#2563EB',

  purple:    '#7C3AED',
  blue:      '#2563EB',
  mint:      '#10B981',
  yellow:    '#CA8A04',
  orange:    '#EA580C',
  pink:      '#DB2777',
};

// Theme-Builder: nimmt Preset + Mode (dark/light) und gibt ein Theme zurück
export function buildTheme(themeId: ThemeId | undefined, isDark: boolean): Theme {
  const preset = presetById(themeId);
  const base = isDark ? darkBaseTheme : lightBaseTheme;
  return {
    ...base,
    accent:    isDark ? preset.accentDark : preset.accentLight,
    accentInk: preset.inkOnAccent,
  };
}

// Backward-Kompatibilität — falls irgendwo noch importiert wird
export const darkTheme = darkBaseTheme;
export const lightTheme = lightBaseTheme;

// ── Money-Display-Helper ─────────────────────────────────────────────────────
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
