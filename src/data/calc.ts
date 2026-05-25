// Finanzflow — Berechnungslogik (rein, ohne UI/Storage-Seiteneffekte)

import {
  FinanzData, MonthSnapshot, Vertrag, Immobilie, Posten,
  KreditPlan, KreditPlanTyp, Sondertilgung, Mietperiode, Sonderbuchung,
  SteuerPosten, SteuerBereich, steuerKategorieLabel,
  Konto, KontoStand,
  AnnuitaetPlan, BausparenPlan, VorausdarlehenPlan, EndfaelligPlan,
  TilgungPlan, KfwPlan, VariabelPlan, EigenPlan,
  monthNumber, prevMonthKey, compareMonthKey, addMonthsKey, monthLabel, yearOf,
} from './model';
import { compareISO, monthsBetweenISO as monthsBetweenISOStrict } from './dateUtils';

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

  const einnahmen = sum(snap.income) + bargeldEin;
  const fixkosten = snap.contracts.reduce((a, v) => a + contractMonthAmount(v, snap.monthKey), 0);
  const variableKosten = sum(snap.variableExpenses) + bargeldAus;
  const invest = sum(snap.invest);

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
    income: base ? base.income.filter(p => p.recurring !== false) : [],
    contracts: base ? base.contracts : [],
    invest: base ? base.invest.filter(p => p.recurring !== false) : [],
    variableExpenses: [],
    cash: [],
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

  const elapsed = Math.min(n, monthsBetween(p.kreditStart || '', asOf));
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

// ─────────────────────────────────────────────────────────────────────────────
// ── Kreditpläne (neu): vereinheitlichte Statusberechnung pro Vertragstyp ────
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_TYP_LABEL: Record<KreditPlanTyp, string> = {
  annuitaet: 'Annuitätendarlehen',
  bausparen: 'Bausparvertrag',
  vorausdarlehen: 'Vorausdarlehen',
  endfaellig: 'Endfälliges Darlehen',
  tilgung: 'Tilgungsdarlehen',
  kfw: 'KfW-Darlehen',
  variabel: 'Variables Darlehen',
  eigen: 'Eigener Vertrag',
};

export const PLAN_TYP_KURZ: Record<KreditPlanTyp, string> = {
  annuitaet: 'Annuität',
  bausparen: 'Bauspar',
  vorausdarlehen: 'Vorausdarl.',
  endfaellig: 'Endfällig',
  tilgung: 'Tilgung €',
  kfw: 'KfW',
  variabel: 'Variabel',
  eigen: 'Eigen',
};

export interface PlanStatus {
  typ: KreditPlanTyp;
  monatsrate: number;             // aktuelle Belastung pro Monat
  zinsanteilAktuell: number;
  tilgungAnteilAktuell: number;
  restschuld: number;             // verbleibende Schuld (oder verbleibend bis Ziel bei Bauspar Anspar)
  bereitsGezahlt: number;         // Summe aller bisher gezahlten Raten + Sondertilgungen
  gezahlteZinsen: number;
  gezahlteTilgung: number;        // inkl. Sondertilgungen
  sondertilgungenSumme: number;
  monateGezahlt: number;
  restlaufzeitMonate: number;     // 0 falls unbekannt — bezieht sich auf Komplett-Tilgung
  phaseLabel?: string;
  // Bauspar-spezifisch
  bausparGuthaben?: number;
  zuteilungInMonaten?: number;
}

// Zinsbindungs-Info zu einem Plan (für UI-Warnung & Restschuldprognose)
export interface ZinsbindungInfo {
  hatZinsbindung: boolean;
  endeISO?: string;
  monateBisEnde?: number;          // < 0 = bereits abgelaufen
  warnung: boolean;                // true wenn < 12 Mon. verbleibend (oder schon abgelaufen)
  restschuldZumEnde?: number;      // berechnete voraussichtliche Restschuld
}

export function zinsbindungInfo(plan: KreditPlan, asOf: Date = new Date()): ZinsbindungInfo {
  if (!plan.zinsbindungBis) return { hatZinsbindung: false, warnung: false };
  const ende = parseISO(plan.zinsbindungBis);
  if (!ende) return { hatZinsbindung: false, warnung: false };
  let monate = (ende.getFullYear() - asOf.getFullYear()) * 12 + (ende.getMonth() - asOf.getMonth());
  if (ende.getDate() < asOf.getDate()) monate -= 1;
  const stEnde = planStatus(plan, ende);
  return {
    hatZinsbindung: true,
    endeISO: plan.zinsbindungBis,
    monateBisEnde: monate,
    warnung: monate < 12,
    restschuldZumEnde: stEnde.restschuld,
  };
}

function monthsBetweenISO(start: string, asOf: Date): number {
  return monthsBetween(start, asOf);
}

// Sondertilgungen die vor `asOf` liegen, als Liste {monthIndex, betrag}
function sortedSondertilgungen(plan: KreditPlan, asOf: Date): { monthIndex: number; betrag: number }[] {
  const list = plan.sondertilgungen ?? [];
  if (list.length === 0) return [];
  const start = parseISO(plan.startDatum);
  if (!start) return [];
  return list
    .map(s => {
      const d = parseISO(s.datum);
      if (!d || d > asOf) return null;
      const mi = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      return { monthIndex: Math.max(0, mi), betrag: s.betrag || 0 };
    })
    .filter((x): x is { monthIndex: number; betrag: number } => !!x)
    .sort((a, b) => a.monthIndex - b.monthIndex);
}

function sondertilgungenSumAt(plan: KreditPlan, asOf: Date): number {
  return sortedSondertilgungen(plan, asOf).reduce((a, x) => a + x.betrag, 0);
}

