// Finanzflow — Domänen-Datenmodell
// Monats-Schnappschuss-basiert. Keine Einzelbuchungen mit Datum (außer Bargeld-
// Einträge, die aber nur als Monatssumme ins Dashboard fließen — kein Kassenstand).

export const SCHEMA_VERSION = 2;

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

// ── Steuer (private Steuererklärung) ─────────────────────────────────────────

export type SteuerBereich = 'nicht_selbst' | 'selbst';

export interface SteuerPosten {
  id: string;
  datum: string;                // YYYY-MM-DD (Zahlungsdatum)
  bezugsjahr?: number;          // für welche Steuererklärung (i.d.R. = Jahr aus datum)
  bereich: SteuerBereich;
  kategorie: string;            // key aus STEUER_KATEGORIEN_* oder eigener Text bei 'sonstiges'
  betrag: number;               // positiv €
  beschreibung: string;         // z. B. "Abendessen Team-Meeting"
  fotoUri?: string;             // lokaler App-Pfad zum Beleg-Foto
  notiz?: string;
}

export const STEUER_KATEGORIEN_NICHT_SELBST: { key: string; label: string }[] = [
  { key: 'fahrtkosten',     label: 'Fahrtkosten zur Arbeit' },
  { key: 'arbeitsmittel',   label: 'Arbeitsmittel' },
  { key: 'fortbildung',     label: 'Fortbildung & Seminare' },
  { key: 'bewerbung',       label: 'Bewerbungskosten' },
  { key: 'bewirtung',       label: 'Bewirtungskosten' },
  { key: 'arbeitszimmer',   label: 'Häusliches Arbeitszimmer' },
  { key: 'reisekosten',     label: 'Reisekosten (Dienstreisen)' },
  { key: 'berufsverband',   label: 'Berufsverbände / Gewerkschaft' },
  { key: 'sonstiges',       label: 'Sonstiges' },
];

export const STEUER_KATEGORIEN_SELBST: { key: string; label: string }[] = [
  { key: 'bewirtung',       label: 'Bewirtungskosten' },
  { key: 'bueromaterial',   label: 'Bürobedarf' },
  { key: 'kfz',             label: 'Kfz / Fahrzeug' },
  { key: 'reisekosten',     label: 'Reisekosten' },
  { key: 'telekom',         label: 'Telefon / Internet' },
  { key: 'software',        label: 'Software / Lizenzen' },
  { key: 'werbung',         label: 'Werbung / Marketing' },
  { key: 'beratung',        label: 'Steuerberater / Anwalt' },
  { key: 'versicherung',    label: 'Versicherungen (betrieblich)' },
  { key: 'sonstiges',       label: 'Sonstige Betriebsausgaben' },
];

export const STEUER_BEREICH_LABEL: Record<SteuerBereich, string> = {
  nicht_selbst: 'Nichtselbstständige Arbeit (Anlage N)',
  selbst: 'Selbstständige Arbeit / Gewerbe (EÜR)',
};

export const STEUER_BEREICH_KURZ: Record<SteuerBereich, string> = {
  nicht_selbst: 'Nichtselbstständig',
  selbst: 'Selbstständig',
};

export function steuerKategorieLabel(bereich: SteuerBereich, key: string): string {
  const list = bereich === 'nicht_selbst' ? STEUER_KATEGORIEN_NICHT_SELBST : STEUER_KATEGORIEN_SELBST;
  return list.find(c => c.key === key)?.label ?? key;
}

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
  // Steuer-Markierung: wenn aktiv, erscheint dieser Vertrag automatisch
  // in der entsprechenden Steuer-Liste
  steuerRelevant?: boolean;
  steuerBereich?: SteuerBereich;
  steuerKategorie?: string;       // key aus STEUER_KATEGORIEN_*
}

