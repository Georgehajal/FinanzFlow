// Finanzflow — Berechnungslogik (rein, ohne UI/Storage-Seiteneffekte)

import {
  FinanzData, MonthSnapshot, Vertrag, Immobilie, Posten,
  monthNumber, prevMonthKey, compareMonthKey, addMonthsKey, monthLabel,
} from './model';

// ── Formatierung ─────────────────────────────────────────────────────────────

export function formatEuro(n: number, opts: { sign?: boolean; decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  const abs = Math.abs(n).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = opts.sign ? (n >= 0 ? '+' : '−') : n < 0 ? '−' : '';
  return `${sign}${abs} €`;
}

export function euroParts(n: number): { whole: string; dec: string } {
  const fixed = Math.abs(n).toFixed(2);
  const [whole, dec] = fixed.split('.');
  return { whole: parseInt(whole, 10).toLocaleString('de-DE'), dec };
}

const sum = (xs: { amount: number }[]) => xs.reduce((a, b) => a + (b.amount || 0), 0);

// ── Verträge / Fixkosten ─────────────────────────────────────────────────────

// Betrag, mit dem ein Vertrag in EINEM Monat zählt.
// Jährlich: voller Betrag nur im Zahlmonat, sonst 0 (Entscheidung 11).
export function contractMonthAmount(v: Vertrag, monthKey: string): number {
  if (v.interval === 'monthly') return v.amount || 0;
  const pm = v.paymentMonth ?? 1;
  return monthNumber(monthKey) === pm ? v.amount || 0 : 0;
}

export interface CancelInfo {
  kuendbarBis: string | null;   // ISO-Datum: spätester Kündigungstag
  tageBisKuendigung: number | null;
  baldKuendbar: boolean;        // < 120 Tage bis Kündigungsfrist-Stichtag
  abgelaufen: boolean;          // Kündigungsfenster bereits verpasst
}

const DAY = 86400000;

function parseISO(d?: string): Date | null {
  if (!d) return null;
  const t = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return isNaN(t.getTime()) ? null : t;
}

export function contractCancelInfo(v: Vertrag, ref: Date = new Date()): CancelInfo {
  const ende = parseISO(v.vertragsende);
  if (!ende) {
    return { kuendbarBis: null, tageBisKuendigung: null, baldKuendbar: false, abgelaufen: false };
  }
  const fristMs = (v.kuendigungsfristTage ?? 0) * DAY;
  const kuendbarBisDate = new Date(ende.getTime() - fristMs);
  const tage = Math.ceil((kuendbarBisDate.getTime() - ref.getTime()) / DAY);
  return {
    kuendbarBis: kuendbarBisDate.toISOString().slice(0, 10),
    tageBisKuendigung: tage,
    baldKuendbar: tage >= 0 && tage < 120,
    abgelaufen: tage < 0,
  };
}

// ── Dashboard-Aggregation (Monatsschnappschuss) ──────────────────────────────

export interface MonthMetrics {
  monthKey: string;
  einnahmen: number;          // fixe Einnahmen + variable Einnahmen + Bargeld-Einnahmen
  fixkosten: number;          // Summe Verträge (Monatsbetrag)
  variableKosten: number;     // variable Ausgaben + Bargeld-Ausgaben
  invest: number;             // wiederkehrend + spontan
  ueberschuss: number;        // einnahmen − fixkosten − variableKosten (Invest NICHT abgezogen)
  freierUeberschuss: number;  // ueberschuss − invest (nachdem Invest zurückgelegt ist)
  sparquote: number;          // invest / einnahmen (0..1), Invest = Sparen (Entscheidung 13)
  bargeldEin: number;
  bargeldAus: number;
}

export function computeMetrics(snap: MonthSnapshot): MonthMetrics {
  const bargeldEin = snap.cash.filter(c => c.direction === 'in').reduce((a, c) => a + (c.amount || 0), 0);
  const bargeldAus = snap.cash.filter(c => c.direction === 'out').reduce((a, c) => a + (c.amount || 0), 0);

  const einnahmen = sum(snap.income) + sum(snap.variableIncome) + bargeldEin;
  const fixkosten = snap.contracts.reduce((a, v) => a + contractMonthAmount(v, snap.monthKey), 0);
  const variableKosten = sum(snap.variableExpenses) + bargeldAus;
  const invest = sum(snap.invest) + sum(snap.spontanInvest);

  const ueberschuss = einnahmen - fixkosten - variableKosten;
  return {
    monthKey: snap.monthKey,
    einnahmen,
    fixkosten,
    variableKosten,
    invest,
    ueberschuss,
    freierUeberschuss: ueberschuss - invest,
    sparquote: einnahmen > 0 ? invest / einnahmen : 0,
    bargeldEin,
    bargeldAus,
  };
}

// Ausgaben je Kategorie (für Aufschlüsselung / Phase 3 / Diagramme später).
export function expenseByCategory(snap: MonthSnapshot): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (cat: string, amt: number) => { out[cat] = (out[cat] || 0) + amt; };
  for (const v of snap.contracts) {
    const a = contractMonthAmount(v, snap.monthKey);
    if (a) add(v.category, a);
  }
  for (const p of snap.variableExpenses) add(p.category, p.amount || 0);
  for (const c of snap.cash) if (c.direction === 'out') add('bargeld', c.amount || 0);
  return out;
}

