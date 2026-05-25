import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, KeyboardAvoidingView, Platform, Switch, Image, Modal } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { newId, Sonderbuchung, SonderbuchungKategorie } from '../data/model';
import { formatEuro, SB_KATEGORIE_LABEL, sonderbuchungSaldoProJahr, steuerSaldoProJahr } from '../data/calc';
import { parseDateInput, isoToDE } from '../data/dateUtils';
import { pickFromGallery, takePhoto, deleteAppFoto } from '../data/fotoUtils';
import { TopBar, SectionLabel, Card, FieldRow, TextField, DateField, PrimaryButton, EmptyState, Pill } from '../components/UI';
import CFIcon from '../components/CFIcon';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

const KATEGORIEN_EINNAHME: SonderbuchungKategorie[] = ['hausgeldErstattung', 'nebenkostenMieterNach', 'sonstigeEinnahme'];
const KATEGORIEN_AUSGABE: SonderbuchungKategorie[] = ['hausgeldNachzahlung', 'nebenkostenMieterErst', 'reparatur', 'renovierung', 'anwalt', 'sonstigeAusgabe'];

export default function SonderbuchungScreen() {
  const { theme, data, deleteSonderbuchung } = useApp();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const propId: string = route.params?.propId;
  const editId: string | undefined = route.params?.sbId;

  const prop = data.properties.find(p => p.id === propId);
  const liste = (prop?.sonderbuchungen ?? []).slice().sort((a, b) => a.datum > b.datum ? -1 : 1);
  const ex = editId ? liste.find(s => s.id === editId) : null;

  if (editId !== undefined || route.params?.create) {
    return <SonderbuchungEdit propId={propId} ex={ex} />;
  }

  const saldo = sonderbuchungSaldoProJahr(prop!);
  const stSaldo = steuerSaldoProJahr(prop!);
  const jahre = Object.keys(saldo).sort().reverse();
  const steuerJahre = Object.keys(stSaldo).sort().reverse();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title="Sonderbuchungen"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('Sonderbuchung', { propId, create: true })} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Nebenkostenabrechnungen, Reparaturen, Anwaltskosten u. ä. — alles was nicht regelmäßig anfällt.
          </Text>
        </View>

        {jahre.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 12 }}>
              <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600', marginBottom: 6, letterSpacing: 0.4 }}>SALDO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {jahre.map(y => (
                  <View key={y}>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{y}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: saldo[Number(y)] >= 0 ? theme.income : theme.expense, marginTop: 2 }}>
                      {formatEuro(saldo[Number(y)], { decimals: 0, sign: true })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
        {steuerJahre.length > 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ backgroundColor: theme.accent + '11', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.accent + '33' }}>
              <Text style={{ fontSize: 11, color: theme.accent, fontWeight: '700', marginBottom: 6, letterSpacing: 0.4 }}>💰 STEUERLICH ABSETZBAR</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {steuerJahre.map(y => (
                  <View key={y}>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{y}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.accent, marginTop: 2 }}>
                      {formatEuro(stSaldo[Number(y)], { decimals: 0, sign: true })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {liste.length === 0 ? (
            <View style={{ backgroundColor: theme.surface, borderRadius: 16 }}>
              <EmptyState theme={theme} text="Noch keine Sonderbuchungen" />
            </View>
          ) : liste.map(sb => (
            <TouchableOpacity
              key={sb.id}
              onPress={() => navigation.navigate('Sonderbuchung', { propId, sbId: sb.id })}
              onLongPress={() => Alert.alert('Löschen?', `${SB_KATEGORIE_LABEL[sb.kategorie]} vom ${isoToDE(sb.datum)} entfernen?`, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => deleteSonderbuchung(propId, sb.id) },
              ])}
              style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              activeOpacity={0.7}
            >
              <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: (sb.typ === 'einnahme' ? theme.income : theme.expense) + '22', alignItems: 'center', justifyContent: 'center' }}>
                <CFIcon name={sb.typ === 'einnahme' ? 'plus' : 'close'} size={16} color={sb.typ === 'einnahme' ? theme.income : theme.expense} stroke={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.text, flex: 1 }} numberOfLines={1}>{SB_KATEGORIE_LABEL[sb.kategorie]}</Text>
                  {sb.steuerlichAbsetzbar && (
                    <View style={{ backgroundColor: theme.accent + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.accent }}>💰 STEUER</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {isoToDE(sb.datum)}{sb.bezugsjahr ? ` · Bezugsjahr ${sb.bezugsjahr}` : ''}{sb.fotoUri ? ' · 📎' : ''}{sb.notiz ? ` · ${sb.notiz}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: sb.typ === 'einnahme' ? theme.income : theme.expense }}>
                {sb.typ === 'einnahme' ? '+' : '−'}{formatEuro(sb.betrag, { decimals: 0 })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SonderbuchungEdit({ propId, ex }: { propId: string; ex: Sonderbuchung | null | undefined }) {
  const { theme, upsertSonderbuchung } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [typ, setTyp] = useState<'einnahme' | 'ausgabe'>(ex?.typ ?? 'ausgabe');
  const [kategorie, setKategorie] = useState<SonderbuchungKategorie>(ex?.kategorie ?? 'reparatur');
  const [f, setF] = useState({
    datum: ex?.datum ? isoToDE(ex.datum) : '',
    bezugsjahr: ex?.bezugsjahr ? String(ex.bezugsjahr) : '',
    betrag: ex?.betrag ? String(ex.betrag) : '',
    notiz: ex?.notiz ?? '',
  });
  const [absetzbar, setAbsetzbar] = useState<boolean>(ex?.steuerlichAbsetzbar ?? false);
  const [fotoUri, setFotoUri] = useState<string | undefined>(ex?.fotoUri);
  const [fotoVollbild, setFotoVollbild] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const tmpId = ex?.id ?? `sb_temp_${Date.now()}`;
  const onPickGallery = async () => {
    const uri = await pickFromGallery(tmpId);
    if (uri) setFotoUri(uri);
  };
  const onTakePhoto = async () => {
    const uri = await takePhoto(tmpId);
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
    } catch (e) {
      Alert.alert('Fehler', 'Foto konnte nicht geteilt werden.');
    }
  };

  const kategorien = typ === 'einnahme' ? KATEGORIEN_EINNAHME : KATEGORIEN_AUSGABE;
  // Bei Typ-Wechsel Kategorie sicherstellen
  React.useEffect(() => {
    if (!kategorien.includes(kategorie)) setKategorie(kategorien[0]);
  }, [typ]);

  const save = () => {
    const iso = parseDateInput(f.datum);
    if (!iso) { Alert.alert('Datum', 'Bitte gültiges Datum (TT.MM.JJJJ) eingeben.'); return; }
    const betrag = num(f.betrag);
    if (betrag <= 0) { Alert.alert('Betrag', 'Bitte einen Betrag eingeben.'); return; }
    const sb: Sonderbuchung = {
      id: ex?.id ?? newId('sb'),
      datum: iso,
      bezugsjahr: f.bezugsjahr ? parseInt(f.bezugsjahr, 10) : undefined,
      typ,
      kategorie,
      betrag,
      notiz: f.notiz.trim() || undefined,
      steuerlichAbsetzbar: absetzbar || undefined,
      fotoUri: fotoUri,
    };
    upsertSonderbuchung(propId, sb).then(() => navigation.goBack());
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={ex ? 'Sonderbuchung bearbeiten' : 'Neue Sonderbuchung'} onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <SectionLabel theme={theme}>Typ</SectionLabel>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>
          <Pill theme={theme} active={typ === 'einnahme'} label="Einnahme" color={theme.income} onPress={() => setTyp('einnahme')} />
          <Pill theme={theme} active={typ === 'ausgabe'} label="Ausgabe" color={theme.expense} onPress={() => setTyp('ausgabe')} />
        </View>

        <SectionLabel theme={theme}>Kategorie</SectionLabel>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {kategorien.map(k => (
            <Pill key={k} theme={theme} active={kategorie === k} label={SB_KATEGORIE_LABEL[k]} onPress={() => setKategorie(k)} />
          ))}
        </View>

        <SectionLabel theme={theme}>Details</SectionLabel>
        <Card theme={theme}>
          <FieldRow theme={theme} label="Datum (Zahlung)">
            <DateField theme={theme} value={f.datum} onChangeText={set('datum')} />
          </FieldRow>
          {/* Bezugsjahr nur bei Nebenkosten-Abrechnungen (für welches Jahr gilt die Abrechnung?) */}
          {(['hausgeldNachzahlung', 'hausgeldErstattung', 'nebenkostenMieterNach', 'nebenkostenMieterErst'] as string[]).includes(kategorie) && (
            <FieldRow theme={theme} label="Abrechnungsjahr">
              <TextField theme={theme} value={f.bezugsjahr} onChangeText={set('bezugsjahr')} keyboardType="number-pad" placeholder="z. B. 2023" />
            </FieldRow>
          )}
          <FieldRow theme={theme} label="Betrag (€)">
            <TextField theme={theme} value={f.betrag} onChangeText={set('betrag')} keyboardType="decimal-pad" placeholder="0" />
          </FieldRow>
          <FieldRow theme={theme} label="Notiz" last>
            <TextField theme={theme} value={f.notiz} onChangeText={set('notiz')} placeholder="optional" />
          </FieldRow>
        </Card>

        <SectionLabel theme={theme}>Steuer</SectionLabel>
        <Card theme={theme}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: theme.text }}>Steuerlich absetzbar</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Werbungskosten für Steuererklärung (Anlage V)</Text>
            </View>
            <Switch
              value={absetzbar}
              onValueChange={setAbsetzbar}
              trackColor={{ false: theme.surface2, true: theme.accent + '88' }}
              thumbColor={absetzbar ? theme.accent : theme.textDim}
            />
          </View>
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
        {!fotoUri ? null : (
          <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
            <Text style={{ fontSize: 11.5, color: theme.textMuted }}>
              Foto wird in App + Galerie-Album „Finanzflow-Belege" gespeichert. iCloud/Google Photos Backup läuft automatisch wenn aktiv.
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