// Veraltet: Wir nutzen jetzt Posten[] für invest mit recurring-Flag (wie income).
// Type-Alias bleibt für Backward-Kompat in alten Imports.
export type InvestPlan = Posten;

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
  income: Posten[];             // Einnahmen — recurring=true wird übertragen, false bleibt im Monat
  contracts: Vertrag[];         // Fixkosten/Verträge — wird übertragen
  invest: Posten[];             // Invest/Sparen — recurring=true wird übertragen, false bleibt im Monat
  variableExpenses: Posten[];   // startet leer pro Monat
  cash: CashEntry[];            // startet leer pro Monat
  // Veraltet (Schema v1) — leer in neuen Daten, Migration verschiebt nach income/invest
  variableIncome?: Posten[];
  spontanInvest?: Posten[];
}

// ── Immobilien (komplett separat, fließt NICHT ins Dashboard) ────────────────

// Sondertilgung = einmalige Tilgungszahlung außerhalb der Rate
export interface Sondertilgung {
  id: string;
  datum: string;      // YYYY-MM-DD
  betrag: number;     // €
  notiz?: string;
}

// Eigene Phase (für 'eigen'-Plan): in Monat X bis Y gilt diese Rate
export interface EigenPhase {
  id: string;
  name: string;
  vonMonat: number;       // 1-basiert, ab startDatum
  bisMonat: number;
  monatsrate: number;
  zinsanteil?: number;
  tilgungAnteil?: number;
}

export type KreditPlanTyp =
  | 'annuitaet'        // Klassisches Annuitätendarlehen
  | 'bausparen'        // Bausparvertrag (Anspar + Darlehensphase)
  | 'vorausdarlehen'   // Vorausdarlehen (tilgungsfrei, oft mit BSV)
  | 'endfaellig'       // Endfälliges Darlehen
  | 'tilgung'          // Festes Tilgungsdarlehen (€/Monat)
  | 'kfw'              // KfW mit tilgungsfreien Anlaufjahren
  | 'variabel'         // Variables Darlehen
  | 'eigen';           // Eigener Vertrag (frei definierbar)

interface PlanBase {
  id: string;
  name: string;
  startDatum: string;                   // YYYY-MM-DD ('' = leer)
  zinsbindungBis?: string;              // YYYY-MM-DD — nach Ablauf neu verhandeln
  sondertilgungProzentMax?: number;     // z. B. 5 = 5%/Jahr erlaubt
  sondertilgungen?: Sondertilgung[];
  verknuepftMit?: string;               // Plan-ID (für Kombi-Verträge BHW etc.)
  notiz?: string;
}

export interface AnnuitaetPlan extends PlanBase {
  typ: 'annuitaet';
  kreditsumme: number;
  sollzinsProzent: number;
  // Eines der drei reicht — die anderen werden berechnet:
  tilgungsProzent?: number;
  laufzeitMonate?: number;
  monatsrate?: number;                  // direkt in € (NEU)
  tilgungsfreieMonate?: number;         // NEU: tilgungsfreie Anlaufzeit
  zinsbindungBisJahr?: number;          // (alt, optional — neu: zinsbindungBis als ISO-Datum)
}

export interface BausparenPlan extends PlanBase {
  typ: 'bausparen';
  bausparsumme: number;                 // Zielsumme
  sparrate: number;                     // €/Monat in Ansparphase
  guthabenAktuell: number;              // bereits angespart
  guthabenzinsProzent: number;          // p. a. auf Guthaben
  mindestguthabenProzent: number;       // typisch 40–50
  abschlussgebuehr?: number;
  // Darlehensphase (nach Zuteilung) — Tilgung entweder als % p. a. ODER als € pro Monat:
  darlehenZinsProzent: number;
  darlehenTilgungsProzent?: number;     // p. a.
  darlehenTilgungEuroMonatlich?: number; // alternativ direkte €-Rate
}

export interface VorausdarlehenPlan extends PlanBase {
  typ: 'vorausdarlehen';
  kreditsumme: number;
  sollzinsProzent: number;
  laufzeitMonate: number;               // bis BSV zuteilungsreif
  // NEU: parallele Sparrate (z. B. BHW Bausparrate die später das
  // Vorausdarlehen ablöst). Wird als Tilgung im Cashflow gezählt.
  paralleleSparrate?: number;           // €/Monat
}