// ── Vormonatsvergleich ───────────────────────────────────────────────────────

export interface MetricsDelta {
  current: MonthMetrics;
  previous: MonthMetrics | null;
  delta: Partial<Record<keyof MonthMetrics, number>> | null;
}

// Projiziert (ohne zu speichern) den Snapshot eines Monats: existiert er nicht,
// werden die fixen Teile des letzten Vormonats verwendet (Entscheidung 10).
export function projectSnapshot(data: FinanzData, monthKey: string): MonthSnapshot {
  const existing = data.months[monthKey];
  if (existing) return existing;
  const earlier = Object.keys(data.months)
    .filter(k => compareMonthKey(k, monthKey) < 0)
    .sort(compareMonthKey);
  const base = earlier.length ? data.months[earlier[earlier.length - 1]] : null;
  return {
    monthKey,
    income: base ? base.income : [],
    contracts: base ? base.contracts : [],
    invest: base ? base.invest : [],
    variableExpenses: [],
    variableIncome: [],
    cash: [],
    spontanInvest: [],
  };
}

export function compareToPrevMonth(data: FinanzData, monthKey: string): MetricsDelta {
  const current = computeMetrics(projectSnapshot(data, monthKey));
  const pmk = prevMonthKey(monthKey);
  const hasPrev = !!data.months[pmk];
  if (!hasPrev) return { current, previous: null, delta: null };
  const previous = computeMetrics(data.months[pmk]);
  const numericKeys: (keyof MonthMetrics)[] = [
    'einnahmen', 'fixkosten', 'variableKosten', 'invest',
    'ueberschuss', 'freierUeberschuss', 'sparquote', 'bargeldEin', 'bargeldAus',
  ];
  const delta: Partial<Record<keyof MonthMetrics, number>> = {};
  for (const k of numericKeys) {
    delta[k] = (current[k] as number) - (previous[k] as number);
  }
  return { current, previous, delta };
}

// ── Jahresübersicht ──────────────────────────────────────────────────────────

export interface YearOverview {
  year: number;
  months: MonthMetrics[];     // 12 Einträge (Jan..Dez), projiziert wo nötig
  totals: {
    einnahmen: number;
    fixkosten: number;
    variableKosten: number;
    invest: number;
    ueberschuss: number;
  };
}

export function yearOverview(data: FinanzData, year: number): YearOverview {
  const months: MonthMetrics[] = [];
  const totals = { einnahmen: 0, fixkosten: 0, variableKosten: 0, invest: 0, ueberschuss: 0 };
  for (let m = 1; m <= 12; m++) {
    const mk = `${year}-${String(m).padStart(2, '0')}`;
    const metrics = computeMetrics(projectSnapshot(data, mk));
    months.push(metrics);
    totals.einnahmen += metrics.einnahmen;
    totals.fixkosten += metrics.fixkosten;
    totals.variableKosten += metrics.variableKosten;
    totals.invest += metrics.invest;
    totals.ueberschuss += metrics.ueberschuss;
  }
  return { year, months, totals };
}

// ── Immobilien — Annuitätenkredit (Entscheidung 12) ──────────────────────────

