import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { STEUER_BEREICH_LABEL, STEUER_BEREICH_KURZ, SteuerBereich } from '../data/model';
import { formatEuro, steuerSumme, steuerVerfuegbareJahre } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar } from '../components/UI';

export default function SteuerHomeScreen() {
  const { theme, data } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const jahre = steuerVerfuegbareJahre(data);
  const [jahr, setJahr] = useState<number>(jahre[0] ?? new Date().getFullYear());

  const goto = (bereich: SteuerBereich) => navigation.navigate('SteuerList', { bereich, jahr });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title="Steuer" onBack={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Werbungskosten & Betriebsausgaben sammeln, mit Belegen — eigener PDF-Export pro Bereich für deinen Steuerberater.
          </Text>
        </View>

        {/* Jahres-Filter */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
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
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: jahr === y ? theme.accent : theme.text }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bereiche */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {(['nicht_selbst', 'selbst'] as SteuerBereich[]).map(b => {
            const s = steuerSumme(data, jahr, b);
            return (
              <TouchableOpacity
                key={b}
                onPress={() => goto(b)}
                style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 18 }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <CFIcon name={b === 'nicht_selbst' ? 'note' : 'wallet'} size={20} color={theme.accent} stroke={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{STEUER_BEREICH_KURZ[b]}</Text>
                    <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>{STEUER_BEREICH_LABEL[b].split('(')[1]?.replace(')', '') || ''}</Text>
                  </View>
                  <CFIcon name="chevron" size={16} color={theme.textDim} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                  <View>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>POSTEN</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 2 }}>{s.anzahl}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>SUMME {jahr}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accent, marginTop: 2 }}>{formatEuro(s.summe, { decimals: 0 })}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