// Simuliert ein Annuitäten-/Tilgungsdarlehen mit Sondertilgungen.
// Gibt detaillierten Status zum Stichtag zurück.
function simulateAnnuity(opts: {
  K: number; i: number; n: number;       // Kreditsumme, Monatszins, Laufzeit
  elapsed: number; specials: { monthIndex: number; betrag: number }[];
}): { restschuld: number; getilgt: number; zinsen: number; rate: number; aktZins: number; aktTilgung: number; restMonate: number } {
  const { K, i, n, elapsed, specials } = opts;
  const rate = i === 0 ? K / Math.max(1, n) : (K * i) / (1 - Math.pow(1 + i, -Math.max(1, n)));

  let rest = K;
  let getilgt = 0;
  let zinsen = 0;
  let specIdx = 0;
  const totalMonths = Math.max(1, n);
  let lastActiveMonth = totalMonths;
  for (let k = 0; k < totalMonths && rest > 0; k++) {
    // Sondertilgungen zu Beginn des Monats verrechnen
    while (specIdx < specials.length && specials[specIdx].monthIndex === k) {
      const s = Math.min(specials[specIdx].betrag, rest);
      rest -= s;
      getilgt += s;
      specIdx++;
    }
    if (rest <= 0) { lastActiveMonth = k; break; }
    if (k >= elapsed) { lastActiveMonth = k; break; }
    const zins = rest * i;
    const tilgung = Math.min(rate - zins, rest);
    rest -= tilgung;
    getilgt += tilgung;
    zinsen += zins;
  }
  const aktZins = rest * i;
  const aktTilgung = Math.min(rate - aktZins, rest);
  // Restlaufzeit grob schätzen (bei Sondertilgungen verkürzt sich's; hier vereinfacht über Restschuld + Rate)
  let restMonate = 0;
  if (rest > 0 && rate > 0) {
    if (i === 0) restMonate = Math.ceil(rest / rate);
    else restMonate = Math.ceil(Math.log(rate / (rate - rest * i)) / Math.log(1 + i));
    if (!isFinite(restMonate) || restMonate < 0) restMonate = Math.max(0, n - elapsed);
  }
  return { restschuld: Math.max(0, rest), getilgt, zinsen, rate, aktZins, aktTilgung, restMonate };
}

function annuityRate(K: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? K / n : (K * i) / (1 - Math.pow(1 + i, -n));
}

function statusAnnuitaet(plan: AnnuitaetPlan, asOf: Date): PlanStatus {
  const K = plan.kreditsumme || 0;
  const i = (plan.sollzinsProzent || 0) / 100 / 12;
  const tilgungsfrei = Math.max(0, Math.round(plan.tilgungsfreieMonate || 0));

  // Laufzeit / Rate aus 3 Optionen herleiten:
  // 1) Monatsrate angegeben → Laufzeit berechnen
  // 2) Laufzeit angegeben    → Rate berechnen
  // 3) Tilgungssatz % p.a.   → Laufzeit aus Tilgungssatz, dann Rate
  let n = 0;
  let rateExplicit = plan.monatsrate || 0;
  if (rateExplicit > 0) {
    // Rate explizit: Laufzeit aus K, i, Rate
    if (i === 0) n = Math.ceil(K / rateExplicit);
    else {
      const denom = rateExplicit - K * i;
      n = denom > 0 ? Math.ceil(-Math.log(1 - (K * i) / rateExplicit) / Math.log(1 + i)) : 600;
    }
  } else if (plan.laufzeitMonate && plan.laufzeitMonate > 0) {
    n = plan.laufzeitMonate;
  } else if (plan.tilgungsProzent && plan.tilgungsProzent > 0) {
    const t = plan.tilgungsProzent / 100 / 12;
    if (i === 0) n = Math.ceil(1 / t);
    else n = Math.ceil(-Math.log(t / (t + i)) / Math.log(1 + i));
  }
  n = Math.max(1, n);
  const elapsed = monthsBetweenISO(plan.startDatum, asOf);

  // Simulation mit optionaler tilgungsfreier Anlaufzeit
  const specials = sortedSondertilgungen(plan, asOf);
  const specSum = specials.reduce((a, s) => a + s.betrag, 0);

  if (elapsed < tilgungsfrei) {
    // noch in tilgungsfreier Phase
    const rate = K * i;
    return {
      typ: 'annuitaet',
      monatsrate: rate,
      zinsanteilAktuell: rate,
      tilgungAnteilAktuell: 0,
      restschuld: Math.max(0, K - specSum),
      bereitsGezahlt: elapsed * rate + specSum,
      gezahlteZinsen: elapsed * rate,
      gezahlteTilgung: specSum,
      sondertilgungenSumme: specSum,
      monateGezahlt: elapsed,
      restlaufzeitMonate: Math.max(0, n - elapsed),
      phaseLabel: tilgungsfrei > 0 ? `Tilgungsfreie Anlaufzeit (${tilgungsfrei} Mon.)` : undefined,
    };
  }
  // Annuitätsphase
  const elapsedAnn = Math.min(n, elapsed - tilgungsfrei);
  const specialsAnn = specials.map(s => ({ monthIndex: Math.max(0, s.monthIndex - tilgungsfrei), betrag: s.betrag }));
  const sim = simulateAnnuity({ K, i, n, elapsed: elapsedAnn, specials: specialsAnn });
  const zinsenTilgungsfrei = tilgungsfrei * K * i;
  // Wenn Monatsrate explizit gesetzt war, diese gegenüber berechneter bevorzugen (Rundungs-Konsistenz)
  const finalRate = rateExplicit > 0 ? rateExplicit : sim.rate;
  return {
    typ: 'annuitaet',
    monatsrate: finalRate,
    zinsanteilAktuell: sim.aktZins,
    tilgungAnteilAktuell: Math.max(0, finalRate - sim.aktZins),
    restschuld: sim.restschuld,
    bereitsGezahlt: zinsenTilgungsfrei + sim.zinsen + sim.getilgt,
    gezahlteZinsen: zinsenTilgungsfrei + sim.zinsen,
    gezahlteTilgung: sim.getilgt,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: sim.restMonate,
    phaseLabel: tilgungsfrei > 0 ? 'Tilgungsphase' : undefined,
  };
}

