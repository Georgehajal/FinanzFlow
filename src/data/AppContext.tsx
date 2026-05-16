import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  FinanzData, MonthSnapshot, FinanzSettings,
  Posten, Vertrag, InvestPlan, CashEntry, Immobilie,
  currentMonthKey, addMonthsKey, compareMonthKey,
} from './model';
import {
  loadData, saveData, ensureMonth,
} from './finanzStore';
import {
  computeMetrics, compareToPrevMonth, MonthMetrics, MetricsDelta,
} from './calc';
import { darkTheme, lightTheme, Theme } from '../theme/tokens';

// Listen-Bereiche, die generisch mit Posten arbeiten
export type ListSection = 'income' | 'variableExpenses' | 'variableIncome' | 'spontanInvest';

interface AppContextValue {
  ready: boolean;
  data: FinanzData;
  monthKey: string;
  snapshot: MonthSnapshot;
  settings: FinanzSettings;
  theme: Theme;
  metrics: MonthMetrics;
  compare: MetricsDelta;

  setMonthKey: (mk: string) => void;
  shiftMonth: (delta: number) => void;

  upsertItem: (section: ListSection, item: Posten) => Promise<void>;
  deleteItem: (section: ListSection, id: string) => Promise<void>;

  upsertContract: (v: Vertrag) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;

  upsertInvest: (p: InvestPlan) => Promise<void>;
  deleteInvest: (id: string) => Promise<void>;

  addCash: (entry: CashEntry) => Promise<void>;
  deleteCash: (id: string) => Promise<void>;

  upsertProperty: (p: Immobilie) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;

