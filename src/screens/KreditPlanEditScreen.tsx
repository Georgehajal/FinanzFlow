import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StatusBar, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import {
  newId, KreditPlan, KreditPlanTyp, Sondertilgung, EigenPhase,
} from '../data/model';
import { PLAN_TYP_LABEL, formatEuro } from '../data/calc';
import { parseDateInput, isoToDE } from '../data/dateUtils';
import { TopBar, SectionLabel, Card, FieldRow, TextField, DateField, PrimaryButton } from '../components/UI';
import CFIcon from '../components/CFIcon';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

type FormState = Record<string, string>;

const TYP_BESCHREIBUNG: Record<KreditPlanTyp, string> = {
  annuitaet: 'Klassischer Hauskredit. Gleichbleibende Rate aus Zins + Tilgung. Restschuld sinkt monatlich.',
  bausparen: 'Bausparvertrag mit Anspar- und Darlehensphase. Erst sparen, dann zinsgünstig tilgen.',
  vorausdarlehen: 'Tilgungsfrei (nur Zinsen). Optional mit paralleler Sparrate (z. B. BHW Bausparvertrag), die später das Darlehen ablöst.',
  endfaellig: 'Komplette Kreditsumme am Ende der Laufzeit. Monatlich nur Zinsen. Optional separate Tilgungsanlage.',
  tilgung: 'Fester €-Betrag Tilgung pro Monat. Rate sinkt mit der Zeit, da weniger Zinsen anfallen.',
  kfw: 'Förderkredit der KfW. Oft mit tilgungsfreien Anlaufjahren und vergünstigtem Zins.',
  variabel: 'Variabler Zinssatz, der sich periodisch anpasst (z. B. alle 3 Monate).',
  eigen: 'Eigener Vertrag mit freien Feldern. Optional mit Phasen für unterschiedliche Raten.',
};

const TYPEN: KreditPlanTyp[] = ['annuitaet', 'bausparen', 'vorausdarlehen', 'endfaellig', 'tilgung', 'kfw', 'variabel', 'eigen'];