function statusVorausdarlehen(plan: VorausdarlehenPlan, asOf: Date): PlanStatus {
  const K = plan.kreditsumme || 0;
  const i = (plan.sollzinsProzent || 0) / 100 / 12;
  const n = Math.max(1, plan.laufzeitMonate || 1);
  const elapsed = Math.min(n, monthsBetweenISO(plan.startDatum, asOf));
  const specSum = sondertilgungenSumAt(plan, asOf);
  const sparrate = plan.paralleleSparrate || 0;
  const zinsRate = K * i;
  const rate = zinsRate + sparrate;
  // Parallele Sparrate wird als „Tilgung im Voraus" gerechnet:
  // sie sammelt sich an und löst später das Darlehen ab.
  const sparGuthaben = elapsed * sparrate;
  const rest = Math.max(0, K - specSum - sparGuthaben);
  return {
    typ: 'vorausdarlehen',
    monatsrate: rate,
    zinsanteilAktuell: zinsRate,
    tilgungAnteilAktuell: sparrate,
    restschuld: rest,
    bereitsGezahlt: elapsed * rate + specSum,
    gezahlteZinsen: elapsed * zinsRate,
    gezahlteTilgung: sparGuthaben + specSum,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: Math.max(0, n - elapsed),
    phaseLabel: sparrate > 0 ? `Tilgungsfrei + Sparrate ${sparrate.toFixed(2)} €` : 'Tilgungsfrei',
  };
}

function statusEndfaellig(plan: EndfaelligPlan, asOf: Date): PlanStatus {
  const K = plan.kreditsumme || 0;
  const i = (plan.sollzinsProzent || 0) / 100 / 12;
  const n = Math.max(1, plan.laufzeitMonate || 1);
  const elapsed = Math.min(n, monthsBetweenISO(plan.startDatum, asOf));
  const specSum = sondertilgungenSumAt(plan, asOf);
  const zinsRate = K * i;
  const ersatz = plan.tilgungsersatzMonatlich || 0;
  const rate = zinsRate + ersatz;
  return {
    typ: 'endfaellig',
    monatsrate: rate,
    zinsanteilAktuell: zinsRate,
    tilgungAnteilAktuell: ersatz,
    restschuld: Math.max(0, K - specSum),
    bereitsGezahlt: elapsed * rate + specSum,
    gezahlteZinsen: elapsed * zinsRate,
    gezahlteTilgung: elapsed * ersatz + specSum,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: Math.max(0, n - elapsed),
    phaseLabel: 'Endfällig',
  };
}

function statusTilgung(plan: TilgungPlan, asOf: Date): PlanStatus {
  const K = plan.kreditsumme || 0;
  const i = (plan.sollzinsProzent || 0) / 100 / 12;
  const t = Math.max(0, plan.tilgungEuroMonatlich || 0);
  const elapsed = monthsBetweenISO(plan.startDatum, asOf);
  const specials = sortedSondertilgungen(plan, asOf);
  let rest = K;
  let getilgt = 0;
  let zinsen = 0;
  let specIdx = 0;
  let k = 0;
  const maxIter = 100000;
  while (rest > 0 && k < elapsed && k < maxIter) {
    while (specIdx < specials.length && specials[specIdx].monthIndex === k) {
      const s = Math.min(specials[specIdx].betrag, rest);
      rest -= s; getilgt += s; specIdx++;
    }
    if (rest <= 0) break;
    const zins = rest * i;
    const tilgung = Math.min(t, rest);
    rest -= tilgung;
    getilgt += tilgung;
    zinsen += zins;
    k++;
  }
  const aktZins = rest * i;
  const aktTilg = Math.min(t, rest);
  const restMonate = (t + i * rest) > 0 ? Math.ceil(rest / Math.max(0.01, t)) : 0;
  const specSum = specials.reduce((a, s) => a + s.betrag, 0);
  return {
    typ: 'tilgung',
    monatsrate: aktZins + aktTilg,
    zinsanteilAktuell: aktZins,
    tilgungAnteilAktuell: aktTilg,
    restschuld: Math.max(0, rest),
    bereitsGezahlt: zinsen + getilgt,
    gezahlteZinsen: zinsen,
    gezahlteTilgung: getilgt,
    sondertilgungenSumme: specSum,
    monateGezahlt: Math.min(elapsed, k),
    restlaufzeitMonate: restMonate,
  };
}

