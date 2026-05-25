// Unit-Tests für die Kernberechnungen (Kredit, Steuer, Mieten, Vermögen).
// Diese Logik ist mathematisch komplex und sollte sich nicht "still" ändern.

import {
  computeMetrics, propertyTotals, planStatus, finanzierungsStruktur,
  currentMietperiode, istLeerstandPeriode, steuerJahresansicht,
  vermoegenFor, kontoStandFor,
  jahresCashflowSerie,
} from '../calc';
import {
  FinanzData, MonthSnapshot, Immobilie, KreditPlan, AnnuitaetPlan, BausparenPlan,
  Mietperiode, Sonderbuchung, SteuerPosten, Konto, KontoStand, Posten, Vertrag,
} from '../model';

// ── Helper ───────────────────────────────────────────────────────────────────

const emptySnap = (mk: string): MonthSnapshot => ({
  monthKey: mk,
  income: [],
  contracts: [],
  invest: [],
  variableExpenses: [],
  cash: [],
});

const baseProperty = (overrides: Partial<Immobilie> = {}): Immobilie => ({
  id: 'p1',
  name: 'Test',
  kaltmiete: 0, warmmiete: 0, nebenkosten: 0,
  ...overrides,
});

const emptyData = (): FinanzData => ({
  schemaVersion: 2,
  months: {},
  properties: [],
  steuerposten: [],
  konten: [],
  kontoStaende: [],
  settings: { dark: true, accent: '#000', userName: '', userEmail: '' },
});

