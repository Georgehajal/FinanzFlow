// Finanzflow — Persistenz (AsyncStorage) + Monats-Rollover
// Eigener Storage-Key, unabhängig von CashFlow. Startet leer (Seed-Struktur).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FinanzData, MonthSnapshot, FinanzSettings, Immobilie, KreditPlan, Posten,
  SCHEMA_VERSION, seedData, seedSnapshot, currentMonthKey, newId,
  compareMonthKey,
} from './model';

const DATA_KEY = 'ff_data_v1';

// ── Migration ────────────────────────────────────────────────────────────────

// Wandelt eine alte Immobilie in das neue Format:
// - kreditsumme/sollzins/laufzeit/kreditStart → erster Annuitäten-Plan
// - kaltmiete/warmmiete/nebenkosten → erste Mietperiode (Annahme: warmmiete = NK-Umlage Mieter,
//   nebenkosten = Hausgeld Vermieter; das war die zuletzt erklärte Bedeutung)
function migrateImmobilie(im: Immobilie): Immobilie {
  const out: Immobilie = { ...im };

  // Kreditplan-Migration
  if (!Array.isArray(out.kreditplaene) || out.kreditplaene.length === 0) {
    const K = im.kreditsumme || 0;
    if (K > 0) {
      const plan: KreditPlan = {
        id: newId('plan'),
        typ: 'annuitaet',
        name: 'Hauptkredit',
        startDatum: im.kreditStart || '',
        kreditsumme: K,
        sollzinsProzent: im.sollzinsProzent || 0,
        laufzeitMonate: im.laufzeitMonate || 360,
      };
      out.kreditplaene = [plan];
    } else {
      out.kreditplaene = [];
    }
  }

  // Mietperioden-Migration: falls noch keine Periode aber alte Mietfelder da sind
  if (!Array.isArray(out.mietperioden) || out.mietperioden.length === 0) {
    const hasMietdaten = (im.kaltmiete || 0) > 0 || (im.warmmiete || 0) > 0 || (im.nebenkosten || 0) > 0;
    if (hasMietdaten) {
      const von = im.vermietetSeit || new Date().toISOString().slice(0, 10);
      out.mietperioden = [{
        id: newId('mp'),
        vonDatum: von,
        kaltmiete: im.kaltmiete || 0,
        nebenkostenumlage: im.warmmiete || 0,
        notiz: 'Migriert aus alten Mietfeldern',
      }];
      // Altes nebenkosten → Hausgeld auf Immobilien-Ebene (wenn dort noch nichts)
      if (out.hausgeldMonatlich == null && (im.nebenkosten || 0) > 0) {
        out.hausgeldMonatlich = im.nebenkosten;
      }
    } else {
      out.mietperioden = [];
    }
  }

  // Hausgeld aus alten Mietperioden auf Immobilien-Ebene verschieben (nimmt letzten Wert)
  if (out.hausgeldMonatlich == null && out.mietperioden && out.mietperioden.length > 0) {
    const withHausgeld = out.mietperioden.filter((p: any) => (p.hausgeld || 0) > 0);
    if (withHausgeld.length > 0) {
      out.hausgeldMonatlich = withHausgeld[withHausgeld.length - 1].hausgeld;
    }
  }
  // Hausgeld-Feld aus Mietperioden entfernen (leeres Feld)
  if (out.mietperioden) {
    out.mietperioden = out.mietperioden.map(p => {
      const { hausgeld, ...rest } = p as any;
      return rest as any;
    });
  }

  if (!Array.isArray(out.sonderbuchungen)) out.sonderbuchungen = [];

  return out;
}

// Migriert einen Snapshot von Schema v1 nach v2:
// - variableIncome → income (mit recurring=false)
// - spontanInvest → invest (mit recurring=false)
// - invest items ohne category bekommen 'sonstiges' und recurring=true
function migrateSnapshot(snap: any): MonthSnapshot {
  const out: MonthSnapshot = {
    monthKey: snap.monthKey,
    income: Array.isArray(snap.income) ? [...snap.income] : [],
    contracts: Array.isArray(snap.contracts) ? snap.contracts : [],
    invest: Array.isArray(snap.invest) ? snap.invest.map((i: any): Posten => ({
      id: i.id, name: i.name, amount: i.amount || 0,
      category: i.category || 'sonstiges',
      recurring: i.recurring !== false,  // default = wiederkehrend
      note: i.note,
    })) : [],
    variableExpenses: Array.isArray(snap.variableExpenses) ? snap.variableExpenses : [],
    cash: Array.isArray(snap.cash) ? snap.cash : [],
  };
  // variableIncome → income (recurring=false)
  if (Array.isArray(snap.variableIncome) && snap.variableIncome.length > 0) {
    for (const p of snap.variableIncome) {
      out.income.push({ ...p, recurring: false });
    }
  }
  // spontanInvest → invest (recurring=false)
  if (Array.isArray(snap.spontanInvest) && snap.spontanInvest.length > 0) {
    for (const p of snap.spontanInvest) {
      out.invest.push({ ...p, category: p.category || 'sonstiges', recurring: false });
    }
  }
  return out;
}