function statusKfw(plan: KfwPlan, asOf: Date): PlanStatus {
  const K = plan.kreditsumme || 0;
  const i = (plan.sollzinsProzent || 0) / 100 / 12;
  const tilgungsfreiMon = Math.max(0, (plan.tilgungsfreieAnlaufJahre || 0) * 12);
  const nGesamt = Math.max(tilgungsfreiMon + 1, plan.laufzeitMonate || 0);
  const nAnnuity = nGesamt - tilgungsfreiMon;
  const elapsed = Math.min(nGesamt, monthsBetweenISO(plan.startDatum, asOf));
  const specials = sortedSondertilgungen(plan, asOf);

  if (elapsed < tilgungsfreiMon) {
    const rate = K * i;
    const specSum = specials.reduce((a, s) => a + s.betrag, 0);
    return {
      typ: 'kfw',
      monatsrate: rate,
      zinsanteilAktuell: rate,
      tilgungAnteilAktuell: 0,
      restschuld: Math.max(0, K - specSum),
      bereitsGezahlt: elapsed * rate + specSum,
      gezahlteZinsen: elapsed * rate,
      gezahlteTilgung: specSum,
      sondertilgungenSumme: specSum,
      monateGezahlt: elapsed,
      restlaufzeitMonate: nGesamt - elapsed,
      phaseLabel: `Tilgungsfreie Anlaufzeit (${plan.tilgungsfreieAnlaufJahre} J.)`,
    };
  }
  // nach Anlaufzeit: Annuität auf K - bisherige Sondertilg.
  const elapsedAnn = elapsed - tilgungsfreiMon;
  const specialsAnn = specials.map(s => ({ monthIndex: Math.max(0, s.monthIndex - tilgungsfreiMon), betrag: s.betrag }));
  const specSum = specials.reduce((a, s) => a + s.betrag, 0);
  const sim = simulateAnnuity({ K, i, n: nAnnuity, elapsed: elapsedAnn, specials: specialsAnn });
  const zinsenTilgungsfrei = tilgungsfreiMon * K * i;
  return {
    typ: 'kfw',
    monatsrate: sim.rate,
    zinsanteilAktuell: sim.aktZins,
    tilgungAnteilAktuell: sim.aktTilgung,
    restschuld: sim.restschuld,
    bereitsGezahlt: zinsenTilgungsfrei + sim.zinsen + sim.getilgt,
    gezahlteZinsen: zinsenTilgungsfrei + sim.zinsen,
    gezahlteTilgung: sim.getilgt,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: sim.restMonate,
    phaseLabel: 'Tilgungsphase',
  };
}

function statusVariabel(plan: VariabelPlan, asOf: Date): PlanStatus {
  // Vereinfachung: aktueller Zins gilt durchgehend, Tilgungssatz wie Annuität
  const i = (plan.aktuellerZinsProzent || 0) / 100 / 12;
  const t = (plan.tilgungsProzent || 0) / 100 / 12;
  const K = plan.kreditsumme || 0;
  let n = 0;
  if (t > 0) n = i === 0 ? Math.ceil(1 / t) : Math.ceil(-Math.log(t / (t + i)) / Math.log(1 + i));
  n = Math.max(1, n);
  const elapsed = Math.min(n, monthsBetweenISO(plan.startDatum, asOf));
  const specials = sortedSondertilgungen(plan, asOf);
  const sim = simulateAnnuity({ K, i, n, elapsed, specials });
  const specSum = specials.reduce((a, s) => a + s.betrag, 0);
  return {
    typ: 'variabel',
    monatsrate: sim.rate,
    zinsanteilAktuell: sim.aktZins,
    tilgungAnteilAktuell: sim.aktTilgung,
    restschuld: sim.restschuld,
    bereitsGezahlt: sim.zinsen + sim.getilgt,
    gezahlteZinsen: sim.zinsen,
    gezahlteTilgung: sim.getilgt,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: sim.restMonate,
    phaseLabel: `Variabel (${plan.aktuellerZinsProzent}% akt.)`,
  };
}

function statusBausparen(plan: BausparenPlan, asOf: Date): PlanStatus {
  const BS = plan.bausparsumme || 0;
  const sparrate = plan.sparrate || 0;
  const gz = (plan.guthabenzinsProzent || 0) / 100 / 12;
  const mindest = (plan.mindestguthabenProzent || 40) / 100 * BS;
  const elapsed = monthsBetweenISO(plan.startDatum, asOf);

  // 1. Simuliere Ansparphase bis Zuteilung oder bis asOf
  let guthaben = plan.guthabenAktuell || 0;
  let mon = 0;
  let zuteilungMon: number | null = null;
  const maxIter = 100000;
  while (mon < maxIter) {
    if (guthaben >= mindest) { zuteilungMon = mon; break; }
    guthaben = guthaben * (1 + gz) + sparrate;
    mon++;
    if (mon > 12 * 100) break; // safety
  }
  if (zuteilungMon === null) zuteilungMon = mon;

  if (elapsed < zuteilungMon) {
    // Noch in Ansparphase
    let g = plan.guthabenAktuell || 0;
    for (let k = 0; k < elapsed; k++) g = g * (1 + gz) + sparrate;
    return {
      typ: 'bausparen',
      monatsrate: sparrate,
      zinsanteilAktuell: 0,
      tilgungAnteilAktuell: sparrate,
      restschuld: Math.max(0, BS - g),
      bereitsGezahlt: elapsed * sparrate,
      gezahlteZinsen: 0,
      gezahlteTilgung: elapsed * sparrate,
      sondertilgungenSumme: 0,
      monateGezahlt: elapsed,
      restlaufzeitMonate: Math.max(0, zuteilungMon - elapsed),
      phaseLabel: 'Ansparphase',
      bausparGuthaben: g,
      zuteilungInMonaten: Math.max(0, zuteilungMon - elapsed),
    };
  }
  // Darlehensphase
  const darlehen = Math.max(0, BS - guthaben);
  const di = (plan.darlehenZinsProzent || 0) / 100 / 12;
  // Tilgung: entweder via % p. a. oder direkt als € pro Monat
  const rateEuro = plan.darlehenTilgungEuroMonatlich || 0;
  let nDar = 0;
  if (rateEuro > 0) {
    // Aus Rate die Laufzeit herleiten
    if (di === 0) nDar = Math.ceil(darlehen / rateEuro);
    else {
      const num = darlehen * di;
      nDar = rateEuro > num ? Math.ceil(-Math.log(1 - num / rateEuro) / Math.log(1 + di)) : 600;
    }
  } else {
    const dt = (plan.darlehenTilgungsProzent || 0) / 100 / 12;
    if (dt > 0) nDar = di === 0 ? Math.ceil(1 / dt) : Math.ceil(-Math.log(dt / (dt + di)) / Math.log(1 + di));
  }
  nDar = Math.max(1, nDar);
  const elapsedDar = Math.min(nDar, elapsed - zuteilungMon);
  const specials = sortedSondertilgungen(plan, asOf).map(s => ({ monthIndex: Math.max(0, s.monthIndex - zuteilungMon), betrag: s.betrag }));
  const sim = simulateAnnuity({ K: darlehen, i: di, n: nDar, elapsed: elapsedDar, specials });
  if (rateEuro > 0) sim.rate = rateEuro; // explizite €-Rate bevorzugen
  const specSum = specials.reduce((a, s) => a + s.betrag, 0);
  return {
    typ: 'bausparen',
    monatsrate: sim.rate,
    zinsanteilAktuell: sim.aktZins,
    tilgungAnteilAktuell: sim.aktTilgung,
    restschuld: sim.restschuld,
    bereitsGezahlt: zuteilungMon * sparrate + sim.zinsen + sim.getilgt,
    gezahlteZinsen: sim.zinsen,
    gezahlteTilgung: zuteilungMon * sparrate + sim.getilgt,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: sim.restMonate,
    phaseLabel: 'Darlehensphase',
    bausparGuthaben: guthaben,
    zuteilungInMonaten: 0,
  };
}

