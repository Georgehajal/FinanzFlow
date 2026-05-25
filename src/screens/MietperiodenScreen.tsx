import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { newId, Mietperiode } from '../data/model';
import { formatEuro } from '../data/calc';
import { parseDateInput, isoToDE } from '../data/dateUtils';
import { TopBar, SectionLabel, Card, FieldRow, TextField, DateField, PrimaryButton, EmptyState } from '../components/UI';
import CFIcon from '../components/CFIcon';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

export default function MietperiodenScreen() {
  const { theme, data, upsertMietperiode, deleteMietperiode } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propId: string = route.params?.propId;
  const editId: string | undefined = route.params?.perId;

  const prop = data.properties.find(p => p.id === propId);
  const perioden = prop?.mietperioden ?? [];
  const ex = editId ? perioden.find(p => p.id === editId) : null;

  // Editmodus: zeige Edit-Formular
  if (editId !== undefined || route.params?.create) {
    return <PeriodeEdit propId={propId} ex={ex} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title="Mietperioden"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Mietperioden', { propId, create: true })} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Jede Periode gilt ab ihrem Startdatum bis zum Start der nächsten. Eine neue Periode endet die vorige automatisch — Datum frei wählbar (auch Vergangenheit oder Zukunft).
          </Text>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {perioden.length === 0 ? (
            <View style={{ backgroundColor: theme.surface, borderRadius: 16 }}>
              <EmptyState theme={theme} text="Noch keine Mietperiode angelegt" />
            </View>
          ) : perioden.map((per, i) => {
            const next = perioden[i + 1];
            const bis = next ? isoToDE(next.vonDatum) : 'heute / offen';
            const leerstand = (per.kaltmiete || 0) === 0 && (per.nebenkostenumlage || 0) === 0;
            return (
              <TouchableOpacity
                key={per.id}
                onPress={() => navigation.navigate('Mietperioden', { propId, perId: per.id })}
                onLongPress={() => Alert.alert('Löschen?', `Periode ab ${isoToDE(per.vonDatum)} entfernen?`, [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Löschen', style: 'destructive', onPress: () => deleteMietperiode(propId, per.id) },
                ])}
                style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{isoToDE(per.vonDatum)} — {bis}</Text>
                  <CFIcon name="chevron" size={14} color={theme.textDim} />
                </View>
                {leerstand ? (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.expense, marginTop: 4 }}>🏚 Leerstand · 0 € Einnahme</Text>
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Mini theme={theme} l="Kaltmiete" v={formatEuro(per.kaltmiete, { decimals: 0 })} c={theme.income} />
                    <Mini theme={theme} l="NK-Umlage" v={formatEuro(per.nebenkostenumlage, { decimals: 0 })} c={theme.income} />
                    <Mini theme={theme} l="Gesamt" v={formatEuro(per.kaltmiete + per.nebenkostenumlage, { decimals: 0 })} c={theme.income} />
                  </View>
                )}
                {per.notiz ? <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>{per.notiz}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function PeriodeEdit({ propId, ex }: { propId: string; ex: Mietperiode | null | undefined }) {
  const { theme, upsertMietperiode } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [f, setF] = useState({
    vonDatum: ex?.vonDatum ? isoToDE(ex.vonDatum) : '',
    kaltmiete: ex?.kaltmiete ? String(ex.kaltmiete) : '',
    nebenkostenumlage: ex?.nebenkostenumlage ? String(ex.nebenkostenumlage) : '',
    notiz: ex?.notiz ?? '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const save = () => {
    const iso = parseDateInput(f.vonDatum);
    if (!iso) { Alert.alert('Datum', 'Bitte gültiges Startdatum (TT.MM.JJJJ) eingeben.'); return; }
    const per: Mietperiode = {
      id: ex?.id ?? newId('mp'),
      vonDatum: iso,
      kaltmiete: num(f.kaltmiete),
      nebenkostenumlage: num(f.nebenkostenumlage),
      notiz: f.notiz.trim() || undefined,
    };
    upsertMietperiode(propId, per).then(() => navigation.goBack());
  };

  const setLeerstand = () => setF(s => ({ ...s, kaltmiete: '0', nebenkostenumlage: '0' }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={ex ? 'Mietperiode bearbeiten' : 'Neue Mietperiode'} onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Gültig ab</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Startdatum" last>
            <DateField theme={theme} value={f.vonDatum} onChangeText={set('vonDatum')} />
          </FieldRow>
        </Card>
        <SectionLabel theme={theme}>Mieteinnahmen</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kaltmiete (€)">
            <TextField theme={theme} value={f.kaltmiete} onChangeText={set('kaltmiete')} keyboardType="decimal-pad" placeholder="reine Miete" />
          </FieldRow>
          <FieldRow theme={theme} label="NK-Umlage (€)" last>
            <TextField theme={theme} value={f.nebenkostenumlage} onChangeText={set('nebenkostenumlage')} keyboardType="decimal-pad" placeholder="vom Mieter" />
          </FieldRow>
        </Card>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Text style={{ fontSize: 11.5, color: theme.textMuted }}>
            Für Leerstand: beide Werte auf 0 setzen — die App erkennt das automatisch.{' '}
            <Text onPress={setLeerstand} style={{ color: theme.accent, fontWeight: '700' }}>Als Leerstand markieren</Text>
          </Text>
        </View>
        <SectionLabel theme={theme}>Notiz</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Notiz" last>
            <TextField theme={theme} value={f.notiz} onChangeText={set('notiz')} placeholder="z. B. Mieterhöhung +50€" />
          </FieldRow>
        </Card>
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Mini({ theme, l, v, c }: { theme: any; l: string; v: string; c?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 10.5, color: theme.textMuted }}>{l}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: c ?? theme.text, marginTop: 2 }}>{v}</Text>
    </View>
  );
}