export interface EndfaelligPlan extends PlanBase {
  typ: 'endfaellig';
  kreditsumme: number;
  sollzinsProzent: number;
  laufzeitMonate: number;
  tilgungsersatzMonatlich?: number;     // separates Sparen für Endfälligkeit
}

export interface TilgungPlan extends PlanBase {
  typ: 'tilgung';
  kreditsumme: number;
  sollzinsProzent: number;
  tilgungEuroMonatlich: number;         // fester €-Betrag
}

export interface KfwPlan extends PlanBase {
  typ: 'kfw';
  kreditsumme: number;
  sollzinsProzent: number;
  laufzeitMonate: number;
  tilgungsfreieAnlaufJahre: number;     // z. B. 1–5
}

export interface VariabelPlan extends PlanBase {
  typ: 'variabel';
  kreditsumme: number;
  aktuellerZinsProzent: number;
  tilgungsProzent: number;
  zinsAnpassungMonate: number;          // z. B. 3 = vierteljährlich
}

export interface EigenPlan extends PlanBase {
  typ: 'eigen';
  kreditsumme?: number;
  monatsrate?: number;
  laufzeitMonate?: number;
  phasen?: EigenPhase[];                // optional: dynamische Raten
}

export type KreditPlan =
  | AnnuitaetPlan | BausparenPlan | VorausdarlehenPlan | EndfaelligPlan
  | TilgungPlan | KfwPlan | VariabelPlan | EigenPlan;

// Vermietungsperiode (z. B. ab Mieterhöhung neue Werte). Beträge gelten
// monatlich. Die "aktuelle" Periode ist die mit dem spätesten vonDatum
// ≤ heute. Vor der ersten Periode = keine Vermietung (Eigennutzung).
export interface Mietperiode {
  id: string;
  vonDatum: string;                // YYYY-MM-DD
  kaltmiete: number;               // Einnahme: reine Miete (0 = Leerstand)
  nebenkostenumlage: number;       // Einnahme: was Mieter zusätzlich zahlt (0 = Leerstand)
  notiz?: string;
  hausgeld?: number;               // veraltet — nur für Migration, wird in Immobilie verschoben
}

// Sonderbuchung = einmalige Ein-/Ausgabe für die Immobilie
// (Nebenkostenabrechnung, Reparatur, Anwalt, Renovierung …).
export type SonderbuchungKategorie =
  | 'hausgeldNachzahlung'         // Ausgabe an WEG
  | 'hausgeldErstattung'          // Einnahme von WEG
  | 'nebenkostenMieterNach'       // Einnahme von Mieter
  | 'nebenkostenMieterErst'       // Ausgabe an Mieter
  | 'reparatur'                   // Ausgabe
  | 'renovierung'                 // Ausgabe
  | 'anwalt'                      // Ausgabe
  | 'sonstigeEinnahme'
  | 'sonstigeAusgabe';

export interface Sonderbuchung {
  id: string;
  datum: string;                  // YYYY-MM-DD (Zahlungsdatum)
  bezugsjahr?: number;            // optional: für welches Jahr (z. B. Abrechnung 2023)
  typ: 'einnahme' | 'ausgabe';
  kategorie: SonderbuchungKategorie;
  betrag: number;                 // immer positiv
  notiz?: string;
  steuerlichAbsetzbar?: boolean;  // Werbungskosten für Steuererklärung
  fotoUri?: string;               // lokaler App-Pfad zum Beleg-Foto (Phase 2)
}

