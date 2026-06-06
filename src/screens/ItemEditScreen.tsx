import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { SECTIONS, SectionKey } from '../data/sections';
import {
  newId, Vertrag, Posten,
  SteuerBereich, STEUER_KATEGORIEN_NICHT_SELBST, STEUER_KATEGORIEN_SELBST, STEUER_BEREICH_KURZ,
} from '../data/model';
import { TopBar, SectionLabel, Card, FieldRow, TextField, MoneyField, PrimaryButton, Pill } from '../components/UI';

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export default function ItemEditScreen() {
  const { theme, snapshot, upsertItem, upsertContract } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const section: SectionKey = route.params?.section ?? 'income';
  const editId: string | undefined = route.params?.id;
  const meta = SECTIONS[section];

  const existing: any = editId ? ((snapshot as any)[section] ?? []).find((x: any) => x.id === editId) : null;

  const [name, setName] = useState<string>(existing?.name ?? '');
  const [amount, setAmount] = useState<string>(existing && existing.amount ? String(existing.amount) : '');
  const [recurring, setRecurring] = useState<boolean>(existing ? existing.recurring !== false : true);
  const [category, setCategory] = useState<string>(
    existing?.category ?? meta.categories?.[0]?.key ?? '',
  );
  const [note, setNote] = useState<string>(existing?.note ?? '');
  // Vertrag-spezifisch
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(existing?.interval ?? 'monthly');
  const [paymentMonth, setPaymentMonth] = useState<string>(String(existing?.paymentMonth ?? 1));
  const [frist, setFrist] = useState<string>(existing?.kuendigungsfristTage != null ? String(existing.kuendigungsfristTage) : '');
  const [ende, setEnde] = useState<string>(existing?.vertragsende ?? '');
  // Steuer-Markierung
  const [steuerRelevant, setSteuerRelevant] = useState<boolean>(!!existing?.steuerRelevant);
  const [steuerBereich, setSteuerBereich] = useState<SteuerBereich>(existing?.steuerBereich ?? 'nicht_selbst');
  const [steuerKategorie, setSteuerKategorie] = useState<string>(existing?.steuerKategorie ?? 'sonstiges');

  const save = () => {
    if (!name.trim()) { Alert.alert('Name fehlt', 'Bitte einen Namen eingeben.'); return; }
    const id = editId ?? newId(section.slice(0, 3));

    if (meta.isContract) {
      const v: Vertrag = {
        id, name: name.trim(), category, amount: num(amount),
        interval,
        paymentMonth: interval === 'yearly' ? Math.min(12, Math.max(1, parseInt(paymentMonth, 10) || 1)) : undefined,
        kuendigungsfristTage: frist ? parseInt(frist, 10) : undefined,
        vertragsende: /^\d{4}-\d{2}-\d{2}$/.test(ende.trim()) ? ende.trim() : undefined,
        note: note || undefined,
        steuerRelevant: steuerRelevant || undefined,
        steuerBereich: steuerRelevant ? steuerBereich : undefined,
        steuerKategorie: steuerRelevant ? steuerKategorie : undefined,
      };
      upsertContract(v);
    } else {
      const p: Posten = {
        id, name: name.trim(),
        category: meta.categories ? category : 'sonstiges',
        amount: num(amount), note: note || undefined,
        ...(section === 'income' || section === 'invest' ? { recurring } : {}),
      };
      upsertItem(section as any, p);
    }
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={editId ? 'Bearbeiten' : `${meta.title} – neu`} onClose={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Angaben</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Name">
            <TextField theme={theme} value={name} onChangeText={setName} placeholder="z. B. Gehalt" />
          </FieldRow>
          <FieldRow theme={theme} label={meta.isContract && interval === 'yearly' ? 'Betrag / Jahr' : 'Betrag (€)'} last={!meta.categories && !meta.isContract && section !== 'invest'}>
            <MoneyField theme={theme} value={amount} onChangeText={setAmount} accessibilityLabel="Betrag in Euro" />
          </FieldRow>
          {(section === 'invest') && (
            <FieldRow theme={theme} label="Notiz" last>
              <TextField theme={theme} value={note} onChangeText={setNote} placeholder="optional" />
            </FieldRow>
          )}
        </Card>

        {meta.categories && (
          <>
            <SectionLabel theme={theme}>Kategorie</SectionLabel>
            <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {meta.categories.map(c => (
                <Pill key={c.key} theme={theme} active={category === c.key} label={c.label} color={c.color} onPress={() => setCategory(c.key)} />
              ))}
            </View>
          </>
        )}

        {(section === 'income' || section === 'invest') && (
          <>
            <SectionLabel theme={theme}>Art</SectionLabel>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, color: theme.text }}>Wiederkehrend</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                    {recurring
                      ? 'Wird automatisch in Folgemonate übertragen. Änderungen gelten ab diesem Monat.'
                      : section === 'income' ? 'Nur in diesem Monat (einmalige Einnahme).' : 'Nur in diesem Monat (spontane Investition).'}
                  </Text>
                </View>
                <Switch
                  value={recurring}
                  onValueChange={setRecurring}
                  trackColor={{ false: 'rgba(120,120,128,0.32)', true: theme.accent }}
                  thumbColor="#fff"
                />
              </View>
            </Card>
          </>
        )}

        {meta.isContract && (
          <>
            <SectionLabel theme={theme}>Intervall</SectionLabel>
            <View style={{ marginHorizontal: 16, padding: 4, backgroundColor: theme.surface, borderRadius: 14, flexDirection: 'row', gap: 4 }}>
              {(['monthly', 'yearly'] as const).map(iv => {
                const active = interval === iv;
                return (
                  <TouchableOpacity
                    key={iv}
                    onPress={() => setInterval(iv)}
                    style={{ flex: 1, height: 38, borderRadius: 11, backgroundColor: active ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: active ? theme.accentInk : theme.textMuted }}>
                      {iv === 'monthly' ? 'Monatlich' : 'Jährlich'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SectionLabel theme={theme}>Vertragsdetails</SectionLabel>
            <Card theme={theme}>
              {interval === 'yearly' && (
                <FieldRow theme={theme} label="Zahlmonat (1–12)">
                  <TextField theme={theme} value={paymentMonth} onChangeText={setPaymentMonth} placeholder="1" keyboardType="number-pad" />
                </FieldRow>
              )}
              <FieldRow theme={theme} label="Kündigungsfrist (Tage)">
                <TextField theme={theme} value={frist} onChangeText={setFrist} placeholder="z. B. 90" keyboardType="number-pad" />
              </FieldRow>
              <FieldRow theme={theme} label="Vertragsende (JJJJ-MM-TT)" last>
                <TextField theme={theme} value={ende} onChangeText={setEnde} placeholder="2026-12-31" />
              </FieldRow>
            </Card>
            <Text style={{ paddingHorizontal: 24, paddingTop: 8, fontSize: 12, color: theme.textMuted }}>
              Liegt der Kündigungsstichtag in unter 120 Tagen, wird „bald kündbar" angezeigt.
            </Text>

            <SectionLabel theme={theme}>Steuer</SectionLabel>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, color: theme.text }}>Steuerlich relevant</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                    Erscheint automatisch in der Steuer-Liste (für jeden Zahlmonat).
                  </Text>
                </View>
                <Switch
                  value={steuerRelevant}
                  onValueChange={setSteuerRelevant}
                  trackColor={{ false: 'rgba(120,120,128,0.32)', true: theme.accent }}
                  thumbColor="#fff"
                />
              </View>
            </Card>

            {steuerRelevant && (
              <>
                <SectionLabel theme={theme}>Steuer-Bereich</SectionLabel>
                <View style={{ marginHorizontal: 16, padding: 4, backgroundColor: theme.surface, borderRadius: 14, flexDirection: 'row', gap: 4 }}>
                  {(['nicht_selbst', 'selbst'] as SteuerBereich[]).map(b => {
                    const active = steuerBereich === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        onPress={() => setSteuerBereich(b)}
                        style={{ flex: 1, height: 38, borderRadius: 11, backgroundColor: active ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? theme.accentInk : theme.textMuted }}>
                          {STEUER_BEREICH_KURZ[b]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <SectionLabel theme={theme}>Steuer-Kategorie</SectionLabel>
                <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(steuerBereich === 'nicht_selbst' ? STEUER_KATEGORIEN_NICHT_SELBST : STEUER_KATEGORIEN_SELBST).map(k => (
                    <Pill key={k.key} theme={theme} active={steuerKategorie === k.key} label={k.label} onPress={() => setSteuerKategorie(k.key)} />
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
