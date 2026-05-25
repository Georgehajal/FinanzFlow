import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { SteuerBereich, STEUER_BEREICH_KURZ } from '../data/model';
import { formatEuro, steuerJahresansicht, steuerVerfuegbareJahre } from '../data/calc';
import { isoToDE } from '../data/dateUtils';
import CFIcon from '../components/CFIcon';
import { TopBar, EmptyState } from '../components/UI';

export default function SteuerListScreen() {
  const { theme, data, deleteSteuerPosten } = useApp();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bereich: SteuerBereich = route.params?.bereich ?? 'nicht_selbst';
  const jahreInitial: number = route.params?.jahr ?? new Date().getFullYear();
  const [jahr, setJahr] = useState<number>(jahreInitial);
  const jahre = steuerVerfuegbareJahre(data);

  const eintraege = steuerJahresansicht(data, jahr, bereich);
  const summe = eintraege.reduce((a, e) => a + e.betrag, 0);

  const addNew = () => navigation.navigate('SteuerEdit', { bereich });
  const editPosten = (id: string) => navigation.navigate('SteuerEdit', { bereich, id });
  const openContract = (contractId: string) => Alert.alert('Vertrag', 'Dieser Eintrag stammt aus einem wiederkehrenden Vertrag. Zum Bearbeiten den Vertrag in Verwalten öffnen.');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title={STEUER_BEREICH_KURZ[bereich]}
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate('SteuerExport', { bereich, jahr })} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              <CFIcon name="pdf" size={17} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={addNew} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
              <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Jahres-Filter */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {jahre.map(y => (
              <TouchableOpacity
                key={y}
                onPress={() => setJahr(y)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: jahr === y ? theme.accent + '24' : theme.surface,
                  borderWidth: 1, borderColor: jahr === y ? theme.accent + '66' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: jahr === y ? theme.accent : theme.text }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summe */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ backgroundColor: theme.accent + '11', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.accent + '33', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 11.5, color: theme.accent, fontWeight: '700', letterSpacing: 0.4 }}>SUMME {jahr}</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: theme.accent, marginTop: 2 }}>{formatEuro(summe, { decimals: 0 })}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11.5, color: theme.textMuted }}>POSTEN</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 2 }}>{eintraege.length}</Text>
            </View>
          </View>
        </View>

        {/* Liste */}
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {eintraege.length === 0 ? (
            <View style={{ backgroundColor: theme.surface, borderRadius: 16 }}>
              <EmptyState theme={theme} text={'Noch keine Einträge — oben „+" tippen'} />
            </View>
          ) : eintraege.map(e => (
            <TouchableOpacity
              key={e.id}
              onPress={() => e.isContract ? openContract(e.contractId!) : editPosten(e.id)}
              onLongPress={() => {
                if (e.isContract) return;
                Alert.alert('Löschen?', `„${e.beschreibung}" wirklich entfernen?`, [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Löschen', style: 'destructive', onPress: () => deleteSteuerPosten(e.id) },
                ]);
              }}
              style={{ backgroundColor: theme.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              activeOpacity={0.7}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                <CFIcon name={e.isContract ? 'sync' : 'note'} size={16} color={theme.accent} stroke={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.text, flex: 1 }} numberOfLines={1}>{e.beschreibung}</Text>
                  {e.isContract && (
                    <View style={{ backgroundColor: theme.surface2 ?? theme.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted }}>🔁 VERTRAG</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {isoToDE(e.datum)} · {e.kategorieLabel}{e.fotoUri ? ' · 📎' : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                {formatEuro(e.betrag, { decimals: 0 })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