function statusEigen(plan: EigenPlan, asOf: Date): PlanStatus {
  const K = plan.kreditsumme || 0;
  const elapsed = monthsBetweenISO(plan.startDatum, asOf);
  const specSum = sondertilgungenSumAt(plan, asOf);

  // Bei Phasen: aktuelle Phase finden
  let rate = plan.monatsrate || 0;
  let zinsAkt = 0;
  let tilgAkt = rate;
  let phaseLabel: string | undefined;
  let gezahltGesamt = 0;
  let gezahltZins = 0;
  let gezahltTilg = 0;

  if (plan.phasen && plan.phasen.length > 0) {
    const sorted = [...plan.phasen].sort((a, b) => a.vonMonat - b.vonMonat);
    // Aktuelle Phase
    const aktMon = elapsed + 1; // 1-basiert
    const aktPh = sorted.find(p => aktMon >= p.vonMonat && aktMon <= p.bisMonat);
    if (aktPh) {
      rate = aktPh.monatsrate;
      zinsAkt = aktPh.zinsanteil ?? 0;
      tilgAkt = aktPh.tilgungAnteil ?? (rate - zinsAkt);
      phaseLabel = aktPh.name;
    }
    // Summen aufaddieren
    for (const ph of sorted) {
      const bis = Math.min(ph.bisMonat, elapsed);
      const von = ph.vonMonat;
      if (bis < von) continue;
      const mons = bis - von + 1;
      gezahltGesamt += mons * ph.monatsrate;
      gezahltZins += mons * (ph.zinsanteil ?? 0);
      gezahltTilg += mons * (ph.tilgungAnteil ?? ph.monatsrate);
    }
  } else {
    gezahltGesamt = elapsed * rate;
    gezahltZins = 0;
    gezahltTilg = elapsed * rate;
  }

  const n = plan.laufzeitMonate || 0;
  const rest = K > 0 ? Math.max(0, K - gezahltTilg - specSum) : Math.max(0, (K || 0) - gezahltTilg);
  return {
    typ: 'eigen',
    monatsrate: rate,
    zinsanteilAktuell: zinsAkt,
    tilgungAnteilAktuell: tilgAkt,
    restschuld: rest,
    bereitsGezahlt: gezahltGesamt + specSum,
    gezahlteZinsen: gezahltZins,
    gezahlteTilgung: gezahltTilg + specSum,
    sondertilgungenSumme: specSum,
    monateGezahlt: elapsed,
    restlaufzeitMonate: n ? Math.max(0, n - elapsed) : 0,
    phaseLabel,
  };
}

export function planStatus(plan: KreditPlan, asOf: Date = new Date()): PlanStatus {
  switch (plan.typ) {
    case 'annuitaet':      return statusAnnuitaet(plan, asOf);
    case 'bausparen':      return statusBausparen(plan, asOf);
    case 'vorausdarlehen': return statusVorausdarlehen(plan, asOf);
    case 'endfaellig':     return statusEndfaellig(plan, asOf);
    case 'tilgung':        return statusTilgung(plan, asOf);
    case 'kfw':            return statusKfw(plan, asOf);
    case 'variabel':       return statusVariabel(plan, asOf);
    case 'eigen':          return statusEigen(plan, asOf);
  }
}

// Tilgungsplan-Stützpunkte (jährlich) für einen einzelnen Plan — fürs Chart.
export function planAmortSchedule(plan: KreditPlan): AmortPoint[] {
  const pts: AmortPoint[] = [{ monthIndex: 0, jahr: 0, restschuld: 0, getilgtKumuliert: 0 }];
  const start = parseISO(plan.startDatum);
  if (!start) return pts;
  // Wir berechnen monatlich bis ~30 Jahre oder bis Restschuld 0
  const maxMonths = 30 * 12;
  let lastRest = 0;
  for (let k = 0; k <= maxMonths; k += 12) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + k);
    const st = planStatus(plan, d);
    if (k === 0) {
      // Startschuld
      const K0 = (plan as any).kreditsumme || (plan.typ === 'bausparen' ? plan.bausparsumme : 0);
      pts[0] = { monthIndex: 0, jahr: 0, restschuld: K0, getilgtKumuliert: 0 };
      lastRest = K0;
    } else {
      pts.push({ monthIndex: k, jahr: k / 12, restschuld: st.restschuld, getilgtKumuliert: st.gezahlteTilgung });
      if (st.restschuld <= 0 && lastRest > 0) break;
      lastRest = st.restschuld;
    }
  }
  return pts;
}