export interface AmortResult {
  monatsrate: number;          // Annuität (Zins + Tilgung)
  restschuld: number;          // zum Stichtag
  bereitsGetilgt: number;      // Tilgungsanteil bisher
  gezahlteZinsen: number;      // Zinsanteil bisher
  monateGezahlt: number;
  restlaufzeitMonate: number;
  aktuellZinsanteil: number;   // Zinsanteil der nächsten Rate
  aktuellTilgungsanteil: number;
  mietCashflow: number;        // Warmmiete − Nebenkosten − Rate (Info)
  bruttoRendite: number;       // Kaltmiete*12 / Kreditsumme (0..1, Info)
}

function monthsBetween(startISO: string, asOf: Date): number {
  const s = parseISO(startISO);
  if (!s) return 0;
  let m = (asOf.getFullYear() - s.getFullYear()) * 12 + (asOf.getMonth() - s.getMonth());
  if (asOf.getDate() < s.getDate()) m -= 1;
  return Math.max(0, m);
}

// Metrik-Serie der letzten `count` Monate bis einschließlich `endMonthKey`
// (für Trend-/Verlaufs-Diagramme). Älteste zuerst.
export interface SeriesPoint extends MonthMetrics {
  label: string;
}

export function monthsSeries(data: FinanzData, endMonthKey: string, count: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const mk = addMonthsKey(endMonthKey, -i);
    const m = computeMetrics(projectSnapshot(data, mk));
    out.push({ ...m, label: monthLabel(mk, { short: true }) });
  }
  return out;
}

// Tilgungsplan-Stützpunkte (jährlich) über die gesamte Kreditlaufzeit —
// für das Tilgungsverlauf-Diagramm.
export interface AmortPoint {
  monthIndex: number;     // 0 = Kreditstart
  jahr: number;           // 0,1,2 … Jahre seit Start
  restschuld: number;
  getilgtKumuliert: number;
}

export function amortSchedule(p: Immobilie): AmortPoint[] {
  const K = p.kreditsumme || 0;
  const n = Math.max(1, Math.round(p.laufzeitMonate || 1));
  const i = (p.sollzinsProzent || 0) / 100 / 12;
  const rate = i === 0 ? K / n : (K * i) / (1 - Math.pow(1 + i, -n));

  const pts: AmortPoint[] = [{ monthIndex: 0, jahr: 0, restschuld: K, getilgtKumuliert: 0 }];
  let rest = K;
  let getilgt = 0;
  for (let k = 1; k <= n; k++) {
    const zins = rest * i;
    const tilgung = Math.min(rate - zins, rest);
    rest = Math.max(0, rest - tilgung);
    getilgt += tilgung;
    if (k % 12 === 0 || k === n) {
      pts.push({ monthIndex: k, jahr: Math.round(k / 12), restschuld: rest, getilgtKumuliert: getilgt });
    }
  }
  return pts;
}

export function amortize(p: Immobilie, asOf: Date = new Date()): AmortResult {
  const K = p.kreditsumme || 0;
  const n = Math.max(1, Math.round(p.laufzeitMonate || 1));
  const i = (p.sollzinsProzent || 0) / 100 / 12;

  const rate = i === 0 ? K / n : (K * i) / (1 - Math.pow(1 + i, -n));

  const elapsed = Math.min(n, monthsBetween(p.kreditStart, asOf));
  let rest = K;
  let getilgt = 0;
  let zinsenGesamt = 0;
  for (let k = 0; k < elapsed; k++) {
    const zins = rest * i;
    const tilgung = Math.min(rate - zins, rest);
    rest -= tilgung;
    getilgt += tilgung;
    zinsenGesamt += zins;
  }
  const aktuellZins = rest * i;
  const aktuellTilgung = Math.min(rate - aktuellZins, rest);

  return {
    monatsrate: rate,
    restschuld: Math.max(0, rest),
    bereitsGetilgt: getilgt,
    gezahlteZinsen: zinsenGesamt,
    monateGezahlt: elapsed,
    restlaufzeitMonate: Math.max(0, n - elapsed),
    aktuellZinsanteil: aktuellZins,
    aktuellTilgungsanteil: aktuellTilgung,
    mietCashflow: (p.warmmiete || 0) - (p.nebenkosten || 0) - rate,
    bruttoRendite: K > 0 ? ((p.kaltmiete || 0) * 12) / K : 0,
  };
}
