# Finanzflow — Spezifikation & offene Fragen

> Dieses Dokument ist der Übergabe-Kontext. Es wurde aus einem vorherigen Chat erstellt,
> in dem CashFlow gebaut und die Finanzübersicht-HTML analysiert wurde.
> **Vor dem Bauen: die offenen Fragen unten mit dem Nutzer klären. Diagramme NUR nach
> ausdrücklichem „Go" des Nutzers.**

## Herkunft

- Finanzflow ist ein **Duplikat der CashFlow-App** (Expo SDK 54, React Native 0.81, TypeScript).
  Ordner: `D:\Claud Projects\Finanzflow`. Eigene Datenspeicherung (AsyncStorage), startet leer,
  unabhängig von CashFlow.
- Design-Sprache bleibt: dunkles Theme, Limegrün-Akzent (`#B8F12C`), iOS-Stil, abgerundete Cards.
- Referenz-HTML (nur Funktion, nicht Design):
  `C:\Users\drgeo\OneDrive\Desktop\Finanzen\V5\finanz-app.html` — eine umfangreiche
  monats-schnappschuss-basierte Haushalts-Finanz-App (Übersicht, Einnahmen, Ausgaben, Sparen,
  Konten, Verträge, Jahresübersicht, Steuer, Einstellungen).

## Gewünschte Funktionen (Nutzer-Wortlaut, sinngemäß)

1. **Verträge** wie in Finanzübersicht → laufen automatisch monatlich als **Fixkosten**
   (monatlich/jährlich, Kategorie, Betrag, ggf. Kündigungsfrist/Vertragsende).
2. **Variable Kosten** → einfach eintragbar.
3. **Bargeld** → zusätzlich separat, damit man den Cashflow beobachten kann (Ein- UND Ausgabe).
   Das ist der bestehende CashFlow-Numpad.
4. **Immobilien** (neuer Bereich): pro Immobilie
   - Monatsrate, Kreditsumme, Zinsen/Tilgung
   - Kreditlaufzeit + wie viel bis dahin eingezahlt wurde
   - Kaltmiete/Warmmiete, Nebenkosten
   - seit wann vermietet
   - **separater PDF-Export** nur für Immobilien
5. **Alles editierbar/umbenennbar** — z. B. „Kindergeld" unter Einnahmen umbenennen,
   Posten hinzufügen/löschen.
6. Das System muss pro Posten **merken**: Richtung (Einnahme/Ausgabe) + Art
   (Fix / Wiederkehrend / Variabel / Bargeld).

## Geklärte Entscheidungen (vom Nutzer bestätigt)

1. **Daten-Prinzip:** Monatssummen pro Kategorie eintippen (wie Finanzübersicht).
   KEINE Einzelbuchungen mit Datum. Es geht um den Überblick, nicht „was wann bezahlt".
2. **Bargeld:** wird als **eigener Bereich separat erfasst**, fließt aber in die
   Gesamtrechnung ein: ausgegebenes Bargeld zählt zu **variablen Kosten**,
   eingenommenes Bargeld zählt zu **Einnahmen**. Eigener Eingabe-Bereich, aber Summen
   gehen ins Dashboard.
3. **Arten:** **Fix = wiederkehrend** (kann monatlich ODER jährlich sein). Jährlich wird
   auf einem bestimmten Monat erfasst, aber in der **Jahresübersicht** sichtbar
   (Funktion wie Finanzübersicht). **Variabel** = die variablen Kosten/Einnahmen.
   **Invest** wie Finanzübersicht: fixes/wiederkehrendes Investment + zusätzlich
   spontane Investments möglich.
4. **Immobilien — Kredit:** wird **automatisch berechnet** (Amortisation).
5. **Immobilien:** **komplett separate Abteilung**, getrennt von allem anderen — fließt
   NICHT in den Monatsüberblick/Dashboard ein. Eigener Bereich + **eigener PDF-Export**.
   Mehrere Immobilien möglich. Pro Immobilie: Monatsrate, Kreditsumme, Zins/Tilgung,
   Kreditlaufzeit + bereits eingezahlt, Kaltmiete/Warmmiete, Nebenkosten, seit wann
   vermietet — automatisch gerechnet (Restschuld, getilgt, Restlaufzeit).
