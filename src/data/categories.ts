export type CategoryKey = 'essen' | 'einkaufen' | 'trinkgeld' | 'eltern' | 'transport' | 'freizeit' | 'gesundheit' | 'sonstiges';
export type IncomeCategoryKey = 'gehalt' | 'bargeld' | 'geschenk' | 'sonstiges';
export type IconName =
  | 'utensils' | 'bag' | 'coin' | 'heart' | 'car' | 'music' | 'cross' | 'dot'
  | 'wallet' | 'gift' | 'home' | 'list' | 'chart' | 'plus' | 'minus'
  | 'arrowUp' | 'arrowDown' | 'arrowLeft' | 'chevron' | 'chevronDown'
  | 'check' | 'close' | 'search' | 'bell' | 'gear' | 'pdf' | 'share'
  | 'calendar' | 'tag' | 'note' | 'sliders' | 'trend' | 'star'
  | 'sync' | 'lock' | 'info';

export interface CategoryDef {
  label: string;
  color: string;
  icon: IconName;
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  essen:      { label: 'Essen',      color: '#FB923C', icon: 'utensils'  },
  einkaufen:  { label: 'Einkaufen',  color: '#A78BFA', icon: 'bag'       },
  trinkgeld:  { label: 'Trinkgeld',  color: '#FACC15', icon: 'coin'      },
  eltern:     { label: 'Eltern',     color: '#F472B6', icon: 'heart'     },
  transport:  { label: 'Transport',  color: '#60A5FA', icon: 'car'       },
  freizeit:   { label: 'Freizeit',   color: '#F87171', icon: 'music'     },
  gesundheit: { label: 'Gesundheit', color: '#34D399', icon: 'cross'     },
  sonstiges:  { label: 'Sonstiges',  color: '#9CA3AF', icon: 'dot'       },
};

export const INCOME_CATEGORIES: Record<IncomeCategoryKey, CategoryDef> = {
  gehalt:    { label: 'Gehalt',    color: '#B8F12C', icon: 'wallet' },
  bargeld:   { label: 'Bargeld',   color: '#34D399', icon: 'coin'   },
  geschenk:  { label: 'Geschenk', color: '#F472B6', icon: 'gift'   },
  sonstiges: { label: 'Sonstiges', color: '#9CA3AF', icon: 'dot'    },
};
