import React, { useState } from 'react';
import { View, ScrollView, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { newId, Immobilie } from '../data/model';
import { TopBar, SectionLabel, Card, FieldRow, TextField, PrimaryButton } from '../components/UI';

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
    kreditsumme: ex && ex.kreditsumme ? String(ex.kreditsumme) : '',
    sollzinsProzent: ex && ex.sollzinsProzent ? String(ex.sollzinsProzent) : '',
    laufzeitMonate: ex && ex.laufzeitMonate ? String(ex.laufzeitMonate) : '',
    kreditStart: ex?.kreditStart ?? '',
    kaltmiete: ex && ex.kaltmiete ? String(ex.kaltmiete) : '',
    warmmiete: ex && ex.warmmiete ? String(ex.warmmiete) : '',
    nebenkosten: ex && ex.nebenkosten ? String(ex.nebenkosten) : '',
    vermietetSeit: ex?.vermietetSeit ?? '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const save = () => {
    if (!f.name.trim()) { Alert.alert('Name fehlt', 'Bitte einen Namen eingeben.'); return; }
    const p: Immobilie = {
      id: editId ?? newId('imm'),
      name: f.name.trim(),
      kreditsumme: num(f.kreditsumme),
      sollzinsProzent: num(f.sollzinsProzent),
      laufzeitMonate: Math.max(1, Math.round(num(f.laufzeitMonate))),
      kreditStart: /^\d{4}-\d{2}-\d{2}$/.test(f.kreditStart.trim()) ? f.kreditStart.trim() : new Date().toISOString().slice(0, 10),
      kaltmiete: num(f.kaltmiete),
      warmmiete: num(f.warmmiete),
      nebenkosten: num(f.nebenkosten),
      vermietetSeit: /^\d{4}-\d{2}-\d{2}$/.test(f.vermietetSeit.trim()) ? f.vermietetSeit.trim() : undefined,
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
          <FieldRow theme={theme} label="Name" last>
            <TextField theme={theme} value={f.name} onChangeText={set('name')} placeholder="z. B. Wohnung Berlin" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Kredit (Rest wird berechnet)</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kreditsumme (€)">
            <TextField theme={theme} value={f.kreditsumme} onChangeText={set('kreditsumme')} placeholder="0" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Sollzins (% p. a.)">
            <TextField theme={theme} value={f.sollzinsProzent} onChangeText={set('sollzinsProzent')} placeholder="z. B. 3,5" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Laufzeit (Monate)">
            <TextField theme={theme} value={f.laufzeitMonate} onChangeText={set('laufzeitMonate')} placeholder="z. B. 360" keyboardType="number-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Kreditstart (JJJJ-MM-TT)" last>
            <TextField theme={theme} value={f.kreditStart} onChangeText={set('kreditStart')} placeholder="2020-01-01" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Vermietung</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Kaltmiete (€)">
            <TextField theme={theme} value={f.kaltmiete} onChangeText={set('kaltmiete')} placeholder="0" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Warmmiete (€)">
            <TextField theme={theme} value={f.warmmiete} onChangeText={set('warmmiete')} placeholder="0" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Nebenkosten (€)">
            <TextField theme={theme} value={f.nebenkosten} onChangeText={set('nebenkosten')} placeholder="0" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Vermietet seit (JJJJ-MM-TT)" last>
            <TextField theme={theme} value={f.vermietetSeit} onChangeText={set('vermietetSeit')} placeholder="optional" />
          </FieldRow>
        </Card>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