6. **Verträge — Umfang:** voll wie Finanzübersicht (monatlich + jährlich mit Zahlmonat,
   Kündigungsfrist, Vertragsende, „bald kündbar"-Warnung < 120 Tage). Bestätigt.
7. **Editierbarkeit:** ALLE Posten frei verwaltbar — umbenennen, hinzufügen, löschen
   (z. B. „Kindergeld" unter Einnahmen umbenennen). Sinnvolle Startwerte vorgeben.
8. **Dashboard zeigt:** Einnahmen, Fixkosten (= Verträge), Variable Kosten
   (inkl. Bargeld-Ausgaben), Einnahmen inkl. Bargeld-Einnahmen — plus abgeleitete
   Kennzahlen (Überschuss/Sparquote o. ä.), Vormonatsvergleich.
9. **Diagramme:** erst nach ausdrücklichem „Go" des Nutzers bauen — alles andere vorher.

### Geklärte Entscheidungen — Runde 2 (2026-05-16, mit Nutzer durchgesprochen)

10. **Monatswechsel:** Neuer Monat übernimmt **Fixes automatisch** (Verträge/Fixkosten,
    Einnahmen wie Gehalt, Invest). **Variable Kosten und Bargeld starten jeden Monat
    bei 0.** Entspricht dem Finanzübersicht-Verhalten.
11. **Jährliche Verträge im Monats-Dashboard:** Der **volle Betrag belastet nur den
    Zahlmonat** (andere Monate 0). In der Jahresübersicht voll als Jahressumme sichtbar.
    Keine 1/12-Glättung.
12. **Immobilien-Kredit:** Maßgebliche Eingaben = **Kreditsumme + Sollzins % +
    Laufzeit**. Daraus berechnet: Monatsrate, Restschuld, bereits getilgt, Restlaufzeit
    (klassischer Annuitätenkredit).
13. **Invest im Dashboard:** zählt **als Sparen, nicht als Ausgabe** — mindert NICHT
    den Überschuss, fließt aber in Sparquote/Sparen-Kennzahl ein.
14. **Steuer & Konten:** Bereiche aus der Referenz-HTML sind **vorerst NICHT im Umfang**.
    Später nachrüstbar. Fokus: Einnahmen/Fixkosten/Variabel/Bargeld/Invest/Immobilien.
15. **Bargeld-Logik:** **kein laufender Kassenstand**. Pro Monat nur Summe
    Bargeld-Einnahmen und Bargeld-Ausgaben, die ins Dashboard fließen
    (Ausgaben → variable Kosten, Einnahmen → Einnahmen).

## Phasen-Plan

- Phase 1: Datenmodell + AsyncStorage + Berechnungslogik (Monatsschnappschuss,
  Verträge monatlich/jährlich, Invest, Bargeld→variable/Einnahmen, Immobilien-Kredit).
- Phase 2: Eingabe-Screens — Einnahmen, Fixkosten/Verträge, Variable Kosten, Bargeld,
  Invest, Immobilien — alle mit Anlegen/Bearbeiten/Löschen + Umbenennen.
- Phase 3: Übersichten — Dashboard (Vormonatsvergleich), Jahresübersicht,
  PDF-Export (gesamt) + separater Immobilien-PDF-Export, Einstellungen.
- Phase 4: Diagramme — NUR nach „Go".

## Wichtig fürs Bauen

- Design NICHT neu machen — Theme/Icons/Components/Navigation sind bereits aus dem
  CashFlow-Duplikat vorhanden (`src/theme`, `src/components`, `src/navigation`).
  Nur Screens/Datenmodell auf das Finanzflow-Konzept umbauen.
- CashFlow (`D:\Claud Projects\CashFlow`) und die Finanzübersicht-HTML NICHT anfassen.

## Technischer Stand (vom CashFlow-Duplikat geerbt)

- `npm install --legacy-peer-deps` nötig, danach `npx expo install --fix` damit Native-Module
  zu SDK 54 passen (sonst Fabric-Fehler „expected boolean, got string").
- Start: `npx.cmd expo start --clear` (PowerShell-Execution-Policy ggf. auf RemoteSigned).
- Export-Screens als Modal über den Tabs präsentieren (sonst verdeckt die Tab-Leiste Buttons).