  updateSettings: (p: Partial<FinanzSettings>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// Wendet eine Mutation auf den angegebenen Monat UND alle späteren bereits
// erfassten Monate an (frühere Monate bleiben unangetastet). Damit wirken
// Änderungen an Fixkosten/Invest/Einnahmen „ab diesem Monat und weiter",
// während vergangene Monate ihren alten Wert behalten.
function forEachMonthFrom(
  d: FinanzData, fromKey: string, fn: (m: MonthSnapshot) => void,
) {
  Object.keys(d.months)
    .filter(k => compareMonthKey(k, fromKey) >= 0)
    .forEach(k => fn(d.months[k]));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<FinanzData | null>(null);
  const [monthKey, setMonthKeyState] = useState<string>(currentMonthKey());

  useEffect(() => {
    (async () => {
      const d = await loadData();
      const mk = currentMonthKey();
      const before = d.months[mk];
      ensureMonth(d, mk);
      if (!before) await saveData(d);
      setData(d);
      setMonthKeyState(mk);
      setReady(true);
    })();
  }, []);

  const settings = data?.settings ?? { dark: true, accent: '#B8F12C', userName: '', userEmail: '' };

  const theme: Theme = {
    ...(settings.dark ? darkTheme : lightTheme),
    accent: settings.accent,
    accentInk: settings.dark ? '#0E1A00' : '#FFFFFF',
    income: settings.accent,
  };

  // Schreibt eine Mutation auf eine Kopie der Daten, persistiert und setzt State.
  const mutate = useCallback(async (fn: (d: FinanzData) => void) => {
    setData(prev => {
      if (!prev) return prev;
      const next = clone(prev);
      fn(next);
      saveData(next);
      return next;
    });
  }, []);

  const setMonthKey = useCallback((mk: string) => {
    setData(prev => {
      if (prev && !prev.months[mk]) {
        const next = clone(prev);
        ensureMonth(next, mk);
        saveData(next);
        return next;
      }
      return prev;
    });
    setMonthKeyState(mk);
  }, []);

  const shiftMonth = useCallback((delta: number) => {
    setMonthKey(addMonthsKey(monthKey, delta));
  }, [monthKey, setMonthKey]);

  const snapshot: MonthSnapshot =
    data?.months[monthKey] ?? {
      monthKey, income: [], contracts: [], invest: [],
      variableExpenses: [], variableIncome: [], cash: [], spontanInvest: [],
    };

  const metrics = useMemo(() => computeMetrics(snapshot), [snapshot]);
  const compare = useMemo(
    () => (data ? compareToPrevMonth(data, monthKey) : { current: metrics, previous: null, delta: null }),
    [data, monthKey, metrics],
  );

  // 'income' ist fix → vorwärts propagieren. Variable Bereiche nur im Monat.
  const upsertItem = useCallback(async (section: ListSection, item: Posten) => {
    await mutate(d => {
      if (section === 'income') {
        if (item.recurring !== false) {
          // wiederkehrend → ab diesem Monat und allen weiteren
          forEachMonthFrom(d, monthKey, m => {
            const i = m.income.findIndex(x => x.id === item.id);
            if (i >= 0) m.income[i] = { ...item }; else m.income.push({ ...item });
          });
        } else {
          // einmalig → nur dieser Monat; evtl. alte Kopien in Folgemonaten entfernen
          const arr = d.months[monthKey].income;
          const i = arr.findIndex(x => x.id === item.id);
          if (i >= 0) arr[i] = { ...item }; else arr.push({ ...item });
          Object.keys(d.months)
            .filter(k => compareMonthKey(k, monthKey) > 0)
            .forEach(k => { d.months[k].income = d.months[k].income.filter(x => x.id !== item.id); });
        }
      } else {
        const arr = d.months[monthKey][section] as Posten[];
        const i = arr.findIndex(x => x.id === item.id);
        if (i >= 0) arr[i] = item; else arr.push(item);
      }
    });
  }, [mutate, monthKey]);

  const deleteItem = useCallback(async (section: ListSection, id: string) => {
    await mutate(d => {
      if (section === 'income') {
        forEachMonthFrom(d, monthKey, m => {
          m.income = m.income.filter(x => x.id !== id);
        });
      } else {
        const m = d.months[monthKey];
        (m[section] as Posten[]) = (m[section] as Posten[]).filter(x => x.id !== id);
      }
    });
  }, [mutate, monthKey]);

  // Fixkosten/Verträge: Änderung gilt ab diesem Monat und allen weiteren.
  const upsertContract = useCallback(async (v: Vertrag) => {
    await mutate(d => {
      forEachMonthFrom(d, monthKey, m => {
        const i = m.contracts.findIndex(x => x.id === v.id);
        if (i >= 0) m.contracts[i] = { ...v }; else m.contracts.push({ ...v });
      });
    });
  }, [mutate, monthKey]);

  const deleteContract = useCallback(async (id: string) => {
    await mutate(d => {
      forEachMonthFrom(d, monthKey, m => {
        m.contracts = m.contracts.filter(x => x.id !== id);
      });
    });
  }, [mutate, monthKey]);

  // Wiederkehrendes Invest: ebenfalls ab diesem Monat und weiter.
  const upsertInvest = useCallback(async (p: InvestPlan) => {
    await mutate(d => {
      forEachMonthFrom(d, monthKey, m => {
        const i = m.invest.findIndex(x => x.id === p.id);
        if (i >= 0) m.invest[i] = { ...p }; else m.invest.push({ ...p });
      });
    });
  }, [mutate, monthKey]);

  const deleteInvest = useCallback(async (id: string) => {
    await mutate(d => {
      forEachMonthFrom(d, monthKey, m => {
        m.invest = m.invest.filter(x => x.id !== id);
      });
    });
  }, [mutate, monthKey]);

  const addCash = useCallback(async (entry: CashEntry) => {
    await mutate(d => { d.months[monthKey].cash.unshift(entry); });
  }, [mutate, monthKey]);

  const deleteCash = useCallback(async (id: string) => {
    await mutate(d => {
      d.months[monthKey].cash = d.months[monthKey].cash.filter(x => x.id !== id);
    });
  }, [mutate, monthKey]);

  const upsertProperty = useCallback(async (p: Immobilie) => {
    await mutate(d => {
      const i = d.properties.findIndex(x => x.id === p.id);
      if (i >= 0) d.properties[i] = p; else d.properties.push(p);
    });
  }, [mutate]);

  const deleteProperty = useCallback(async (id: string) => {
    await mutate(d => { d.properties = d.properties.filter(x => x.id !== id); });
  }, [mutate]);

  const updateSettings = useCallback(async (p: Partial<FinanzSettings>) => {
    await mutate(d => { d.settings = { ...d.settings, ...p }; });
  }, [mutate]);

  if (!ready || !data) {
    return <View style={{ flex: 1, backgroundColor: settings.dark ? '#000' : '#F2F2F7' }} />;
  }

  const value: AppContextValue = {
    ready, data, monthKey, snapshot, settings, theme, metrics, compare,
    setMonthKey, shiftMonth,
    upsertItem, deleteItem,
    upsertContract, deleteContract,
    upsertInvest, deleteInvest,
    addCash, deleteCash,
    upsertProperty, deleteProperty,
    updateSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