// ── Immobilie: Aggregation über alle Kreditpläne ─────────────────────────────

export interface PropertyTotals {
  monatsrateGesamt: number;       // Summe Monatsraten aller Pläne
  restschuldGesamt: number;
  bereitsGezahltGesamt: number;
  gezahlteZinsenGesamt: number;
  gezahlteTilgungGesamt: number;
  sondertilgungenGesamt: number;
  kreditsummeGesamt: number;      // ursprüngliche Gesamt-Kreditsumme
  // Vermietung
  mietCashflow: number;
  bruttoRendite: number;
}

function planKreditsumme(plan: KreditPlan): number {
  switch (plan.typ) {
    case 'bausparen': return plan.bausparsumme || 0;
    case 'eigen': return plan.kreditsumme || 0;
    default: return (plan as any).kreditsumme || 0;
  }
}

export function propertyTotals(p: Immobilie, asOf: Date = new Date()): PropertyTotals {
  const plans = p.kreditplaene ?? [];
  let monRate = 0, rest = 0, gez = 0, zins = 0, tilg = 0, spec = 0, K = 0;
  for (const pl of plans) {
    const st = planStatus(pl, asOf);
    monRate += st.monatsrate;
    rest += st.restschuld;
    gez += st.bereitsGezahlt;
    zins += st.gezahlteZinsen;
    tilg += st.gezahlteTilgung;
    spec += st.sondertilgungenSumme;
    K += planKreditsumme(pl);
  }
  // Aktuelle Mietperiode (kann null sein bei Leerstand oder vor erster Periode)
  const aktPer = currentMietperiode(p, asOf);
  const kalt = aktPer ? aktPer.kaltmiete : 0;
  const umlage = aktPer ? aktPer.nebenkostenumlage : 0;
  // Laufende Vermieter-Ausgaben (immer)
  const hausgeld = p.hausgeldMonatlich || 0;
  const lebensvers = p.lebensversicherungMonatlich || 0;
  const grundbesitzMonatlich = (p.grundbesitzabgabenJaehrlich || 0) / 12;
  return {
    monatsrateGesamt: monRate,
    restschuldGesamt: rest,
    bereitsGezahltGesamt: gez,
    gezahlteZinsenGesamt: zins,
    gezahlteTilgungGesamt: tilg,
    sondertilgungenGesamt: spec,
    kreditsummeGesamt: K,
    mietCashflow: kalt + umlage - hausgeld - lebensvers - grundbesitzMonatlich - monRate,
    bruttoRendite: K > 0 ? (kalt * 12) / K : 0,
  };
}

// ── Mietperioden ─────────────────────────────────────────────────────────────

// Sortierte Liste der Mietperioden (älteste zuerst).
function mietperiodenSorted(p: Immobilie): Mietperiode[] {
  const arr = p.mietperioden ?? [];
  return [...arr].sort((a, b) => compareISO(a.vonDatum, b.vonDatum));
}

// Aktuelle Periode = die mit spätestem vonDatum ≤ asOf. Null falls keine.
export function currentMietperiode(p: Immobilie, asOf: Date = new Date()): Mietperiode | null {
  const arr = mietperiodenSorted(p);
  if (arr.length === 0) return null;
  const refISO = asOf.toISOString().slice(0, 10);
  let pick: Mietperiode | null = null;
  for (const per of arr) {
    if (compareISO(per.vonDatum, refISO) <= 0) pick = per;
    else break;
  }
  return pick;
}

// Eine Periode gilt als Leerstand wenn keine Mieteinnahmen
export function istLeerstandPeriode(per: Mietperiode | null | undefined): boolean {
  if (!per) return true;
  return (per.kaltmiete || 0) === 0 && (per.nebenkostenumlage || 0) === 0;
}

// ── Historische Cashflow-Übersicht pro Jahr ──────────────────────────────────

export interface JahresCashflow {
  jahr: number;
  einnahmenMiete: number;          // Kalt + Umlage über das Jahr (anteilig nach Perioden + Vermietungszeitraum)
  ausgabenHausgeld: number;
  ausgabenKreditrate: number;      // Summe aller Plan-Raten × Monate
  einnahmenSonder: number;         // Sonderbuchungen Einnahmen in diesem Jahr
  ausgabenSonder: number;          // Sonderbuchungen Ausgaben in diesem Jahr
  cashflow: number;
  monateVermietet: number;         // 0–12
  monateEigennutzung: number;      // 0–12
}

function planRateAtMonth(plan: KreditPlan, monthAsOf: Date): number {
  return planStatus(plan, monthAsOf).monatsrate;
}

function periodeForISO(p: Immobilie, iso: string): Mietperiode | null {
  const arr = mietperiodenSorted(p);
  let pick: Mietperiode | null = null;
  for (const per of arr) {
    if (compareISO(per.vonDatum, iso) <= 0) pick = per;
    else break;
  }
  return pick;
}

