// Metadaten für die Verwalten-Bereiche (Listen + Editor)
import { CategoryDef, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './model';

export type SectionKey =
  | 'income'            // Einnahmen (mit Wiederkehrend-Toggle)
  | 'contracts'         // Fixkosten/Verträge
  | 'variableExpenses'  // variable Kosten
  | 'invest';           // Invest/Sparen (mit Wiederkehrend-Toggle)

export interface SectionMeta {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  direction: 'income' | 'expense' | 'neutral';
  categories: CategoryDef[] | null;   // null → keine Kategorie
  isContract?: boolean;
  isInvest?: boolean;
  carriedForward: boolean;            // true bei Wiederkehrend-Toggle
}

export const SECTIONS: Record<SectionKey, SectionMeta> = {
  income: {
    key: 'income', title: 'Einnahmen', subtitle: 'Gehalt, Boni, Erstattungen …',
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
  invest: {
    key: 'invest', title: 'Invest (Sparen)', subtitle: 'Sparplan, ETF, spontane Anlagen …',
    icon: 'trend', color: '#A78BFA', direction: 'neutral',
    categories: null, isInvest: true, carriedForward: true,
  },
};

export const MANAGE_ORDER: SectionKey[] = [
  'income', 'contracts', 'variableExpenses', 'invest',
];
