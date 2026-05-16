import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { formatEuro, euroParts, expenseByCategory, monthsSeries } from '../data/calc';
import { monthLabel, categoryDef } from '../data/model';
import CFIcon from '../components/CFIcon';
import { DonutChart, TrendLineChart, Legend } from '../components/Charts';

const TREND_W = Dimensions.get('window').width - 32 - 28;

function Delta({ theme, value, invert }: { theme: any; value: number | undefined; invert?: boolean }) {
  if (value === undefined || Math.round(value) === 0) {
    return <Text style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>±0 ggü. Vormonat</Text>;
  }
  const good = invert ? value < 0 : value > 0;
  const col = good ? theme.income : theme.expense;
  return (
    <Text style={{ fontSize: 11, color: col, marginTop: 2, fontWeight: '600' }}>
      {value > 0 ? '+' : '−'}{formatEuro(Math.abs(value), { decimals: 0 })} ggü. Vormonat
    </Text>
  );
}

export default function DashboardScreen() {
  const { theme, monthKey, snapshot, metrics, compare, shiftMonth, data } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { whole, dec } = euroParts(metrics.ueberschuss);
  const d = compare.delta;

  const cats = useMemo(() => {
    const map = expenseByCategory(snapshot);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [snapshot]);

  const donut = useMemo(() => cats.map(([k, amt]) => {
    const def = k === 'bargeld' ? { label: 'Bargeld', color: theme.mint } : categoryDef('expense', k);
    return { label: def.label, value: amt, color: def.color };
  }), [cats, theme]);
  const catTotal = donut.reduce((a, d) => a + d.value, 0);

  const trend = useMemo(
    () => (data ? monthsSeries(data, monthKey, 12) : []),
    [data, monthKey],
  );

  const tiles = [
    { label: 'Einnahmen',      val: metrics.einnahmen,      icon: 'arrowUp',   col: theme.income,  delta: d?.einnahmen },
    { label: 'Fixkosten',      val: metrics.fixkosten,      icon: 'sync',      col: theme.blue,    delta: d?.fixkosten,      invert: true },
    { label: 'Variable Kosten', val: metrics.variableKosten, icon: 'bag',       col: theme.orange,  delta: d?.variableKosten, invert: true },
    { label: 'Invest (Sparen)', val: metrics.invest,         icon: 'trend',     col: theme.purple,  delta: d?.invest },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.accentInk, fontWeight: '700', fontSize: 13 }}>FF</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('More')}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <CFIcon name="sliders" size={17} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Month switcher */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="arrowLeft" size={16} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, minWidth: 150, textAlign: 'center' }}>
            {monthLabel(monthKey)}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="chevron" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Überschuss hero */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>Überschuss diesen Monat</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 4 }}>
            <Text style={{ fontSize: 26, color: theme.textMuted, fontWeight: '600', marginBottom: 8 }}>
              {metrics.ueberschuss < 0 ? '−' : ''}
            </Text>
            <Text style={{ fontSize: 52, fontWeight: '700', letterSpacing: -1.5, lineHeight: 58, color: metrics.ueberschuss < 0 ? theme.expense : theme.text }}>{whole}</Text>
            <Text style={{ fontSize: 26, color: theme.textMuted, fontWeight: '600', marginBottom: 8 }}>,{dec} €</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ backgroundColor: theme.purple + '24', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: theme.purple, fontSize: 12, fontWeight: '600' }}>
                Sparquote {Math.round(metrics.sparquote * 100)}%
              </Text>
            </View>
            <View style={{ backgroundColor: theme.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600' }}>
                Frei: {formatEuro(metrics.freierUeberschuss, { decimals: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Metric tiles */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tiles.map(t => (
            <View key={t.label} style={{ width: '47.6%', flexGrow: 1, backgroundColor: theme.surface, borderRadius: 20, padding: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.col + '22', alignItems: 'center', justifyContent: 'center' }}>
                <CFIcon name={t.icon as any} size={14} color={t.col} stroke={2.4} />
              </View>
              <Text style={{ marginTop: 12, fontSize: 21, fontWeight: '700', letterSpacing: -0.5, color: theme.text }}>
                {formatEuro(t.val, { decimals: 0 })}
              </Text>
              <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>{t.label}</Text>
              {compare.previous ? <Delta theme={theme} value={t.delta} invert={t.invert} /> : null}
            </View>
          ))}
        </View>

        {/* Category breakdown */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>Ausgaben nach Kategorie</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Manage')}>
            <Text style={{ fontSize: 13, color: theme.accent, fontWeight: '600' }}>Verwalten</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 20, padding: 16 }}>
          {donut.length === 0 ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 14 }}>Noch keine Ausgaben in {monthLabel(monthKey, { short: true })}</Text>
            </View>
          ) : (
            <>
              <View style={{ alignItems: 'center' }}>
                <DonutChart
                  theme={theme}
                  data={donut}
                  centerLabel="Ausgaben"
                  centerValue={formatEuro(catTotal, { decimals: 0 })}
                />
              </View>
              <Legend
                theme={theme}
                items={donut.map(d => ({ label: d.label, color: d.color, value: formatEuro(d.value, { decimals: 0 }) }))}
              />
            </>
          )}
        </View>

        {/* Überschuss-Trend */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>Überschuss-Trend</Text>
          <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>Letzte 12 Monate</Text>
        </View>
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 20, padding: 14 }}>
          <TrendLineChart
            theme={theme}
            width={TREND_W}
            color={theme.accent}
            points={trend.map(p => ({ label: p.label, value: p.ueberschuss }))}
            fmt={v => formatEuro(v, { decimals: 0, sign: true })}
          />
          <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 12 }} />
          <TrendLineChart
            theme={theme}
            width={TREND_W}
            color={theme.purple}
            points={trend.map(p => ({ label: p.label, value: Math.round(p.sparquote * 100) }))}
            fmt={v => `${Math.round(v)} % Sparquote`}
          />
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Cash')}
            style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 }}
          >
            <CFIcon name="coin" size={22} color={theme.mint} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Bargeld</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Year')}
            style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 }}
          >
            <CFIcon name="chart" size={22} color={theme.blue} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Jahr</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('PropertyList')}
            style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 }}
          >
            <CFIcon name="home" size={22} color={theme.orange} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Immobilien</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