export interface Immobilie {
  id: string;
  name: string;
  // Kreditpläne (BSV, Vorausdarlehen, KfW etc.)
  kreditplaene?: KreditPlan[];
  // Kauf & Finanzierungsstruktur (rein informativ)
  kaufpreis?: number;
  kaufnebenkosten?: number;
  eigenkapital?: number;
  kaufDatum?: string;              // YYYY-MM-DD — Startgrenze der historischen Übersicht
  // Laufende Vermieter-Kosten (fallen auch in Leerstand-Monaten an)
  hausgeldMonatlich?: number;          // € — WEG/Hausverwaltung
  grundbesitzabgabenJaehrlich?: number; // € — Grundsteuer, Müll etc.
  lebensversicherungMonatlich?: number; // € — Versicherung zur Finanzierung
  // Vermietung — erste Mietperiode = Vermietungsstart
  mietperioden?: Mietperiode[];    // sortiert nach vonDatum aufsteigend
  vermietetSeit?: string;          // veraltet — nicht mehr genutzt, bleibt für Migration
  // Sonderbuchungen (Nebenkostenabrechnung, Reparatur …)
  sonderbuchungen?: Sonderbuchung[];
  // ── ALTE Felder (Backward-Kompatibilität, werden migriert)
  kreditsumme?: number;
  sollzinsProzent?: number;
  laufzeitMonate?: number;
  kreditStart?: string;
  kaltmiete: number;
  warmmiete: number;
  nebenkosten: number;
  note?: string;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface FinanzSettings {
  dark: boolean;
  accent: string;
  userName: string;
  userEmail: string;
  cashShortcutMode?: 'bar' | 'bank';   // letzter Modus des Schnellknopfs
  appLockEnabled?: boolean;             // App mit Face ID / PIN schützen
}

export const DEFAULT_SETTINGS: FinanzSettings = {
  dark: true,
  accent: '#B8F12C',
  userName: 'Mein Haushalt',
  userEmail: '',
  cashShortcutMode: 'bar',
  appLockEnabled: false,
};

// ── Konten / Vermögen ────────────────────────────────────────────────────────
// Konto = Sammelstelle für Vermögen (Girokonto, Tagesgeld, Depot, Krypto ...).
// Stand wird pro Monat manuell eingetragen.

export type KontoTyp =
  | 'giro' | 'tagesgeld' | 'bausparen' | 'depot' | 'krypto' | 'bargeld' | 'sonstiges';

export const KONTO_TYP_LABEL: Record<KontoTyp, string> = {
  giro: 'Girokonto',
  tagesgeld: 'Tagesgeld / Sparbuch',
  bausparen: 'Bausparguthaben',
  depot: 'Depot (ETF / Aktien)',
  krypto: 'Krypto',
  bargeld: 'Bargeld',
  sonstiges: 'Sonstiges',
};

export const KONTO_TYP_ICON: Record<KontoTyp, string> = {
  giro: 'wallet',
  tagesgeld: 'coin',
  bausparen: 'home',
  depot: 'trend',
  krypto: 'star',
  bargeld: 'coin',
  sonstiges: 'note',
};

export interface Konto {
  id: string;
  name: string;                    // z. B. "Sparkasse Giro"
  typ: KontoTyp;
  farbe?: string;                  // optional, sonst aus typ abgeleitet
  notiz?: string;
  archiviert?: boolean;            // nicht mehr aktiv, aber alte Stände behalten
}

export interface KontoStand {
  id: string;
  kontoId: string;
  monthKey: string;                // 'YYYY-MM'
  betrag: number;                  // Stand am Monatsende
  notiz?: string;
}

// ── Wurzel-Datencontainer ────────────────────────────────────────────────────

export interface FinanzData {
  schemaVersion: number;
  months: Record<string, MonthSnapshot>;   // key = 'YYYY-MM'
  properties: Immobilie[];
  steuerposten?: SteuerPosten[];           // private Steuererklärung (eigene Belege)
  konten?: Konto[];                        // Konten/Vermögensquellen
  kontoStaende?: KontoStand[];             // Monats-Stände
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
      { id: newId('inv'), name: 'Sparplan', category: 'sonstiges', amount: 0, recurring: true },
    ],
    variableExpenses: [],
    cash: [],
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
