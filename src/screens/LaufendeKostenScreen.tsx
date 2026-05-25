import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { TopBar, SectionLabel, Card, FieldRow, TextField, PrimaryButton } from '../components/UI';
import { formatEuro } from '../data/calc';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

export default function LaufendeKostenScreen() {
  const { theme, data, upsertProperty } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propId: string = route.params?.propId;
  const prop = data.properties.find(p => p.id === propId);

  const [f, setF] = useState({
    hausgeldMonatlich: prop?.hausgeldMonatlich ? String(prop.hausgeldMonatlich) : '',
    grundbesitzabgabenJaehrlich: prop?.grundbesitzabgabenJaehrlich ? String(prop.grundbesitzabgabenJaehrlich) : '',
    lebensversicherungMonatlich: prop?.lebensversicherungMonatlich ? String(prop.lebensversicherungMonatlich) : '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  if (!prop) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TopBar theme={theme} title="Laufende Kosten" onClose={() => navigation.goBack()} />
    </View>;
  }

  const hausgeld = num(f.hausgeldMonatlich);
  const lebensvers = num(f.lebensversicherungMonatlich);
  const grundbesitzJ = num(f.grundbesitzabgabenJaehrlich);
  const summeMonat = hausgeld + lebensvers + grundbesitzJ / 12;

  const save = () => {
    upsertProperty({
      ...prop,
      hausgeldMonatlich: hausgeld || undefined,
      grundbesitzabgabenJaehrlich: grundbesitzJ || undefined,
      lebensversicherungMonatlich: lebensvers || undefined,
    }).then(() => navigation.goBack());
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title="Laufende Kosten" onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Diese Kosten fallen jeden Monat an — auch in Leerstand-Phasen. Werden im Cashflow automatisch berücksichtigt.
          </Text>
        </View>

        <SectionLabel theme={theme}>Monatliche Kosten</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Hausgeld (€/Monat)">
            <TextField theme={theme} value={f.hausgeldMonatlich} onChangeText={set('hausgeldMonatlich')} placeholder="WEG/Hausverwaltung" keyboardType="decimal-pad" />
          </FieldRow>
          <FieldRow theme={theme} label="Lebensvers. (€/Monat)" last>
            <TextField theme={theme} value={f.lebensversicherungMonatlich} onChangeText={set('lebensversicherungMonatlich')} placeholder="optional" keyboardType="decimal-pad" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Jährliche Kosten</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Grundbesitzabgaben (€/Jahr)" last>
            <TextField theme={theme} value={f.grundbesitzabgabenJaehrlich} onChangeText={set('grundbesitzabgabenJaehrlich')} placeholder="Grundsteuer, Müll …" keyboardType="decimal-pad" />
          </FieldRow>
        </Card>
        {grundbesitzJ > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>
              ≙ {formatEuro(grundbesitzJ / 12, { decimals: 2 })} pro Monat im Cashflow
            </Text>
          </View>
        )}

        {summeMonat > 0 && (
          <>
            <SectionLabel theme={theme}>Summe</SectionLabel>
            <Card theme={theme}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Gesamt / Monat</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.expense }}>−{formatEuro(summeMonat, { decimals: 2 })}</Text>
              </View>
            </Card>
          </>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