// ─────────────────────────────────────────────────────────────────────────────
describe('computeMetrics', () => {
  it('rechnet leeren Snapshot zu 0', () => {
    const m = computeMetrics(emptySnap('2026-05'));
    expect(m.einnahmen).toBe(0);
    expect(m.ueberschuss).toBe(0);
    expect(m.sparquote).toBe(0);
  });

  it('summiert Einnahmen, Fixkosten und variable Kosten korrekt', () => {
    const snap: MonthSnapshot = {
      monthKey: '2026-05',
      income: [
        { id: 'i1', name: 'Gehalt', category: 'gehalt', amount: 3000, recurring: true },
        { id: 'i2', name: 'Bonus', category: 'sonstiges', amount: 500, recurring: false },
      ],
      contracts: [
        { id: 'c1', name: 'Miete', category: 'wohnen', amount: 1000, interval: 'monthly' },
        { id: 'c2', name: 'Versicherung', category: 'versicherung', amount: 1200, interval: 'yearly', paymentMonth: 5 },
      ],
      invest: [{ id: 'inv1', name: 'ETF', category: 'sonstiges', amount: 500, recurring: true }],
      variableExpenses: [{ id: 've1', name: 'Lebensmittel', category: 'lebensmittel', amount: 300 }],
      cash: [
        { id: 'cash1', name: 'Trinkgeld', amount: 20, direction: 'in', ts: '2026-05-15T10:00:00Z' },
        { id: 'cash2', name: 'Eis', amount: 5, direction: 'out', ts: '2026-05-16T10:00:00Z' },
      ],
    };
    const m = computeMetrics(snap);
    expect(m.einnahmen).toBe(3000 + 500 + 20);
    expect(m.fixkosten).toBe(1000 + 1200);   // Versicherung im Zahlmonat 5
    expect(m.variableKosten).toBe(300 + 5);
    expect(m.invest).toBe(500);
    expect(m.ueberschuss).toBe(3520 - 2200 - 305);
    expect(m.sparquote).toBeCloseTo(500 / 3520, 4);
  });

  it('jährlicher Vertrag zählt nur im Zahlmonat', () => {
    const v: Vertrag = { id: 'c', name: 'Steuerberater', category: 'sonstiges', amount: 600, interval: 'yearly', paymentMonth: 3 };
    const snapMar: MonthSnapshot = { ...emptySnap('2026-03'), contracts: [v] };
    const snapApr: MonthSnapshot = { ...emptySnap('2026-04'), contracts: [v] };
    expect(computeMetrics(snapMar).fixkosten).toBe(600);
    expect(computeMetrics(snapApr).fixkosten).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('planStatus — Annuitätendarlehen', () => {
  it('berechnet Rate aus Kreditsumme + Zins + Laufzeit', () => {
    const plan: AnnuitaetPlan = {
      id: 'a1', typ: 'annuitaet', name: 'Test', startDatum: '2025-01-01',
      kreditsumme: 100_000, sollzinsProzent: 3, laufzeitMonate: 360,
    };
    const st = planStatus(plan, new Date('2025-01-01T00:00:00Z'));
    // ~421,60 € (klassische Annuitätenformel)
    expect(st.monatsrate).toBeGreaterThan(420);
    expect(st.monatsrate).toBeLessThan(425);
    expect(st.restschuld).toBe(100_000); // zu Start nichts getilgt
  });

  it('berücksichtigt tilgungsfreie Monate (nur Zins)', () => {
    const plan: AnnuitaetPlan = {
      id: 'a2', typ: 'annuitaet', name: 'BHW Baudarlehen', startDatum: '2025-01-01',
      kreditsumme: 65_000, sollzinsProzent: 0.84,
      tilgungsfreieMonate: 12, monatsrate: 256.78,
    };
    // 6 Monate nach Start: noch tilgungsfrei, nur Zinsen
    const st = planStatus(plan, new Date('2025-07-01T00:00:00Z'));
    // Zins = 65000 × 0,84% / 12 = 45,50 €
    expect(st.zinsanteilAktuell).toBeCloseTo(45.5, 1);
    expect(st.tilgungAnteilAktuell).toBe(0);
    expect(st.restschuld).toBe(65_000); // tilgungsfrei = nichts getilgt
    expect(st.phaseLabel).toMatch(/Tilgungsfreie/);
  });

  it('Sondertilgung reduziert Restschuld', () => {
    const plan: AnnuitaetPlan = {
      id: 'a3', typ: 'annuitaet', name: 'Test', startDatum: '2024-01-01',
      kreditsumme: 100_000, sollzinsProzent: 3, laufzeitMonate: 360,
      sondertilgungen: [{ id: 's1', datum: '2024-06-01', betrag: 10_000 }],
    };
    const without = planStatus(
      { ...plan, sondertilgungen: undefined },
      new Date('2025-01-01T00:00:00Z'),
    );
    const withSt = planStatus(plan, new Date('2025-01-01T00:00:00Z'));
    // Mit 10k Sondertilgung sollte die Restschuld deutlich kleiner sein
    expect(withSt.restschuld).toBeLessThan(without.restschuld - 9000);
    expect(withSt.sondertilgungenSumme).toBe(10_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('planStatus — Bausparvertrag', () => {
  it('Ansparphase: nur Sparrate, kein Darlehen', () => {
    const plan: BausparenPlan = {
      id: 'b1', typ: 'bausparen', name: 'BHW', startDatum: '2025-01-01',
      bausparsumme: 100_000, sparrate: 200,
      guthabenAktuell: 0, guthabenzinsProzent: 0.5,
      mindestguthabenProzent: 40,
      darlehenZinsProzent: 2.5, darlehenTilgungsProzent: 6,
    };
    const st = planStatus(plan, new Date('2025-06-01T00:00:00Z'));
    expect(st.monatsrate).toBe(200);
    expect(st.phaseLabel).toBe('Ansparphase');
    expect(st.bausparGuthaben).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('propertyTotals + finanzierungsStruktur', () => {
  it('summiert mehrere Kreditpläne korrekt', () => {
    const plans: KreditPlan[] = [
      { id: 'a', typ: 'vorausdarlehen', name: 'V', startDatum: '2025-01-01', kreditsumme: 135_000, sollzinsProzent: 0.55, laufzeitMonate: 120 },
      { id: 'b', typ: 'annuitaet', name: 'B', startDatum: '2025-01-01', kreditsumme: 65_000, sollzinsProzent: 0.84, monatsrate: 256.78 },
    ];
    const p = baseProperty({ kreditplaene: plans });
    const t = propertyTotals(p, new Date('2025-01-01T00:00:00Z'));
    // Voraus = 135000 × 0.55% / 12 = 61.875 + Baudarlehen 256.78 ≈ 318
    expect(t.monatsrateGesamt).toBeGreaterThan(315);
    expect(t.kreditsummeGesamt).toBe(200_000);
  });

  it('finanzierungsStruktur: Kaufpreis vs. Kredite', () => {
    const p = baseProperty({
      kaufpreis: 180_000, kaufnebenkosten: 11_000, eigenkapital: 0,
      kreditplaene: [
        { id: 'a', typ: 'annuitaet', name: 'X', startDatum: '2025-01-01', kreditsumme: 200_000, sollzinsProzent: 3, laufzeitMonate: 360 },
      ],
    });
    const f = finanzierungsStruktur(p);
    expect(f.finanzierungsbedarf).toBe(191_000);
    expect(f.kreditsummeGesamt).toBe(200_000);
    expect(f.differenz).toBe(9_000); // Überfinanzierung
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Mietperioden', () => {
  const perioden: Mietperiode[] = [
    { id: 'm1', vonDatum: '2022-03-01', kaltmiete: 800, nebenkostenumlage: 150 },
    { id: 'm2', vonDatum: '2024-09-01', kaltmiete: 0, nebenkostenumlage: 0 }, // Leerstand
    { id: 'm3', vonDatum: '2024-11-01', kaltmiete: 850, nebenkostenumlage: 170 },
  ];

  it('aktuelle Periode = letzte vor heute', () => {
    const p = baseProperty({ mietperioden: perioden });
    expect(currentMietperiode(p, new Date('2023-06-01T00:00:00Z'))?.id).toBe('m1');
    expect(currentMietperiode(p, new Date('2024-10-15T00:00:00Z'))?.id).toBe('m2');
    expect(currentMietperiode(p, new Date('2025-01-01T00:00:00Z'))?.id).toBe('m3');
  });

  it('vor erster Periode = null (= Eigennutzung/Leerstand)', () => {
    const p = baseProperty({ mietperioden: perioden });
    expect(currentMietperiode(p, new Date('2020-01-01T00:00:00Z'))).toBeNull();
  });

  it('istLeerstandPeriode erkennt 0-Periode', () => {
    expect(istLeerstandPeriode(perioden[1])).toBe(true);
    expect(istLeerstandPeriode(perioden[0])).toBe(false);
    expect(istLeerstandPeriode(null)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('jahresCashflowSerie', () => {
  it('zählt Mieteinnahmen pro Jahr richtig (Eigennutzung 2020-21 → 0)', () => {
    const p = baseProperty({
      kaufDatum: '2020-03-15',
      hausgeldMonatlich: 200,
      grundbesitzabgabenJaehrlich: 600,
      mietperioden: [
        { id: 'm1', vonDatum: '2022-03-01', kaltmiete: 800, nebenkostenumlage: 150 },
      ],
    });
    const serie = jahresCashflowSerie(p, 2023);
    expect(serie.length).toBeGreaterThan(0);
    const y2020 = serie.find(s => s.jahr === 2020);
    const y2023 = serie.find(s => s.jahr === 2023);
    // 2020: Eigennutzung — keine Mieteinnahmen, aber Hausgeld + Grundbesitz laufen
    expect(y2020?.einnahmenMiete).toBe(0);
    expect(y2020?.ausgabenHausgeld).toBeGreaterThan(0);
    // 2023: voll vermietet
    expect(y2023?.einnahmenMiete).toBe(12 * (800 + 150));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Steuer-Jahresansicht', () => {
  it('summiert direkte Steuerposten + automatisch aus Verträgen', () => {
    const data: FinanzData = {
      ...emptyData(),
      steuerposten: [
        { id: 'sp1', datum: '2026-03-15', bereich: 'nicht_selbst', kategorie: 'bewirtung', betrag: 100, beschreibung: 'Lunch' },
        { id: 'sp2', datum: '2025-05-15', bereich: 'nicht_selbst', kategorie: 'bewirtung', betrag: 50, beschreibung: 'Anderes Jahr' },
      ],
      months: {
        '2026-01': {
          monthKey: '2026-01', income: [], invest: [], variableExpenses: [], cash: [],
          contracts: [
            { id: 'v1', name: 'Berufsverband', category: 'sonstiges', amount: 80,
              interval: 'yearly', paymentMonth: 1,
              steuerRelevant: true, steuerBereich: 'nicht_selbst', steuerKategorie: 'berufsverband' },
          ],
        },
      },
    };
    const liste = steuerJahresansicht(data, 2026, 'nicht_selbst');
    expect(liste.length).toBe(2);  // 1 direkt + 1 aus Vertrag
    const direct = liste.find(e => !e.isContract);
    const fromContract = liste.find(e => e.isContract);
    expect(direct?.betrag).toBe(100);
    expect(fromContract?.betrag).toBe(80);
    expect(fromContract?.kategorie).toBe('berufsverband');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Vermögen / Konten', () => {
  it('kontoStandFor nimmt letzten bekannten Wert', () => {
    const data: FinanzData = {
      ...emptyData(),
      konten: [{ id: 'k1', name: 'Giro', typ: 'giro' }],
      kontoStaende: [
        { id: 'ks1', kontoId: 'k1', monthKey: '2026-01', betrag: 1000 },
        { id: 'ks2', kontoId: 'k1', monthKey: '2026-03', betrag: 1500 },
      ],
    };
    expect(kontoStandFor(data, 'k1', '2026-02')).toBe(1000); // Fallback auf Januar
    expect(kontoStandFor(data, 'k1', '2026-03')).toBe(1500); // exakt März
    expect(kontoStandFor(data, 'k1', '2026-12')).toBe(1500); // Fallback auf März
    expect(kontoStandFor(data, 'k1', '2025-12')).toBe(0);    // vor erstem Stand
  });

  it('vermoegenFor summiert alle aktiven Konten', () => {
    const data: FinanzData = {
      ...emptyData(),
      konten: [
        { id: 'k1', name: 'Giro', typ: 'giro' },
        { id: 'k2', name: 'Tagesgeld', typ: 'tagesgeld' },
        { id: 'k3', name: 'Altes Konto', typ: 'giro', archiviert: true },
      ],
      kontoStaende: [
        { id: 'a', kontoId: 'k1', monthKey: '2026-05', betrag: 2500 },
        { id: 'b', kontoId: 'k2', monthKey: '2026-05', betrag: 8000 },
        { id: 'c', kontoId: 'k3', monthKey: '2026-05', betrag: 99999 }, // archiviert: ignoriert
      ],
    };
    const v = vermoegenFor(data, '2026-05');
    expect(v.gesamt).toBe(10_500);
    expect(v.details.length).toBe(2);  // archiviertes Konto raus
  });
});
