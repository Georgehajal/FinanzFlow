// Metadaten für die Verwalten-Bereiche (Listen + Editor)
import { CategoryDef, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './model';

export type SectionKey =
  | 'income'            // fixe/wiederkehrende Einnahmen
  | 'contracts'         // Fixkosten/Verträge
  | 'variableExpenses'  // variable Kosten
  | 'variableIncome'    // variable Einnahmen
  | 'invest'            // wiederkehrendes Invest
  | 'spontanInvest';    // spontane Investitionen

export interface SectionMeta {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  direction: 'income' | 'expense' | 'neutral';
  categories: CategoryDef[] | null;   // null → keine Kategorie (nur Name + Betrag)
  isContract?: boolean;
  isInvest?: boolean;
  carriedForward: boolean;            // true = wandert automatisch in neue Monate
}

export const SECTIONS: Record<SectionKey, SectionMeta> = {
  income: {
    key: 'income', title: 'Einnahmen', subtitle: 'Gehalt, Kindergeld …',
    icon: 'wallet', color: '#B8F12C', direction: 'income',
    categories: INCOME_CATEGORIES, carriedForward: true,
  },
  contracts: {
    key: 'contracts', title: 'Fixkosten & Verträge', subtitle: 'Miete, Abos, Versicherungen',
    icon: 'sync', color: '#60A5FA', direction: 'expense',
    categories: EXPENSE_CATEGORIES, isContract: true, carriedForward: true,
  },
  variableExpenses: {
    key: 'variableExpenses', title: 'Variable Kosten', subtitle: 'Einkauf, Freizeit …',
    icon: 'bag', color: '#FB923C', direction: 'expense',
    categories: EXPENSE_CATEGORIES, carriedForward: false,
  },
  variableIncome: {
    key: 'variableIncome', title: 'Variable Einnahmen', subtitle: 'Einmalige Einnahmen',
    icon: 'gift', color: '#34D399', direction: 'income',
    categories: INCOME_CATEGORIES, carriedForward: false,
  },
  invest: {
    key: 'invest', title: 'Invest (wiederkehrend)', subtitle: 'Sparplan, ETF …',
    icon: 'trend', color: '#A78BFA', direction: 'neutral',
    categories: null, isInvest: true, carriedForward: true,
  },
  spontanInvest: {
    key: 'spontanInvest', title: 'Spontane Investitionen', subtitle: 'Einmalige Investments',
    icon: 'star', color: '#A78BFA', direction: 'neutral',
    categories: null, isInvest: true, carriedForward: false,
  },
};

export const MANAGE_ORDER: SectionKey[] = [
  'income', 'contracts', 'variableExpenses', 'variableIncome', 'invest', 'spontanInvest',
];
