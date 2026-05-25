import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { newId, Konto, KONTO_TYP_LABEL, KontoTyp } from '../data/model';
import { TopBar, SectionLabel, Card, FieldRow, TextField, PrimaryButton, Pill } from '../components/UI';

const TYPEN: KontoTyp[] = ['giro', 'tagesgeld', 'bausparen', 'depot', 'krypto', 'bargeld', 'sonstiges'];

export default function KontoEditScreen() {
  const { theme, data, upsertKonto, deleteKonto } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editId: string | undefined = route.params?.id;
  const ex = editId ? data.konten?.find(k => k.id === editId) : null;

  const [name, setName] = useState(ex?.name ?? '');
  const [typ, setTyp] = useState<KontoTyp>(ex?.typ ?? 'giro');
  const [notiz, setNotiz] = useState(ex?.notiz ?? '');

  const save = () => {
    if (!name.trim()) { Alert.alert('Name fehlt', 'Bitte einen Namen eingeben.'); return; }
    upsertKonto({
      id: ex?.id ?? newId('kto'),
      name: name.trim(),
      typ,
      notiz: notiz.trim() || undefined,
    });
    navigation.goBack();
  };

  const del = () => {
    if (!ex) { navigation.goBack(); return; }
    Alert.alert('Konto löschen?', `„${ex.name}" und alle eingetragenen Stände werden entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { deleteKonto(ex.id); navigation.goBack(); } },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={ex ? 'Konto bearbeiten' : 'Neues Konto'} onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Konto</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Name">
            <TextField theme={theme} value={name} onChangeText={setName} placeholder="z. B. Sparkasse Giro" />
          </FieldRow>
          <FieldRow theme={theme} label="Notiz" last>
            <TextField theme={theme} value={notiz} onChangeText={setNotiz} placeholder="optional" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Typ</SectionLabel>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TYPEN.map(t => (
            <Pill key={t} theme={theme} active={typ === t} label={KONTO_TYP_LABEL[t]} onPress={() => setTyp(t)} />
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8, gap: 12 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
          {ex && (
            <TouchableOpacity onPress={del} style={{ height: 50, borderRadius: 16, backgroundColor: theme.expense + '1F', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.expense }}>Konto löschen</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