export default function KreditPlanEditScreen() {
  const { theme, data, upsertPlan } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propId: string = route.params?.propId;
  const editId: string | undefined = route.params?.planId;
  const prefillTyp: KreditPlanTyp | undefined = route.params?.typ;

  const prop = data.properties.find(p => p.id === propId);
  const ex = editId && prop?.kreditplaene ? prop.kreditplaene.find(p => p.id === editId) : null;

  const [typ, setTyp] = useState<KreditPlanTyp | null>(ex ? ex.typ : prefillTyp ?? null);

  const [f, setF] = useState<FormState>(() => initialForm(ex));
  const [sondertilg, setSondertilg] = useState<Sondertilgung[]>(ex?.sondertilgungen ?? []);
  const [phasen, setPhasen] = useState<EigenPhase[]>(ex?.typ === 'eigen' ? (ex.phasen ?? []) : []);

  const set = (k: string) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const save = () => {
    if (!typ) { Alert.alert('Vertragstyp', 'Bitte einen Vertragstyp wählen.'); return; }
    if (!f.name.trim()) { Alert.alert('Name fehlt', 'Bitte einen Namen eingeben.'); return; }
    const startDatum = parseDateInput(f.startDatum);
    if (!startDatum) { Alert.alert('Startdatum fehlt', 'Bitte ein gültiges Datum (TT.MM.JJJJ) eingeben.'); return; }
    const zinsbindungBis = f.zinsbindungBis ? parseDateInput(f.zinsbindungBis) : null;
    if (f.zinsbindungBis && !zinsbindungBis) {
      Alert.alert('Zinsbindung', 'Bitte gültiges Datum (TT.MM.JJJJ) oder leer lassen.'); return;
    }
    const baseFields = {
      id: ex?.id ?? newId('plan'),
      name: f.name.trim(),
      startDatum,
      zinsbindungBis: zinsbindungBis || undefined,
      sondertilgungProzentMax: f.sondertilgungProzentMax ? num(f.sondertilgungProzentMax) : undefined,
      sondertilgungen: sondertilg.length > 0 ? sondertilg : undefined,
      notiz: f.notiz?.trim() || undefined,
      verknuepftMit: ex?.verknuepftMit,
    };

    let plan: KreditPlan;
    switch (typ) {
      case 'annuitaet':
        plan = { ...baseFields, typ, kreditsumme: num(f.kreditsumme), sollzinsProzent: num(f.sollzinsProzent),
          tilgungsProzent: f.tilgungsProzent ? num(f.tilgungsProzent) : undefined,
          laufzeitMonate: f.laufzeitMonate ? Math.round(num(f.laufzeitMonate)) : undefined,
          monatsrate: f.monatsrate ? num(f.monatsrate) : undefined,
          tilgungsfreieMonate: f.tilgungsfreieMonate ? Math.round(num(f.tilgungsfreieMonate)) : undefined };
        break;
      case 'bausparen':
        plan = { ...baseFields, typ, bausparsumme: num(f.bausparsumme), sparrate: num(f.sparrate),
          guthabenAktuell: num(f.guthabenAktuell), guthabenzinsProzent: num(f.guthabenzinsProzent),
          mindestguthabenProzent: num(f.mindestguthabenProzent) || 40,
          abschlussgebuehr: f.abschlussgebuehr ? num(f.abschlussgebuehr) : undefined,
          darlehenZinsProzent: num(f.darlehenZinsProzent),
          darlehenTilgungsProzent: f.darlehenTilgungsProzent ? num(f.darlehenTilgungsProzent) : undefined,
          darlehenTilgungEuroMonatlich: f.darlehenTilgungEuroMonatlich ? num(f.darlehenTilgungEuroMonatlich) : undefined };
        break;
      case 'vorausdarlehen':
        plan = { ...baseFields, typ, kreditsumme: num(f.kreditsumme), sollzinsProzent: num(f.sollzinsProzent),
          laufzeitMonate: Math.max(1, Math.round(num(f.laufzeitMonate))),
          paralleleSparrate: f.paralleleSparrate ? num(f.paralleleSparrate) : undefined };
        break;
      case 'endfaellig':
        plan = { ...baseFields, typ, kreditsumme: num(f.kreditsumme), sollzinsProzent: num(f.sollzinsProzent),
          laufzeitMonate: Math.max(1, Math.round(num(f.laufzeitMonate))),
          tilgungsersatzMonatlich: f.tilgungsersatzMonatlich ? num(f.tilgungsersatzMonatlich) : undefined };
        break;
      case 'tilgung':
        plan = { ...baseFields, typ, kreditsumme: num(f.kreditsumme), sollzinsProzent: num(f.sollzinsProzent),
          tilgungEuroMonatlich: num(f.tilgungEuroMonatlich) };
        break;
      case 'kfw':
        plan = { ...baseFields, typ, kreditsumme: num(f.kreditsumme), sollzinsProzent: num(f.sollzinsProzent),
          laufzeitMonate: Math.max(1, Math.round(num(f.laufzeitMonate))),
          tilgungsfreieAnlaufJahre: Math.max(0, Math.round(num(f.tilgungsfreieAnlaufJahre))) };
        break;
      case 'variabel':
        plan = { ...baseFields, typ, kreditsumme: num(f.kreditsumme),
          aktuellerZinsProzent: num(f.aktuellerZinsProzent),
          tilgungsProzent: num(f.tilgungsProzent),
          zinsAnpassungMonate: Math.max(1, Math.round(num(f.zinsAnpassungMonate))) };
        break;
      case 'eigen':
        plan = { ...baseFields, typ,
          kreditsumme: f.kreditsumme ? num(f.kreditsumme) : undefined,
          monatsrate: f.monatsrate ? num(f.monatsrate) : undefined,
          laufzeitMonate: f.laufzeitMonate ? Math.round(num(f.laufzeitMonate)) : undefined,
          phasen: phasen.length > 0 ? phasen : undefined };
        break;
    }
    upsertPlan(propId, plan!).then(() => navigation.goBack());
  };

  // Wenn noch kein Typ gewählt: Typ-Auswahl anzeigen
  if (!typ) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
        <TopBar theme={theme} title="Vertragstyp wählen" onClose={() => navigation.goBack()} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 13, color: theme.textMuted }}>Welche Art Kreditvertrag möchtest du anlegen?</Text>
          </View>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {TYPEN.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTyp(t)}
                style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <CFIcon name="note" size={18} color={theme.accent} stroke={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15.5, fontWeight: '700', color: theme.text }}>{PLAN_TYP_LABEL[t]}</Text>
                    <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 3 }} numberOfLines={3}>
                      {TYP_BESCHREIBUNG[t]}
                    </Text>
                  </View>
                  <CFIcon name="chevron" size={14} color={theme.textDim} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title={ex ? 'Vertrag bearbeiten' : PLAN_TYP_LABEL[typ]}
        onClose={() => navigation.goBack()}
        right={!ex ? (
          <TouchableOpacity onPress={() => setTyp(null)} style={{ paddingHorizontal: 10, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600' }}>Typ ändern</Text>
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Allgemein</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Name">
            <TextField theme={theme} value={f.name} onChangeText={set('name')} placeholder="z. B. BHW Bauspar" />
          </FieldRow>
          <FieldRow theme={theme} label="Startdatum" last>
            <DateField theme={theme} value={f.startDatum} onChangeText={set('startDatum')} />
          </FieldRow>
        </Card>

        <DynamicFields typ={typ} f={f} set={set} theme={theme} />

        <SectionLabel theme={theme}>Zinsbindung (optional)</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Zinsbindung bis" last>
            <DateField theme={theme} value={f.zinsbindungBis} onChangeText={set('zinsbindungBis')} placeholder="leer = unbegrenzt" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Sondertilgungen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Max. erlaubt (% / Jahr)" last={sondertilg.length === 0}>
            <TextField theme={theme} value={f.sondertilgungProzentMax} onChangeText={set('sondertilgungProzentMax')} placeholder="z. B. 5" keyboardType="decimal-pad" />
          </FieldRow>
          {sondertilg.map((s, i) => (
            <View key={s.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{formatEuro(s.betrag, { decimals: 0 })}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{isoToDE(s.datum)}{s.notiz ? ` · ${s.notiz}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSondertilg(arr => arr.filter(x => x.id !== s.id))} style={{ padding: 6 }}>
                <CFIcon name="close" size={16} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          ))}
          <SondertilgungInput theme={theme} onAdd={(s) => setSondertilg(arr => [...arr, s])} />
        </Card>

        {typ === 'eigen' && (
          <>
            <SectionLabel theme={theme}>Phasen (optional)</SectionLabel>
            <Card theme={theme}>
              {phasen.map((p) => (
                <View key={p.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{p.name || 'Phase'}</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                      Monat {p.vonMonat}–{p.bisMonat} · {formatEuro(p.monatsrate, { decimals: 0 })}/Monat
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPhasen(arr => arr.filter(x => x.id !== p.id))} style={{ padding: 6 }}>
                    <CFIcon name="close" size={16} color={theme.textDim} />
                  </TouchableOpacity>
                </View>
              ))}
              <PhaseInput theme={theme} onAdd={(p) => setPhasen(arr => [...arr, p])} last={phasen.length === 0} />
            </Card>
          </>
        )}

        <SectionLabel theme={theme}>Notiz</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Notiz" last>
            <TextField theme={theme} value={f.notiz} onChangeText={set('notiz')} placeholder="optional" />
          </FieldRow>
        </Card>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function initialForm(ex: KreditPlan | null | undefined): FormState {
  const base: FormState = {
    name: ex?.name ?? '',
    startDatum: ex?.startDatum ? isoToDE(ex.startDatum) : '',
    zinsbindungBis: ex?.zinsbindungBis ? isoToDE(ex.zinsbindungBis) : '',
    notiz: ex?.notiz ?? '',
    sondertilgungProzentMax: ex?.sondertilgungProzentMax ? String(ex.sondertilgungProzentMax) : '',
    kreditsumme: '', sollzinsProzent: '', laufzeitMonate: '', tilgungsProzent: '',
    tilgungsfreieMonate: '',
    bausparsumme: '', sparrate: '', guthabenAktuell: '', guthabenzinsProzent: '', mindestguthabenProzent: '',
    abschlussgebuehr: '', darlehenZinsProzent: '', darlehenTilgungsProzent: '', darlehenTilgungEuroMonatlich: '',
    tilgungsersatzMonatlich: '', tilgungEuroMonatlich: '', tilgungsfreieAnlaufJahre: '',
    aktuellerZinsProzent: '', zinsAnpassungMonate: '',
    monatsrate: '',
    paralleleSparrate: '',
  };
  if (!ex) return base;
  const e = ex as any;
  const setIf = (k: string, v: any) => { if (v != null && v !== 0 && v !== '') base[k] = String(v); };
  Object.keys(base).forEach(k => {
    if (k === 'startDatum' || k === 'zinsbindungBis' || k === 'name' || k === 'notiz') return;
    setIf(k, e[k]);
  });
  return base;
}

// ── Dynamische Felder je Vertragstyp ─────────────────────────────────────────

function DynamicFields({ typ, f, set, theme }: { typ: KreditPlanTyp; f: FormState; set: (k: string) => (v: string) => void; theme: any }) {
  switch (typ) {
    case 'annuitaet': return (
      <>
        <SectionLabel theme={theme}>Konditionen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Sollzins (% p. a.)">
            <TextField theme={theme} value={f.sollzinsProzent} onChangeText={set('sollzinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 3,5" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgungsfreie Monate" last>
            <TextField theme={theme} value={f.tilgungsfreieMonate} onChangeText={set('tilgungsfreieMonate')} keyboardType="number-pad" placeholder="0" />
          </FieldRow>
        </Card>
        <SectionLabel theme={theme}>Rate / Laufzeit (eines genügt)</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Monatsrate (€)">
            <TextField theme={theme} value={f.monatsrate} onChangeText={set('monatsrate')} keyboardType="decimal-pad" placeholder="z. B. 256,78" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgung (% p. a.)">
            <TextField theme={theme} value={f.tilgungsProzent} onChangeText={set('tilgungsProzent')} keyboardType="decimal-pad" placeholder="z. B. 2" />
          </FieldRow>
          <FieldRow theme={theme} label="Laufzeit (Monate)" last>
            <TextField theme={theme} value={f.laufzeitMonate} onChangeText={set('laufzeitMonate')} keyboardType="number-pad" placeholder="z. B. 360" />
          </FieldRow>
        </Card>
      </>
    );
    case 'bausparen': return (
      <>
        <SectionLabel theme={theme}>Ansparphase</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Bausparsumme (€)">
            <TextField theme={theme} value={f.bausparsumme} onChangeText={set('bausparsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Sparrate / Monat (€)">
            <TextField theme={theme} value={f.sparrate} onChangeText={set('sparrate')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Aktuelles Guthaben (€)">
            <TextField theme={theme} value={f.guthabenAktuell} onChangeText={set('guthabenAktuell')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Guthabenzins (% p. a.)">
            <TextField theme={theme} value={f.guthabenzinsProzent} onChangeText={set('guthabenzinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 0,5" />
          </FieldRow>
          <FieldRow theme={theme} label="Mindestguthaben (%)">
            <TextField theme={theme} value={f.mindestguthabenProzent} onChangeText={set('mindestguthabenProzent')} keyboardType="decimal-pad" placeholder="z. B. 40" />
          </FieldRow>
          <FieldRow theme={theme} label="Abschlussgebühr (€)" last>
            <TextField theme={theme} value={f.abschlussgebuehr} onChangeText={set('abschlussgebuehr')} keyboardType="decimal-pad" placeholder="optional" />
          </FieldRow>
        </Card>
        <SectionLabel theme={theme}>Darlehensphase (nach Zuteilung)</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Darlehenszins (% p. a.)">
            <TextField theme={theme} value={f.darlehenZinsProzent} onChangeText={set('darlehenZinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 2,5" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgung (% p. a.)">
            <TextField theme={theme} value={f.darlehenTilgungsProzent} onChangeText={set('darlehenTilgungsProzent')} keyboardType="decimal-pad" placeholder="z. B. 6 (oder €/Mon. unten)" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgung (€/Monat)" last>
            <TextField theme={theme} value={f.darlehenTilgungEuroMonatlich} onChangeText={set('darlehenTilgungEuroMonatlich')} keyboardType="decimal-pad" placeholder="Alternative zu %" />
          </FieldRow>
        </Card>
      </>
    );
    case 'vorausdarlehen': return (
      <>
        <SectionLabel theme={theme}>Konditionen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Sollzins (% p. a.)">
            <TextField theme={theme} value={f.sollzinsProzent} onChangeText={set('sollzinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 0,55" />
          </FieldRow>
          <FieldRow theme={theme} label="Laufzeit (Monate)" last>
            <TextField theme={theme} value={f.laufzeitMonate} onChangeText={set('laufzeitMonate')} keyboardType="number-pad" placeholder="z. B. 120 (10 Jahre)" />
          </FieldRow>
        </Card>
        <SectionLabel theme={theme}>Parallele Sparrate (optional)</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Sparrate (€/Monat)" last>
            <TextField theme={theme} value={f.paralleleSparrate} onChangeText={set('paralleleSparrate')} keyboardType="decimal-pad" placeholder="z. B. 206,23 (BSV)" />
          </FieldRow>
        </Card>
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Text style={{ fontSize: 11.5, color: theme.textMuted }}>
            Z. B. BHW Bausparrate, die parallel läuft und später (bei Zuteilung) das Vorausdarlehen ablöst. Wird als Tilgung im Cashflow gewertet.
          </Text>
        </View>
      </>
    );
    case 'endfaellig': return (
      <>
        <SectionLabel theme={theme}>Konditionen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Sollzins (% p. a.)">
            <TextField theme={theme} value={f.sollzinsProzent} onChangeText={set('sollzinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 3,0" />
          </FieldRow>
          <FieldRow theme={theme} label="Laufzeit (Monate)">
            <TextField theme={theme} value={f.laufzeitMonate} onChangeText={set('laufzeitMonate')} keyboardType="number-pad" placeholder="z. B. 240" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgungsersatz / Monat (€)" last>
            <TextField theme={theme} value={f.tilgungsersatzMonatlich} onChangeText={set('tilgungsersatzMonatlich')} keyboardType="decimal-pad" placeholder="optional" />
          </FieldRow>
        </Card>
      </>
    );
    case 'tilgung': return (
      <>
        <SectionLabel theme={theme}>Konditionen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Sollzins (% p. a.)">
            <TextField theme={theme} value={f.sollzinsProzent} onChangeText={set('sollzinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 3,0" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgung / Monat (€)" last>
            <TextField theme={theme} value={f.tilgungEuroMonatlich} onChangeText={set('tilgungEuroMonatlich')} keyboardType="decimal-pad" placeholder="fester €-Betrag" />
          </FieldRow>
        </Card>
      </>
    );
    case 'kfw': return (
      <>
        <SectionLabel theme={theme}>Konditionen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Sollzins (% p. a.)">
            <TextField theme={theme} value={f.sollzinsProzent} onChangeText={set('sollzinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 1,5" />
          </FieldRow>
          <FieldRow theme={theme} label="Laufzeit (Monate)">
            <TextField theme={theme} value={f.laufzeitMonate} onChangeText={set('laufzeitMonate')} keyboardType="number-pad" placeholder="z. B. 240" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgungsfreie Anlaufjahre" last>
            <TextField theme={theme} value={f.tilgungsfreieAnlaufJahre} onChangeText={set('tilgungsfreieAnlaufJahre')} keyboardType="number-pad" placeholder="z. B. 2" />
          </FieldRow>
        </Card>
      </>
    );
    case 'variabel': return (
      <>
        <SectionLabel theme={theme}>Konditionen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Aktueller Zins (% p. a.)">
            <TextField theme={theme} value={f.aktuellerZinsProzent} onChangeText={set('aktuellerZinsProzent')} keyboardType="decimal-pad" placeholder="z. B. 4,5" />
          </FieldRow>
          <FieldRow theme={theme} label="Tilgung (% p. a.)">
            <TextField theme={theme} value={f.tilgungsProzent} onChangeText={set('tilgungsProzent')} keyboardType="decimal-pad" placeholder="z. B. 2" />
          </FieldRow>
          <FieldRow theme={theme} label="Zinsanpassung alle (Monate)" last>
            <TextField theme={theme} value={f.zinsAnpassungMonate} onChangeText={set('zinsAnpassungMonate')} keyboardType="number-pad" placeholder="z. B. 3" />
          </FieldRow>
        </Card>
      </>
    );
    case 'eigen': return (
      <>
        <SectionLabel theme={theme}>Eckdaten (optional)</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} keyboardType="decimal-pad" placeholder="optional" />
          </FieldRow>
          <FieldRow theme={theme} label="Monatsrate (€)">
            <TextField theme={theme} value={f.monatsrate} onChangeText={set('monatsrate')} keyboardType="decimal-pad" placeholder="falls ohne Phasen" />
          </FieldRow>
          <FieldRow theme={theme} label="Laufzeit (Monate)" last>
            <TextField theme={theme} value={f.laufzeitMonate} onChangeText={set('laufzeitMonate')} keyboardType="number-pad" placeholder="optional" />
          </FieldRow>
        </Card>
      </>
    );
  }
}

// ── Sondertilgung Eingabe ────────────────────────────────────────────────────

function SondertilgungInput({ theme, onAdd }: { theme: any; onAdd: (s: Sondertilgung) => void }) {
  const [d, setD] = useState('');
  const [b, setB] = useState('');
  const [n, setN] = useState('');
  const add = () => {
    const iso = parseDateInput(d);
    if (!iso) { Alert.alert('Datum', 'Bitte gültiges Datum (TT.MM.JJJJ) eingeben.'); return; }
    const betrag = num(b);
    if (betrag <= 0) { Alert.alert('Betrag', 'Bitte einen Betrag eingeben.'); return; }
    onAdd({ id: newId('st'), datum: iso, betrag, notiz: n.trim() || undefined });
    setD(''); setB(''); setN('');
  };
  return (
    <View style={{ borderTopWidth: 0.5, borderTopColor: theme.border, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <DateField theme={theme} value={d} onChangeText={setD} align="left" />
        </View>
        <View style={{ width: 100, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <TextField theme={theme} value={b} onChangeText={setB} placeholder="€" keyboardType="decimal-pad" align="left" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <TextField theme={theme} value={n} onChangeText={setN} placeholder="Notiz (optional)" align="left" />
        </View>
        <TouchableOpacity onPress={add} style={{ width: 56, height: 40, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
          <CFIcon name="plus" size={16} color={theme.accentInk} stroke={2.6} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Phase Eingabe (für 'eigen') ──────────────────────────────────────────────

function PhaseInput({ theme, onAdd, last }: { theme: any; onAdd: (p: EigenPhase) => void; last?: boolean }) {
  const [name, setName] = useState('');
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [rate, setRate] = useState('');
  const add = () => {
    const v = Math.round(num(von)), b = Math.round(num(bis)), r = num(rate);
    if (v < 1 || b < v || r <= 0) { Alert.alert('Phase', 'Bitte gültige Werte eingeben (Von ≥ 1, Bis ≥ Von, Rate > 0).'); return; }
    onAdd({ id: newId('ph'), name: name.trim() || `Phase ${v}–${b}`, vonMonat: v, bisMonat: b, monatsrate: r });
    setName(''); setVon(''); setBis(''); setRate('');
  };
  return (
    <View style={{ borderTopWidth: last ? 0 : 0.5, borderTopColor: theme.border, padding: 12, gap: 8 }}>
      <View style={{ backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
        <TextField theme={theme} value={name} onChangeText={setName} placeholder="Phasenname (optional)" align="left" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <TextField theme={theme} value={von} onChangeText={setVon} placeholder="Von Monat" keyboardType="number-pad" align="left" />
        </View>
        <View style={{ flex: 1, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <TextField theme={theme} value={bis} onChangeText={setBis} placeholder="Bis Monat" keyboardType="number-pad" align="left" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
          <TextField theme={theme} value={rate} onChangeText={setRate} placeholder="Rate €" keyboardType="decimal-pad" align="left" />
        </View>
        <TouchableOpacity onPress={add} style={{ width: 56, height: 40, borderRadius: 10, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
          <CFIcon name="plus" size={16} color={theme.accentInk} stroke={2.6} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
