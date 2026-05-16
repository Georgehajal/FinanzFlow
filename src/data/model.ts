// Finanzflow — Domänen-Datenmodell
// Monats-Schnappschuss-basiert. Keine Einzelbuchungen mit Datum (außer Bargeld-
// Einträge, die aber nur als Monatssumme ins Dashboard fließen — kein Kassenstand).

export const SCHEMA_VERSION = 1;

// ── Kategorien (frei umbenennbar pro Posten via eigenem `name`) ───────────────
// Kategorie ist nur ein Tag für Farbe/Icon/Gruppierung. Der angezeigte Name
// kommt immer vom Posten selbst (Entscheidung 7: alles umbenennbar).

export type Direction = 'income' | 'expense';

// Art eines Postens (Entscheidung 3 + Spec-Punkt 6: System merkt Richtung + Art)
export type PostenArt = 'fix' | 'variabel' | 'bargeld' | 'invest';

export interface CategoryDef {
  key: string;
  label: string;
  color: string;
  icon: string;
}

export const INCOME_CATEGORIES: CategoryDef[] = [
  { key: 'gehalt',     label: 'Gehalt',          color: '#B8F12C', icon: 'wallet' },
  { key: 'kindergeld', label: 'Kindergeld',      color: '#34D399', icon: 'gift'   },
  { key: 'nebenjob',   label: 'Nebenjob',        color: '#60A5FA', icon: 'trend'  },
  { key: 'erstattung', label: 'Erstattung',      color: '#A78BFA', icon: 'sync'   },
  { key: 'sonstiges',  label: 'Sonstige Einnahme', color: '#9CA3AF', icon: 'dot'  },
];

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { key: 'wohnen',     label: 'Wohnen',     color: '#60A5FA', icon: 'home'     },
  { key: 'versicherung', label: 'Versicherung', color: '#A78BFA', icon: 'lock' },
  { key: 'mobilitaet', label: 'Mobilität',  color: '#38BDF8', icon: 'car'      },
  { key: 'lebensmittel', label: 'Lebensmittel', color: '#FB923C', icon: 'bag'  },
  { key: 'abo',        label: 'Abos/Verträge', color: '#F472B6', icon: 'sync'  },
  { key: 'gesundheit', label: 'Gesundheit', color: '#34D399', icon: 'cross'    },
  { key: 'freizeit',   label: 'Freizeit',   color: '#F87171', icon: 'music'    },
  { key: 'sonstiges',  label: 'Sonstiges',  color: '#9CA3AF', icon: 'dot'      },
];

export function categoryDef(dir: Direction, key: string): CategoryDef {
  const list = dir === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find(c => c.key === key) ?? list[list.length - 1];
}

// ── Posten ───────────────────────────────────────────────────────────────────

// Generischer Posten für Einnahmen, variable Kosten, spontane Invests.
export interface Posten {
  id: string;
  name: string;          // frei umbenennbar
  category: string;      // Kategorie-Key (Tag)
  amount: number;        // immer positiv; Richtung ergibt sich aus dem Listentyp
  note?: string;
  // Nur für Einnahmen relevant: true/undefined = wiederkehrend (wird in Folge-
  // monate übertragen), false = einmalig (nur in diesem Monat).
  recurring?: boolean;
}

export type VertragInterval = 'monthly' | 'yearly';

// Vertrag = Fixkosten. Monatlich oder jährlich (jährlich → nur im Zahlmonat,
// Entscheidung 11). Kündigungslogik wie Finanzübersicht.
export interface Vertrag {
  id: string;
  name: string;
  category: string;
  amount: number;                 // Betrag pro Zahlung (monatlich bzw. jährlich)
  interval: VertragInterval;
  paymentMonth?: number;          // 1–12, nur bei interval='yearly'
  kuendigungsfristTage?: number;  // z. B. 90
  vertragsende?: string;          // ISO-Datum 'YYYY-MM-DD' (Ende der Mindestlaufzeit)
  note?: string;
}

// Wiederkehrendes Investment (monatlich). Spontane Invests = Posten in
// snapshot.spontanInvest.
export interface InvestPlan {
  id: string;
  name: string;
  amount: number;       // monatlich
  note?: string;
}

// ── Monats-Schnappschuss ─────────────────────────────────────────────────────
// Jeder Monat ist ein vollständiger, eigenständiger Snapshot. Beim Anlegen eines
// neuen Monats werden die FIXEN Teile aus dem letzten vorherigen Snapshot
// kopiert (Entscheidung 10); variable Kosten/Einnahmen, Bargeld und spontane
// Invests starten leer.