function migrate(raw: any): FinanzData {
  if (!raw || typeof raw !== 'object') return seedData();
  const rawProps: any[] = Array.isArray(raw.properties) ? raw.properties : [];
  const properties = rawProps.map(p => migrateImmobilie(p as Immobilie));
  const rawMonths = raw.months && typeof raw.months === 'object' ? raw.months : {};
  const months: Record<string, MonthSnapshot> = {};
  for (const mk of Object.keys(rawMonths)) {
    months[mk] = migrateSnapshot(rawMonths[mk]);
  }
  const data: FinanzData = {
    schemaVersion: SCHEMA_VERSION,
    months,
    properties,
    steuerposten: Array.isArray(raw.steuerposten) ? raw.steuerposten : [],
    konten: Array.isArray(raw.konten) ? raw.konten : [],
    kontoStaende: Array.isArray(raw.kontoStaende) ? raw.kontoStaende : [],
    settings: { ...seedData().settings, ...(raw.settings ?? {}) },
  };
  if (Object.keys(data.months).length === 0) {
    const seed = seedData();
    data.months = seed.months;
  }
  return data;
}

// ── Laden / Speichern ────────────────────────────────────────────────────────

export async function loadData(): Promise<FinanzData> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    return raw ? migrate(JSON.parse(raw)) : seedData();
  } catch {
    return seedData();
  }
}

export async function saveData(data: FinanzData): Promise<void> {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// ── Monats-Rollover ──────────────────────────────────────────────────────────
// Entscheidung 10: neuer Monat übernimmt Einnahmen, Verträge und wiederkehrendes
// Invest aus dem letzten vorhandenen Vormonat. Variable Kosten/Einnahmen,
// Bargeld und spontane Invests starten leer.

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function latestMonthKeyBefore(data: FinanzData, monthKey: string): string | null {
  const earlier = Object.keys(data.months)
    .filter(k => compareMonthKey(k, monthKey) < 0)
    .sort(compareMonthKey);
  return earlier.length ? earlier[earlier.length - 1] : null;
}

// Liefert den Snapshot für `monthKey`. Existiert er nicht, wird er per
// Rollover erzeugt (mutiert `data.months`, ruft KEIN save auf).
export function ensureMonth(data: FinanzData, monthKey: string): MonthSnapshot {
  const existing = data.months[monthKey];
  if (existing) return existing;

  const baseKey = latestMonthKeyBefore(data, monthKey);
  let snap: MonthSnapshot;
  if (baseKey) {
    const base = data.months[baseKey];
    snap = {
      monthKey,
      // Nur wiederkehrende Einnahmen + Invests wandern in den neuen Monat
      income: deepClone(base.income.filter(p => p.recurring !== false)),
      contracts: deepClone(base.contracts),
      invest: deepClone(base.invest.filter(p => p.recurring !== false)),
      variableExpenses: [],
      cash: [],
    };
  } else {
    snap = seedSnapshot(monthKey);
  }
  data.months[monthKey] = snap;
  return snap;
}

// Bequemer Einstieg: lädt Daten, stellt den aktuellen Monat sicher, speichert
// bei Bedarf und gibt {data, snapshot} zurück.
export async function loadWithMonth(
  monthKey: string = currentMonthKey(),
): Promise<{ data: FinanzData; snapshot: MonthSnapshot }> {
  const data = await loadData();
  const before = data.months[monthKey];
  const snapshot = ensureMonth(data, monthKey);
  if (!before) await saveData(data);
  return { data, snapshot };
}

export async function saveSettings(
  data: FinanzData,
  partial: Partial<FinanzSettings>,
): Promise<FinanzData> {
  const updated: FinanzData = { ...data, settings: { ...data.settings, ...partial } };
  await saveData(updated);
  return updated;
}
