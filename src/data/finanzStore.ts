// Finanzflow — Persistenz (AsyncStorage) + Monats-Rollover
// Eigener Storage-Key, unabhängig von CashFlow. Startet leer (Seed-Struktur).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FinanzData, MonthSnapshot, FinanzSettings,
  SCHEMA_VERSION, seedData, seedSnapshot, currentMonthKey,
  compareMonthKey,
} from './model';

const DATA_KEY = 'ff_data_v1';

// ── Migration ────────────────────────────────────────────────────────────────

function migrate(raw: any): FinanzData {
  if (!raw || typeof raw !== 'object') return seedData();
  // Künftige Schema-Migrationen hier einhängen (raw.schemaVersion prüfen).
  const data: FinanzData = {
    schemaVersion: SCHEMA_VERSION,
    months: raw.months && typeof raw.months === 'object' ? raw.months : {},
    properties: Array.isArray(raw.properties) ? raw.properties : [],
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
      // Nur wiederkehrende Einnahmen wandern in den neuen Monat;
      // einmalige (recurring === false) bleiben nur in ihrem Monat.
      income: deepClone(base.income.filter(p => p.recurring !== false)),
      contracts: deepClone(base.contracts),
      invest: deepClone(base.invest),
      variableExpenses: [],
      variableIncome: [],
      cash: [],
      spontanInvest: [],
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
