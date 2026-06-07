import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  FinanzData, MonthSnapshot, FinanzSettings,
  Posten, Vertrag, CashEntry, Immobilie, KreditPlan, Mietperiode, Sonderbuchung, SteuerPosten, Konto, KontoStand,
  currentMonthKey, addMonthsKey, compareMonthKey,
} from './model';
import {
  loadData, saveData, ensureMonth,
} from './finanzStore';
import {
  computeMetrics, compareToPrevMonth, MonthMetrics, MetricsDelta,
} from './calc';
import { buildTheme, Theme } from '../theme/tokens';

// Listen-Bereiche, die generisch mit Posten arbeiten.
// 'income' und 'invest' nutzen den recurring-Toggle (true = forward-propagate);
// 'variableExpenses' ist immer nur im aktuellen Monat.
export type ListSection = 'income' | 'invest' | 'variableExpenses';

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

  upsertItem: (section: ListSection, item: Posten, targetMonthKey?: string) => Promise<void>;
  deleteItem: (section: ListSection, id: string, targetMonthKey?: string) => Promise<void>;

  upsertContract: (v: Vertrag) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;

  // (Alte upsertInvest/deleteInvest entfernt — invest läuft jetzt über upsertItem('invest'))

  addCash: (entry: CashEntry, targetMonthKey?: string) => Promise<void>;
  updateCash: (entry: CashEntry, targetMonthKey?: string) => Promise<void>;
  deleteCash: (id: string, targetMonthKey?: string) => Promise<void>;

  upsertProperty: (p: Immobilie) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;

  upsertPlan: (propId: string, plan: KreditPlan) => Promise<void>;
  deletePlan: (propId: string, planId: string) => Promise<void>;
  addKombiBhw: (propId: string, voraus: KreditPlan, bauspar: KreditPlan) => Promise<void>;

  upsertMietperiode: (propId: string, per: Mietperiode) => Promise<void>;
  deleteMietperiode: (propId: string, perId: string) => Promise<void>;

  upsertSonderbuchung: (propId: string, sb: Sonderbuchung) => Promise<void>;
  deleteSonderbuchung: (propId: string, sbId: string) => Promise<void>;

  upsertSteuerPosten: (sp: SteuerPosten) => Promise<void>;
  deleteSteuerPosten: (id: string) => Promise<void>;

  upsertKonto: (k: Konto) => Promise<void>;
  deleteKonto: (id: string) => Promise<void>;
  upsertKontoStand: (s: KontoStand) => Promise<void>;
  deleteKontoStand: (id: string) => Promise<void>;

  updateSettings: (p: Partial<FinanzSettings>) => Promise<void>;
  replaceAllData: (newData: FinanzData) => Promise<void>;
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

  // Theme aus Preset + Dark/Light Modus aufbauen (income/expense unabhängig vom Akzent)
  const theme: Theme = buildTheme(settings.themeId, settings.dark);

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
      variableExpenses: [], cash: [],
    };

  const metrics = useMemo(() => computeMetrics(snapshot), [snapshot]);
  const compare = useMemo(
    () => (data ? compareToPrevMonth(data, monthKey) : { current: metrics, previous: null, delta: null }),
    [data, monthKey, metrics],
  );

  // 'income' und 'invest' nutzen recurring-Toggle (wiederkehrend → vorwärts propagieren).
  // 'variableExpenses' ist immer nur im aktuellen Monat.
  // targetMonthKey: optional anderer Monat (für CashScreen mit Monatswahl)
  const upsertItem = useCallback(async (section: ListSection, item: Posten, targetMonthKey?: string) => {
    const mk = targetMonthKey ?? monthKey;
    await mutate(d => {
      ensureMonth(d, mk);
      if (section === 'income' || section === 'invest') {
        if (item.recurring !== false) {
          forEachMonthFrom(d, mk, m => {
            const arr = (m as any)[section] as Posten[];
            const i = arr.findIndex(x => x.id === item.id);
            if (i >= 0) arr[i] = { ...item }; else arr.push({ ...item });
          });
        } else {
          const arr = (d.months[mk] as any)[section] as Posten[];
          const i = arr.findIndex(x => x.id === item.id);
          if (i >= 0) arr[i] = { ...item }; else arr.push({ ...item });
          Object.keys(d.months)
            .filter(k => compareMonthKey(k, mk) > 0)
            .forEach(k => {
              const futureArr = (d.months[k] as any)[section] as Posten[];
              (d.months[k] as any)[section] = futureArr.filter(x => x.id !== item.id);
            });
        }
      } else {
        const arr = d.months[mk][section] as Posten[];
        const i = arr.findIndex(x => x.id === item.id);
        if (i >= 0) arr[i] = item; else arr.push(item);
      }
    });
  }, [mutate, monthKey]);

  const deleteItem = useCallback(async (section: ListSection, id: string, targetMonthKey?: string) => {
    const mk = targetMonthKey ?? monthKey;
    await mutate(d => {
      if (!d.months[mk]) return;
      if (section === 'income' || section === 'invest') {
        forEachMonthFrom(d, mk, m => {
          const arr = (m as any)[section] as Posten[];
          (m as any)[section] = arr.filter(x => x.id !== id);
        });
      } else {
        const m = d.months[mk];
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

  const addCash = useCallback(async (entry: CashEntry, targetMonthKey?: string) => {
    const mk = targetMonthKey ?? monthKey;
    await mutate(d => {
      ensureMonth(d, mk);
      d.months[mk].cash.unshift(entry);
    });
  }, [mutate, monthKey]);

  const updateCash = useCallback(async (entry: CashEntry, targetMonthKey?: string) => {
    const mk = targetMonthKey ?? monthKey;
    await mutate(d => {
      ensureMonth(d, mk);
      const arr = d.months[mk].cash;
      const i = arr.findIndex(x => x.id === entry.id);
      if (i >= 0) arr[i] = entry;
      else arr.unshift(entry);
    });
  }, [mutate, monthKey]);

  const deleteCash = useCallback(async (id: string, targetMonthKey?: string) => {
    const mk = targetMonthKey ?? monthKey;
    await mutate(d => {
      if (!d.months[mk]) return;
      d.months[mk].cash = d.months[mk].cash.filter(x => x.id !== id);
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

  const upsertPlan = useCallback(async (propId: string, plan: KreditPlan) => {
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop) return;
      if (!prop.kreditplaene) prop.kreditplaene = [];
      const idx = prop.kreditplaene.findIndex(x => x.id === plan.id);
      if (idx >= 0) prop.kreditplaene[idx] = plan;
      else prop.kreditplaene.push(plan);
    });
  }, [mutate]);

  const deletePlan = useCallback(async (propId: string, planId: string) => {
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop || !prop.kreditplaene) return;
      // Auch verknüpfte Pläne (Kombi-Partner) verlieren ihre Verknüpfung
      prop.kreditplaene.forEach(p => { if (p.verknuepftMit === planId) p.verknuepftMit = undefined; });
      prop.kreditplaene = prop.kreditplaene.filter(x => x.id !== planId);
    });
  }, [mutate]);

  const upsertMietperiode = useCallback(async (propId: string, per: Mietperiode) => {
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop) return;
      if (!prop.mietperioden) prop.mietperioden = [];
      const idx = prop.mietperioden.findIndex(x => x.id === per.id);
      if (idx >= 0) prop.mietperioden[idx] = per;
      else prop.mietperioden.push(per);
      prop.mietperioden.sort((a, b) => a.vonDatum < b.vonDatum ? -1 : a.vonDatum > b.vonDatum ? 1 : 0);
    });
  }, [mutate]);

  const deleteMietperiode = useCallback(async (propId: string, perId: string) => {
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop || !prop.mietperioden) return;
      prop.mietperioden = prop.mietperioden.filter(x => x.id !== perId);
    });
  }, [mutate]);

  const upsertSonderbuchung = useCallback(async (propId: string, sb: Sonderbuchung) => {
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop) return;
      if (!prop.sonderbuchungen) prop.sonderbuchungen = [];
      const idx = prop.sonderbuchungen.findIndex(x => x.id === sb.id);
      if (idx >= 0) prop.sonderbuchungen[idx] = sb;
      else prop.sonderbuchungen.push(sb);
      prop.sonderbuchungen.sort((a, b) => a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);
    });
  }, [mutate]);

  const deleteSonderbuchung = useCallback(async (propId: string, sbId: string) => {
    // Foto aus App-Storage entfernen (Galerie-Backup bleibt für den User)
    const prop = data?.properties.find(x => x.id === propId);
    const sb = prop?.sonderbuchungen?.find(x => x.id === sbId);
    if (sb?.fotoUri) {
      try {
        const { deleteAppFoto } = await import('./fotoUtils');
        await deleteAppFoto(sb.fotoUri);
      } catch {}
    }
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop || !prop.sonderbuchungen) return;
      prop.sonderbuchungen = prop.sonderbuchungen.filter(x => x.id !== sbId);
    });
  }, [mutate, data]);

  // ── Steuerposten (private Steuererklärung) ─────────────────────────────────
  const upsertSteuerPosten = useCallback(async (sp: SteuerPosten) => {
    await mutate(d => {
      if (!d.steuerposten) d.steuerposten = [];
      const idx = d.steuerposten.findIndex(x => x.id === sp.id);
      if (idx >= 0) d.steuerposten[idx] = sp;
      else d.steuerposten.push(sp);
      d.steuerposten.sort((a, b) => a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0);
    });
  }, [mutate]);

  const deleteSteuerPosten = useCallback(async (id: string) => {
    // Foto aus App-Storage löschen
    const sp = data?.steuerposten?.find(x => x.id === id);
    if (sp?.fotoUri) {
      try {
        const { deleteAppFoto } = await import('./fotoUtils');
        await deleteAppFoto(sp.fotoUri);
      } catch {}
    }
    await mutate(d => {
      if (!d.steuerposten) return;
      d.steuerposten = d.steuerposten.filter(x => x.id !== id);
    });
  }, [mutate, data]);

  // BHW-Kombi: zwei Pläne mit gegenseitiger Verknüpfung speichern
  const addKombiBhw = useCallback(async (propId: string, voraus: KreditPlan, bauspar: KreditPlan) => {
    await mutate(d => {
      const prop = d.properties.find(x => x.id === propId);
      if (!prop) return;
      if (!prop.kreditplaene) prop.kreditplaene = [];
      const v = { ...voraus, verknuepftMit: bauspar.id };
      const b = { ...bauspar, verknuepftMit: voraus.id };
      prop.kreditplaene.push(v, b);
    });
  }, [mutate]);

  // ── Konten / Vermögen ─────────────────────────────────────────────────────
  const upsertKonto = useCallback(async (k: Konto) => {
    await mutate(d => {
      if (!d.konten) d.konten = [];
      const i = d.konten.findIndex(x => x.id === k.id);
      if (i >= 0) d.konten[i] = k;
      else d.konten.push(k);
    });
  }, [mutate]);

  const deleteKonto = useCallback(async (id: string) => {
    await mutate(d => {
      if (d.konten) d.konten = d.konten.filter(x => x.id !== id);
      if (d.kontoStaende) d.kontoStaende = d.kontoStaende.filter(x => x.kontoId !== id);
    });
  }, [mutate]);

  const upsertKontoStand = useCallback(async (s: KontoStand) => {
    await mutate(d => {
      if (!d.kontoStaende) d.kontoStaende = [];
      // Pro Konto+Monat nur ein Eintrag
      const i = d.kontoStaende.findIndex(x => x.kontoId === s.kontoId && x.monthKey === s.monthKey);
      if (i >= 0) d.kontoStaende[i] = s;
      else d.kontoStaende.push(s);
    });
  }, [mutate]);

  const deleteKontoStand = useCallback(async (id: string) => {
    await mutate(d => {
      if (d.kontoStaende) d.kontoStaende = d.kontoStaende.filter(x => x.id !== id);
    });
  }, [mutate]);

  const replaceAllData = useCallback(async (newData: FinanzData) => {
    await mutate(d => {
      d.schemaVersion = newData.schemaVersion ?? d.schemaVersion;
      d.months = newData.months ?? {};
      d.properties = newData.properties ?? [];
      d.steuerposten = newData.steuerposten ?? [];
      d.konten = newData.konten ?? [];
      d.kontoStaende = newData.kontoStaende ?? [];
      d.settings = { ...d.settings, ...(newData.settings ?? {}) };
    });
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
    addCash, updateCash, deleteCash,
    upsertProperty, deleteProperty,
    upsertPlan, deletePlan, addKombiBhw,
    upsertMietperiode, deleteMietperiode,
    upsertSonderbuchung, deleteSonderbuchung,
    upsertSteuerPosten, deleteSteuerPosten,
    upsertKonto, deleteKonto, upsertKontoStand, deleteKontoStand,
    updateSettings, replaceAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