// Liefert für jedes Jahr von Kaufdatum (oder ältestem Plan-Start) bis aktuelles
// Jahr einen Cashflow-Eintrag.
export function jahresCashflowSerie(p: Immobilie, bisJahr?: number): JahresCashflow[] {
  // Startjahr: kaufDatum > ältester Plan-Start > älteste Periode > heute
  const candidates: string[] = [];
  if (p.kaufDatum) candidates.push(p.kaufDatum);
  for (const pl of (p.kreditplaene ?? [])) if (pl.startDatum) candidates.push(pl.startDatum);
  for (const per of (p.mietperioden ?? [])) if (per.vonDatum) candidates.push(per.vonDatum);
  if (candidates.length === 0) return [];
  candidates.sort(compareISO);
  const startJahr = parseInt(candidates[0].slice(0, 4), 10);
  const endJahr = bisJahr ?? new Date().getFullYear();
  if (endJahr < startJahr) return [];

  const hausgeldM = p.hausgeldMonatlich || 0;
  const lebensversM = p.lebensversicherungMonatlich || 0;
  const grundbesitzM = (p.grundbesitzabgabenJaehrlich || 0) / 12;

  const out: JahresCashflow[] = [];
  for (let y = startJahr; y <= endJahr; y++) {
    let miete = 0, hausgeld = 0, krRate = 0, sondEin = 0, sondAus = 0, mVer = 0, mEig = 0;
    for (let m = 1; m <= 12; m++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-15`;
      const refDate = new Date(iso + 'T00:00:00');
      // Vor Kauf: gar nicht zählen
      if (p.kaufDatum && compareISO(iso, p.kaufDatum) < 0) continue;
      // Kreditraten (laufen immer)
      for (const pl of (p.kreditplaene ?? [])) {
        if (compareISO(iso, pl.startDatum) < 0) continue;
        krRate += planRateAtMonth(pl, refDate);
      }
      // Laufende Vermieter-Ausgaben (immer)
      hausgeld += hausgeldM + lebensversM + grundbesitzM;
      // Mietperiode prüfen
      const per = periodeForISO(p, iso);
      if (per && (per.kaltmiete > 0 || per.nebenkostenumlage > 0)) {
        miete += per.kaltmiete + per.nebenkostenumlage;
        mVer += 1;
      } else {
        // Keine Periode oder 0-Periode (Leerstand)
        mEig += 1;
      }
    }
    // Sonderbuchungen in diesem Jahr
    for (const s of (p.sonderbuchungen ?? [])) {
      const sj = parseInt(s.datum.slice(0, 4), 10);
      if (sj === y) {
        if (s.typ === 'einnahme') sondEin += s.betrag;
        else sondAus += s.betrag;
      }
    }
    out.push({
      jahr: y,
      einnahmenMiete: miete,
      ausgabenHausgeld: hausgeld,
      ausgabenKreditrate: krRate,
      einnahmenSonder: sondEin,
      ausgabenSonder: sondAus,
      cashflow: miete + sondEin - hausgeld - krRate - sondAus,
      monateVermietet: mVer,
      monateEigennutzung: mEig,
    });
  }
  return out;
}

// Saldo der Sonderbuchungen über alle Jahre (für Anzeige im Detail)
export function sonderbuchungSaldoProJahr(p: Immobilie): Record<number, number> {
  const out: Record<number, number> = {};
  for (const s of (p.sonderbuchungen ?? [])) {
    const y = parseInt(s.datum.slice(0, 4), 10);
    const sign = s.typ === 'einnahme' ? 1 : -1;
    out[y] = (out[y] || 0) + sign * s.betrag;
  }
  return out;
}

// Steuerlich absetzbare Sonderbuchungen pro Jahr (Saldo: Einnahmen − Ausgaben)
export function steuerSaldoProJahr(p: Immobilie): Record<number, number> {
  const out: Record<number, number> = {};
  for (const s of (p.sonderbuchungen ?? [])) {
    if (!s.steuerlichAbsetzbar) continue;
    const y = parseInt(s.datum.slice(0, 4), 10);
    const sign = s.typ === 'einnahme' ? 1 : -1;
    out[y] = (out[y] || 0) + sign * s.betrag;
  }
  return out;
}

export const SB_KATEGORIE_LABEL: Record<string, string> = {
  hausgeldNachzahlung: 'Hausgeld-Nachzahlung',
  hausgeldErstattung: 'Hausgeld-Erstattung',
  nebenkostenMieterNach: 'NK-Nachzahlung Mieter',
  nebenkostenMieterErst: 'NK-Erstattung Mieter',
  reparatur: 'Reparatur',
  renovierung: 'Renovierung',
  anwalt: 'Anwalt / Rechtskosten',
  sonstigeEinnahme: 'Sonstige Einnahme',
  sonstigeAusgabe: 'Sonstige Ausgabe',
};

// Finanzierungsstruktur (rein informativ)
export interface FinanzierungsStruktur {
  kaufpreis: number;
  kaufnebenkosten: number;
  eigenkapital: number;
  finanzierungsbedarf: number;     // kaufpreis + kaufnebenkosten - eigenkapital
  kreditsummeGesamt: number;
  differenz: number;               // kreditsummeGesamt - finanzierungsbedarf (positiv = Überfinanzierung)
}

export function finanzierungsStruktur(p: Immobilie): FinanzierungsStruktur {
  const kp = p.kaufpreis || 0;
  const nk = p.kaufnebenkosten || 0;
  const ek = p.eigenkapital || 0;
  const need = kp + nk - ek;
  let K = 0;
  for (const pl of (p.kreditplaene ?? [])) K += planKreditsumme(pl);
  return {
    kaufpreis: kp,
    kaufnebenkosten: nk,
    eigenkapital: ek,
    finanzierungsbedarf: need,
    kreditsummeGesamt: K,
    differenz: K - need,
  };
}

// ── Steuer-Jahresansicht ─────────────────────────────────────────────────────
// Liefert alle steuerlich relevanten Posten für ein Jahr & Bereich:
// - direkte SteuerPosten
// - + abgeleitete Posten aus steuerrelevanten Verträgen (pro Monat, wenn vertrag im
//   jeweiligen Monatssnapshot existiert; jährliche Verträge nur im Zahlmonat)

export interface SteuerJahresEintrag {
  id: string;
  datum: string;                // YYYY-MM-DD
  kategorie: string;            // key
  kategorieLabel: string;
  beschreibung: string;
  betrag: number;
  fotoUri?: string;
  notiz?: string;
  isContract: boolean;          // true wenn aus Vertrag abgeleitet
  contractId?: string;
  contractMonthKey?: string;    // 'YYYY-MM' für den Monat dieses Vertragsposten
}

export function steuerJahresansicht(
  data: FinanzData,
  jahr: number,
  bereich: SteuerBereich,
): SteuerJahresEintrag[] {
  const out: SteuerJahresEintrag[] = [];

  // Direkte Steuerposten
  for (const sp of (data.steuerposten ?? [])) {
    if (sp.bereich !== bereich) continue;
    const bj = sp.bezugsjahr ?? parseInt(sp.datum.slice(0, 4), 10);
    if (bj !== jahr) continue;
    out.push({
      id: sp.id,
      datum: sp.datum,
      kategorie: sp.kategorie,
      kategorieLabel: steuerKategorieLabel(bereich, sp.kategorie),
      beschreibung: sp.beschreibung,
      betrag: sp.betrag,
      fotoUri: sp.fotoUri,
      notiz: sp.notiz,
      isContract: false,
    });
  }

  // Abgeleitete Posten aus Verträgen — pro Monat in dem der Vertrag in
  // diesem Jahr existiert
  for (let m = 1; m <= 12; m++) {
    const mk = `${jahr}-${String(m).padStart(2, '0')}`;
    const snap = data.months[mk];
    if (!snap) continue;
    for (const v of snap.contracts) {
      if (!v.steuerRelevant || v.steuerBereich !== bereich) continue;
      const amount = contractMonthAmount(v, mk);
      if (amount <= 0) continue;
      const kat = v.steuerKategorie || 'sonstiges';
      out.push({
        id: `${v.id}__${mk}`,
        datum: `${mk}-01`,
        kategorie: kat,
        kategorieLabel: steuerKategorieLabel(bereich, kat),
        beschreibung: v.name + (v.interval === 'yearly' ? ' (Jahresbeitrag)' : ''),
        betrag: amount,
        isContract: true,
        contractId: v.id,
        contractMonthKey: mk,
      });
    }
  }

  // Sortieren: neueste zuerst
  out.sort((a, b) => a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0);
  return out;
}

// Summen je Bereich & Jahr
export function steuerSumme(data: FinanzData, jahr: number, bereich: SteuerBereich): { anzahl: number; summe: number } {
  const list = steuerJahresansicht(data, jahr, bereich);
  return { anzahl: list.length, summe: list.reduce((a, e) => a + e.betrag, 0) };
}

// Verfügbare Jahre über alle Steuerposten + Verträge (für Filter)
export function steuerVerfuegbareJahre(data: FinanzData): number[] {
  const set = new Set<number>();
  for (const sp of (data.steuerposten ?? [])) {
    set.add(sp.bezugsjahr ?? parseInt(sp.datum.slice(0, 4), 10));
  }
  // Aus Vertragsmonaten Jahre extrahieren
  let hasVertragRelevant = false;
  for (const mk of Object.keys(data.months)) {
    const snap = data.months[mk];
    for (const v of snap.contracts) {
      if (v.steuerRelevant) { hasVertragRelevant = true; break; }
    }
    if (hasVertragRelevant) {
      set.add(parseInt(mk.slice(0, 4), 10));
    }
  }
  // Aktuelles Jahr sicher dazu
  set.add(new Date().getFullYear());
  return Array.from(set).sort((a, b) => b - a);
}


// ── Konten / Vermögen ────────────────────────────────────────────────────────

// Liefert den Stand eines Kontos für einen bestimmten Monat. Falls in dem Monat
// kein Wert eingetragen ist, wird der letzte bekannte Wert davor genommen.
export function kontoStandFor(data: FinanzData, kontoId: string, monthKey: string): number {
  const list = (data.kontoStaende ?? [])
    .filter(s => s.kontoId === kontoId && compareMonthKey(s.monthKey, monthKey) <= 0)
    .sort((a, b) => compareMonthKey(b.monthKey, a.monthKey));
  return list[0]?.betrag ?? 0;
}

// Hat das Konto im genannten Monat einen direkt eingetragenen Stand?
export function kontoStandExact(data: FinanzData, kontoId: string, monthKey: string): KontoStand | null {
  return (data.kontoStaende ?? []).find(s => s.kontoId === kontoId && s.monthKey === monthKey) ?? null;
}

// Gesamt-Vermögen für einen Monat = Summe aller Konto-Stände (mit Fallback auf vorherige Werte)
export function vermoegenFor(data: FinanzData, monthKey: string): { gesamt: number; details: { konto: Konto; stand: number; isFallback: boolean }[] } {
  const konten = (data.konten ?? []).filter(k => !k.archiviert);
  let gesamt = 0;
  const details = konten.map(k => {
    const ex = kontoStandExact(data, k.id, monthKey);
    const stand = ex ? ex.betrag : kontoStandFor(data, k.id, monthKey);
    gesamt += stand;
    return { konto: k, stand, isFallback: !ex };
  });
  return { gesamt, details };
}

// Vermögens-Trend: Serie über die letzten N Monate
export function vermoegenSerie(data: FinanzData, endMonthKey: string, count: number): { monthKey: string; gesamt: number }[] {
  const out: { monthKey: string; gesamt: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const mk = addMonthsKey(endMonthKey, -i);
    out.push({ monthKey: mk, gesamt: vermoegenFor(data, mk).gesamt });
  }
  return out;
}

