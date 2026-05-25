import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { newId, Immobilie } from '../data/model';
import { parseDateInput, isoToDE } from '../data/dateUtils';
import { TopBar, SectionLabel, Card, FieldRow, TextField, DateField, PrimaryButton } from '../components/UI';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

export default function PropertyEditScreen() {
  const { theme, data, upsertProperty } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId: string | undefined = route.params?.id;
  const ex = editId ? data.properties.find(p => p.id === editId) : null;

  const [f, setF] = useState({
    name: ex?.name ?? '',
    kaufDatum: ex?.kaufDatum ? isoToDE(ex.kaufDatum) : '',
    kaufpreis: ex && ex.kaufpreis ? String(ex.kaufpreis) : '',
    kaufnebenkosten: ex && ex.kaufnebenkosten ? String(ex.kaufnebenkosten) : '',
    eigenkapital: ex && ex.eigenkapital ? String(ex.eigenkapital) : '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const save = () => {
    if (!f.name.trim()) { Alert.alert('Name fehlt', 'Bitte einen Namen eingeben.'); return; }
    const kaufDatumISO = f.kaufDatum ? parseDateInput(f.kaufDatum) : null;
    if (f.kaufDatum && !kaufDatumISO) { Alert.alert('Kaufdatum', 'Bitte gültiges Datum (TT.MM.JJJJ) oder leer.'); return; }

    const p: Immobilie = {
      id: editId ?? newId('imm'),
      name: f.name.trim(),
      kreditplaene: ex?.kreditplaene ?? [],
      mietperioden: ex?.mietperioden ?? [],
      sonderbuchungen: ex?.sonderbuchungen ?? [],
      kaufpreis: num(f.kaufpreis),
      kaufnebenkosten: num(f.kaufnebenkosten),
      eigenkapital: num(f.eigenkapital),
      kaufDatum: kaufDatumISO || undefined,
      // Laufende Kosten bleiben unverändert (eigener Screen)
      hausgeldMonatlich: ex?.hausgeldMonatlich,
      grundbesitzabgabenJaehrlich: ex?.grundbesitzabgabenJaehrlich,
      lebensversicherungMonatlich: ex?.lebensversicherungMonatlich,
      // alte Felder neutralisieren
      kaltmiete: 0,
      warmmiete: 0,
      nebenkosten: 0,
      vermietetSeit: undefined,
      kreditsumme: ex?.kreditsumme,
      sollzinsProzent: ex?.sollzinsProzent,
      laufzeitMonate: ex?.laufzeitMonate,
      kreditStart: ex?.kreditStart,
      note: ex?.note,
    };
    upsertProperty(p);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={editId ? 'Immobilie bearbeiten' : 'Neue Immobilie'} onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Objekt</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Name">
            <TextField theme={theme} value={f.name} onChangeText={set('name')} placeholder="z. B. Wohnung Berlin" />
          </FieldRow>
          <FieldRow theme={theme} label="Kaufdatum" last>
            <DateField theme={theme} value={f.kaufDatum} onChangeText={set('kaufDatum')} />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Kauf & Finanzierung</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kaufpreis (€)">
            <TextField theme={theme} value={f.kaufpreis} onChangeText={set('kaufpreis')} placeholder="z. B. 180000" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Kaufnebenkosten (€)">
            <TextField theme={theme} value={f.kaufnebenkosten} onChangeText={set('kaufnebenkosten')} placeholder="Notar/GrESt/Makler" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Eigenkapital (€)" last>
            <TextField theme={theme} value={f.eigenkapital} onChangeText={set('eigenkapital')} placeholder="0" keyboardType="decimal-pad" />
          </FieldRow>
        </Card>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8, gap: 12 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
          <Text style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 8 }}>
            Kreditverträge, Mietperioden, laufende Kosten und Sonderbuchungen verwaltest du in der Detailansicht.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
