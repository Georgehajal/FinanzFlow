import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { yearOverview, formatEuro } from '../data/calc';
import { yearOf } from '../data/model';
import CFIcon from '../components/CFIcon';
import { BarYearChart, Legend } from '../components/Charts';

const CHART_W = Dimensions.get('window').width - 32 - 28;

const M = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export default function YearScreen() {
  const { theme, data, monthKey } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [year, setYear] = useState<number>(yearOf(monthKey));

  const ov = useMemo(() => yearOverview(data, year), [data, year]);
  const maxAbs = Math.max(1, ...ov.months.map(m => Math.max(m.einnahmen, m.fixkosten + m.variableKosten)));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
          <CFIcon name="arrowLeft" size={18} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => setYear(y => y - 1)}><CFIcon name="arrowLeft" size={16} color={theme.text} /></TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>Jahr {year}</Text>
          <TouchableOpacity onPress={() => setYear(y => y + 1)}><CFIcon name="chevron" size={16} color={theme.text} /></TouchableOpacity>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Totals */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
          {[
            { l: 'Einnahmen', v: ov.totals.einnahmen, c: theme.income },
            { l: 'Ausgaben', v: ov.totals.fixkosten + ov.totals.variableKosten, c: theme.expense },
            { l: 'Überschuss', v: ov.totals.ueberschuss, c: theme.text },
            { l: 'Invest', v: ov.totals.invest, c: theme.purple },
          ].map(t => (
            <View key={t.l} style={{ width: '47.6%', flexGrow: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 16 }}>
              <Text style={{ fontSize: 12.5, color: theme.textMuted }}>{t.l} {year}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: t.c, marginTop: 4 }}>{formatEuro(t.v, { decimals: 0 })}</Text>
            </View>
          ))}
        </View>

        {/* Jahresverlauf-Diagramm */}
        <Text style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 8, fontSize: 12, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Verlauf
        </Text>
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, padding: 14 }}>
          <BarYearChart
            theme={theme}
            width={CHART_W}
            months={ov.months.map(m => ({ einnahmen: m.einnahmen, ausgaben: m.fixkosten + m.variableKosten, ueberschuss: m.ueberschuss }))}
          />
          <Legend theme={theme} items={[
            { label: 'Einnahmen', color: theme.income },
            { label: 'Ausgaben', color: theme.expense },
            { label: 'Überschuss', color: theme.text },
          ]} />
        </View>

        {/* Monthly table */}
        <Text style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 8, fontSize: 12, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Monate
        </Text>
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' }}>
          {ov.months.map((m, i) => {
            const ausg = m.fixkosten + m.variableKosten;
            return (
              <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i === 11 ? 0 : 0.5, borderBottomColor: theme.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, width: 38 }}>{M[i]}</Text>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <View style={{ height: 5, backgroundColor: theme.income, borderRadius: 3, width: `${(m.einnahmen / maxAbs) * 100}%`, minWidth: m.einnahmen > 0 ? 4 : 0 }} />
                    <View style={{ height: 5, backgroundColor: theme.expense, borderRadius: 3, width: `${(ausg / maxAbs) * 100}%`, minWidth: ausg > 0 ? 4 : 0, marginTop: 3 }} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: m.ueberschuss < 0 ? theme.expense : theme.text, width: 78, textAlign: 'right' }}>
                    {formatEuro(m.ueberschuss, { decimals: 0, sign: true })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingLeft: 50 }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Ein {formatEuro(m.einnahmen, { decimals: 0 })}</Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted }}>Aus {formatEuro(ausg, { decimals: 0 })}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={{ paddingHorizontal: 24, paddingTop: 10, fontSize: 11.5, color: theme.textMuted }}>
          Jährliche Verträge erscheinen im jeweiligen Zahlmonat. Monate ohne eigene Eingabe werden aus den fixen Posten projiziert.
        </Text>
      </ScrollView>
    </View>
  );
}