export interface CashEntry {
  id: string;
  name: string;
  amount: number;             // positiv
  direction: 'in' | 'out';    // 'in' → Einnahmen, 'out' → variable Kosten
  ts: string;                 // ISO-Zeitstempel (nur zur Sortierung/Anzeige)
}

export interface MonthSnapshot {
  monthKey: string;             // 'YYYY-MM'
  income: Posten[];             // fixe/wiederkehrende Einnahmen — wird übertragen
  contracts: Vertrag[];         // Fixkosten/Verträge — wird übertragen
  invest: InvestPlan[];         // wiederkehrendes Invest — wird übertragen
  variableExpenses: Posten[];   // startet leer pro Monat
  variableIncome: Posten[];     // startet leer pro Monat
  cash: CashEntry[];            // startet leer pro Monat
  spontanInvest: Posten[];      // startet leer pro Monat
}

// ── Immobilien (komplett separat, fließt NICHT ins Dashboard) ────────────────

export interface Immobilie {
  id: string;
  name: string;
  // Kredit-Eingaben (Entscheidung 12): Summe + Sollzins % + Laufzeit → Rest wird berechnet
  kreditsumme: number;
  sollzinsProzent: number;      // p. a. in %
  laufzeitMonate: number;
  kreditStart: string;          // ISO-Datum 'YYYY-MM-DD'
  // Vermietung
  kaltmiete: number;
  warmmiete: number;
  nebenkosten: number;
  vermietetSeit?: string;       // ISO-Datum
  note?: string;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface FinanzSettings {
  dark: boolean;
  accent: string;
  userName: string;
  userEmail: string;
}

export const DEFAULT_SETTINGS: FinanzSettings = {
  dark: true,
  accent: '#B8F12C',
  userName: 'Mein Haushalt',
  userEmail: '',
};

// ── Wurzel-Datencontainer ────────────────────────────────────────────────────

export interface FinanzData {
  schemaVersion: number;
  months: Record<string, MonthSnapshot>;   // key = 'YYYY-MM'
  properties: Immobilie[];
  settings: FinanzSettings;
}

// ── Monatsschlüssel-Helfer ───────────────────────────────────────────────────

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(): string {
  return monthKeyOf(new Date());
}

export function monthNumber(monthKey: string): number {
  return parseInt(monthKey.slice(5, 7), 10); // 1–12
}

export function yearOf(monthKey: string): number {
  return parseInt(monthKey.slice(0, 4), 10);
}

export function prevMonthKey(monthKey: string): string {
  const y = yearOf(monthKey);
  const m = monthNumber(monthKey);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function compareMonthKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addMonthsKey(monthKey: string, delta: number): string {
  let y = yearOf(monthKey);
  let m = monthNumber(monthKey) - 1 + delta; // 0-basiert
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function nextMonthKey(monthKey: string): string {
  return addMonthsKey(monthKey, 1);
}

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function monthLabel(monthKey: string, opts: { short?: boolean } = {}): string {
  const name = MONTHS_DE[monthNumber(monthKey) - 1] ?? '';
  return opts.short ? `${name.slice(0, 3)} ${yearOf(monthKey)}` : `${name} ${yearOf(monthKey)}`;
}

// ── Seed: sinnvolle, leere Startstruktur (Entscheidung 7) ────────────────────
// Keine Demo-Beträge — Posten existieren mit 0, damit der Nutzer nur ausfüllt.

let idCounter = 0;
export function newId(prefix = 'p'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function seedSnapshot(monthKey: string): MonthSnapshot {
  return {
    monthKey,
    income: [
      { id: newId('inc'), name: 'Gehalt',     category: 'gehalt',     amount: 0 },
      { id: newId('inc'), name: 'Kindergeld', category: 'kindergeld', amount: 0 },
    ],
    contracts: [
      { id: newId('ver'), name: 'Miete',          category: 'wohnen',       amount: 0, interval: 'monthly' },
      { id: newId('ver'), name: 'Strom',          category: 'wohnen',       amount: 0, interval: 'monthly' },
      { id: newId('ver'), name: 'Internet/Handy', category: 'abo',          amount: 0, interval: 'monthly' },
      { id: newId('ver'), name: 'Versicherungen', category: 'versicherung', amount: 0, interval: 'monthly' },
    ],
    invest: [
      { id: newId('inv'), name: 'Sparplan', amount: 0 },
    ],
    variableExpenses: [],
    variableIncome: [],
    cash: [],
    spontanInvest: [],
  };
}

export function seedData(): FinanzData {
  const mk = currentMonthKey();
  return {
    schemaVersion: SCHEMA_VERSION,
    months: { [mk]: seedSnapshot(mk) },
    properties: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
