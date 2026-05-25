import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { useApp } from '../data/AppContext';
import {
  newId, SteuerPosten, SteuerBereich,
  STEUER_KATEGORIEN_NICHT_SELBST, STEUER_KATEGORIEN_SELBST, STEUER_BEREICH_KURZ,
} from '../data/model';
import { parseDateInput, isoToDE } from '../data/dateUtils';
import { pickFromGallery, takePhoto, deleteAppFoto, ALBUM_STEUER } from '../data/fotoUtils';
import { TopBar, SectionLabel, Card, FieldRow, TextField, DateField, PrimaryButton, Pill } from '../components/UI';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

export default function SteuerEditScreen() {
  const { theme, data, upsertSteuerPosten } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bereich: SteuerBereich = route.params?.bereich ?? 'nicht_selbst';
  const editId: string | undefined = route.params?.id;
  const ex = editId ? (data.steuerposten ?? []).find(s => s.id === editId) : null;

  const kategorien = bereich === 'nicht_selbst' ? STEUER_KATEGORIEN_NICHT_SELBST : STEUER_KATEGORIEN_SELBST;

  const [kategorie, setKategorie] = useState<string>(ex?.kategorie ?? kategorien[0].key);
  const [f, setF] = useState({
    datum: ex?.datum ? isoToDE(ex.datum) : '',
    bezugsjahr: ex?.bezugsjahr ? String(ex.bezugsjahr) : '',
    betrag: ex?.betrag ? String(ex.betrag) : '',
    beschreibung: ex?.beschreibung ?? '',
    notiz: ex?.notiz ?? '',
  });
  const [fotoUri, setFotoUri] = useState<string | undefined>(ex?.fotoUri);
  const [fotoVollbild, setFotoVollbild] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const tmpId = ex?.id ?? `sp_temp_${Date.now()}`;
  const onPickGallery = async () => {
    const uri = await pickFromGallery(tmpId, ALBUM_STEUER);
    if (uri) setFotoUri(uri);
  };
  const onTakePhoto = async () => {
    const uri = await takePhoto(tmpId, ALBUM_STEUER);
    if (uri) setFotoUri(uri);
  };
  const onRemoveFoto = () => {
    Alert.alert('Foto entfernen?', 'Das Foto wird aus der App entfernt (in der Galerie bleibt es als Backup).', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: async () => {
        if (fotoUri) await deleteAppFoto(fotoUri);
        setFotoUri(undefined);
      }},
    ]);
  };
  const onShareFoto = async () => {
    if (!fotoUri) return;
    try {
      const can = await Sharing.isAvailableAsync();
      if (!can) { Alert.alert('Teilen', 'Auf diesem Gerät nicht verfügbar.'); return; }
      await Sharing.shareAsync(fotoUri, { mimeType: 'image/jpeg', dialogTitle: 'Beleg teilen' });
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht geteilt werden.');
    }
  };

  const save = () => {
    const iso = parseDateInput(f.datum);
    if (!iso) { Alert.alert('Datum', 'Bitte gültiges Datum (TT.MM.JJJJ) eingeben.'); return; }
    const betrag = num(f.betrag);
    if (betrag <= 0) { Alert.alert('Betrag', 'Bitte einen Betrag eingeben.'); return; }
    if (!f.beschreibung.trim()) { Alert.alert('Beschreibung', 'Bitte eine Beschreibung eingeben (z. B. „Abendessen mit Kollegen").'); return; }
    const sp: SteuerPosten = {
      id: ex?.id ?? newId('sp'),
      datum: iso,
      bezugsjahr: f.bezugsjahr ? parseInt(f.bezugsjahr, 10) : parseInt(iso.slice(0, 4), 10),
      bereich,
      kategorie,
      betrag,
      beschreibung: f.beschreibung.trim(),
      fotoUri,
      notiz: f.notiz.trim() || undefined,
    };
    upsertSteuerPosten(sp).then(() => navigation.goBack());
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={ex ? 'Steuerposten bearbeiten' : `Neuer Posten · ${STEUER_BEREICH_KURZ[bereich]}`} onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Kategorie</SectionLabel>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {kategorien.map(k => (
            <Pill key={k.key} theme={theme} active={kategorie === k.key} label={k.label} onPress={() => setKategorie(k.key)} />
          ))}
        </View>

        <SectionLabel theme={theme}>Details</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Datum (Zahlung)">
            <DateField theme={theme} value={f.datum} onChangeText={set('datum')} />
          </FieldRow>
          <FieldRow theme={theme} label="Bezugsjahr">
            <TextField theme={theme} value={f.bezugsjahr} onChangeText={set('bezugsjahr')} keyboardType="number-pad" placeholder="auto aus Datum" />
          </FieldRow>
          <FieldRow theme={theme} label="Betrag (€)">
            <TextField theme={theme} value={f.betrag} onChangeText={set('betrag')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Beschreibung">
            <TextField theme={theme} value={f.beschreibung} onChangeText={set('beschreibung')} placeholder={kategorie === 'bewirtung' ? 'z. B. Abendessen Team-Meeting' : 'z. B. Laptop für Homeoffice'} />
          </FieldRow>
          <FieldRow theme={theme} label="Notiz" last>
            <TextField theme={theme} value={f.notiz} onChangeText={set('notiz')} placeholder="optional" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Beleg (Foto)</SectionLabel>
        <Card theme={theme}>
          {fotoUri ? (
            <View style={{ padding: 12 }}>
              <TouchableOpacity onPress={() => setFotoVollbild(true)} activeOpacity={0.8}>
                <Image source={{ uri: fotoUri }} style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: theme.surface2 }} resizeMode="cover" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity onPress={onShareFoto} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.surface2, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>📤 Teilen</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onRemoveFoto} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.expense + '22', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.expense }}>Entfernen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ padding: 12, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={onTakePhoto} style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: theme.surface2, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>📷 Fotografieren</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onPickGallery} style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: theme.surface2, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>🖼 Aus Galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
        {fotoUri && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
            <Text style={{ fontSize: 11.5, color: theme.textMuted }}>
              Foto wird in App + Galerie-Album „Finanzflow-Steuer" gespeichert. iCloud/Google Photos Backup läuft automatisch wenn aktiv.
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 8 }}>
          <PrimaryButton theme={theme} label="Speichern" icon="check" onPress={save} />
        </View>
      </ScrollView>

      <Modal visible={fotoVollbild} transparent animationType="fade" onRequestClose={() => setFotoVollbild(false)}>
        <TouchableOpacity onPress={() => setFotoVollbild(false)} activeOpacity={1} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}>
          {fotoUri && <Image source={{ uri: fotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
