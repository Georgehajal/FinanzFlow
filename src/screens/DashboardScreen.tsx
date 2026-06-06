import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { formatEuro, expenseByCategory, monthsSeries, vermoegenFor } from '../data/calc';
import { monthLabel, categoryDef, addMonthsKey } from '../data/model';
import CFIcon from '../components/CFIcon';
import {
  HeroCard, ActionTile, IconButton, MoneyAmount, MonthSwitcher,
  space, type, weight, radius, touch, shadow,
} from '../components/UI';
import { DonutChart, TrendLineChart, Legend } from '../components/Charts';

const TREND_W = Dimensions.get('window').width - space.md * 2 - space.md;

function Delta({ theme, value, invert }: { theme: any; value: number | undefined; invert?: boolean }) {
  if (value === undefined || Math.round(value) === 0) {
    return <Text style={{ fontSize: type.caption, color: theme.textDim, marginTop: 2 }}>±0 vs. Vormonat</Text>;
  }
  const good = invert ? value < 0 : value > 0;
  const col = good ? theme.income : theme.expense;
  const arrow = value > 0 ? '↑' : '↓';
  return (
    <Text
      accessibilityLabel={`Veränderung ${value > 0 ? 'Plus' : 'Minus'} ${formatEuro(Math.abs(value), { decimals: 0 })} gegenüber Vormonat`}
      style={{ fontSize: type.caption, color: col, marginTop: 2, fontWeight: weight.semibold }}
    >
      {arrow} {formatEuro(Math.abs(value), { decimals: 0 })} vs. Vormonat
    </Text>
  );
}

export default function DashboardScreen() {
  const { theme, monthKey, snapshot, metrics, compare, shiftMonth, data } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const ueberschussDir: 'in' | 'out' | 'neutral' =
    metrics.ueberschuss > 0 ? 'in' : metrics.ueberschuss < 0 ? 'out' : 'neutral';

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
    { label: 'Einnahmen',       val: metrics.einnahmen,      icon: 'arrowUp',  col: theme.income,  delta: compare.delta?.einnahmen,      a11y: 'in' as const },
    { label: 'Fixkosten',       val: metrics.fixkosten,      icon: 'sync',     col: theme.blue,    delta: compare.delta?.fixkosten,      invert: true, a11y: 'out' as const },
    { label: 'Variable Kosten', val: metrics.variableKosten, icon: 'bag',      col: theme.orange,  delta: compare.delta?.variableKosten, invert: true, a11y: 'out' as const },
    { label: 'Invest (Sparen)', val: metrics.invest,         icon: 'trend',    col: theme.purple,  delta: compare.delta?.invest,         a11y: 'neutral' as const },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            accessibilityRole="header"
            accessibilityLabel="Finanzflow"
            style={{ width: touch.min, height: touch.min, borderRadius: touch.min / 2, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: theme.accentInk, fontWeight: weight.bold, fontSize: type.small }}>FF</Text>
          </View>
          <IconButton
            theme={theme}
            icon="sliders"
            onPress={() => navigation.navigate('More')}
            accessibilityLabel="Einstellungen öffnen"
          />
        </View>

        {/* Month switcher (44pt Targets, im UI-Component) */}
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />

        {/* Hero: Überschuss als prominenteste Aktion */}
        <View style={{ paddingHorizontal: space.md, paddingTop: space.md }}>
          <HeroCard theme={theme} accent={ueberschussDir === 'out' ? theme.expense : theme.accent}>
            <Text style={{ fontSize: type.caption, color: theme.textMuted, fontWeight: weight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Überschuss · {monthLabel(monthKey, { short: true })}
            </Text>
            <View style={{ marginTop: space.xs }}>
              <MoneyAmount
                theme={theme}
                amount={metrics.ueberschuss}
                direction={ueberschussDir}
                size="display"
                showSymbol={false}
              />
            </View>
            {/* Sub-Info: nur EIN Wert sichtbar — Sparquote als Untertitel */}
            {metrics.einnahmen > 0 && metrics.invest > 0 && (
              <Text style={{ fontSize: type.small, color: theme.textMuted, marginTop: space.xs }}>
                Davon {Math.round(metrics.sparquote * 100)} % gespart · Frei: {formatEuro(metrics.freierUeberschuss, { decimals: 0 })}
              </Text>
            )}
            {metrics.einnahmen > 0 && metrics.invest === 0 && (
              <Text style={{ fontSize: type.small, color: theme.textMuted, marginTop: space.xs }}>
                Frei verfügbar: {formatEuro(metrics.freierUeberschuss, { decimals: 0 })}
              </Text>
            )}
          </HeroCard>
        </View>

        {/* Vermögen-Tile direkt darunter — wenn Konten existieren */}
        <VermoegenTile />

        {/* Metric tiles 2x2 — symbolisiert + delta */}
        <View style={{ paddingHorizontal: space.md, paddingTop: space.md, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {tiles.map(t => (
            <View
              key={t.label}
              accessibilityLabel={`${t.label}: ${formatEuro(t.val, { decimals: 0 })}`}
              style={{ width: '48%', flexGrow: 1, backgroundColor: theme.surface, borderRadius: radius.lg, padding: space.md }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.col + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <CFIcon name={t.icon as any} size={14} color={t.col} stroke={2.4} />
                </View>
                <Text style={{ fontSize: type.small, color: theme.textMuted }}>{t.label}</Text>
              </View>
              <Text style={{ marginTop: space.xs, fontSize: type.title, fontWeight: weight.bold, letterSpacing: -0.5, color: theme.text }}>
                {formatEuro(t.val, { decimals: 0 })}
              </Text>
              {compare.previous ? <Delta theme={theme} value={t.delta} invert={t.invert} /> : null}
            </View>
          ))}
        </View>

        {/* Quick actions — 2x2 statt 1x4 (besseres Touch-Target) */}
        <View style={{ paddingHorizontal: space.md, paddingTop: space.md, gap: space.xs }}>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <ActionTile theme={theme} icon="coin" label="Bargeld" color={theme.mint}
              onPress={() => navigation.navigate('Cash')}
              accessibilityLabel="Bargeld eintragen" />
            <ActionTile theme={theme} icon="chart" label="Jahr" color={theme.blue}
              onPress={() => navigation.navigate('Year')}
              accessibilityLabel="Jahresübersicht öffnen" />
          </View>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <ActionTile theme={theme} icon="home" label="Immobilien" color={theme.orange}
              onPress={() => navigation.navigate('PropertyList')}
              accessibilityLabel="Immobilien öffnen" />
            <ActionTile theme={theme} icon="note" label="Steuer" color={theme.accent}
              onPress={() => navigation.navigate('SteuerHome')}
              accessibilityLabel="Steuer öffnen" />
          </View>
        </View>

        {/* Category breakdown */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text accessibilityRole="header" style={{ fontSize: type.bodyLg, fontWeight: weight.bold, color: theme.text }}>Ausgaben nach Kategorie</Text>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Zu Verwalten wechseln"
            onPress={() => navigation.navigate('Manage')}
          >
            <Text style={{ fontSize: type.small, color: theme.accent, fontWeight: weight.semibold }}>Verwalten</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginHorizontal: space.md, backgroundColor: theme.surface, borderRadius: radius.lg, padding: space.md }}>
          {donut.length === 0 ? (
            <View style={{ padding: space.md, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: type.small }}>
                Noch keine Ausgaben in {monthLabel(monthKey, { short: true })}
              </Text>
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

        {/* Trend */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs }}>
          <Text accessibilityRole="header" style={{ fontSize: type.bodyLg, fontWeight: weight.bold, color: theme.text }}>Überschuss-Trend</Text>
          <Text style={{ fontSize: type.caption, color: theme.textMuted, marginTop: 2 }}>Letzte 12 Monate</Text>
        </View>
        <View style={{ marginHorizontal: space.md, backgroundColor: theme.surface, borderRadius: radius.lg, padding: space.md }}>
          <TrendLineChart
            theme={theme}
            width={TREND_W}
            color={theme.accent}
            points={trend.map(p => ({ label: p.label, value: p.ueberschuss }))}
            fmt={v => formatEuro(v, { decimals: 0, sign: true })}
          />
          <View style={{ height: 1, backgroundColor: theme.border, marginVertical: space.sm }} />
          <TrendLineChart
            theme={theme}
            width={TREND_W}
            color={theme.purple}
            points={trend.map(p => ({ label: p.label, value: Math.round(p.sparquote * 100) }))}
            fmt={v => `${Math.round(v)} % Sparquote`}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function VermoegenTile() {
  const { theme, data, monthKey } = useApp();
  const navigation = useNavigation<any>();
  const verm = vermoegenFor(data, monthKey);
  const konten = (data.konten ?? []).filter(k => !k.archiviert);
  if (konten.length === 0) return null;
  const prevVerm = vermoegenFor(data, addMonthsKey(monthKey, -1)).gesamt;
  const delta = verm.gesamt - prevVerm;
  const deltaDir: 'in' | 'out' | 'neutral' = delta > 0 ? 'in' : delta < 0 ? 'out' : 'neutral';

  return (
    <View style={{ paddingHorizontal: space.md, paddingTop: space.sm }}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Konten')}
        accessibilityRole="button"
        accessibilityLabel={`Vermögensübersicht öffnen. Gesamtvermögen ${formatEuro(verm.gesamt, { decimals: 0 })}`}
        style={{
          backgroundColor: theme.surface, borderRadius: radius.lg,
          padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md,
        }}
      >
        <View style={{ width: touch.min, height: touch.min, borderRadius: radius.md, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
          <CFIcon name="wallet" size={20} color={theme.accent} stroke={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.caption, color: theme.textMuted, fontWeight: weight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Gesamtvermögen
          </Text>
          <Text style={{ fontSize: type.title, fontWeight: weight.bold, color: theme.text, marginTop: 2 }}>
            {formatEuro(verm.gesamt, { decimals: 0 })}
          </Text>
          {prevVerm > 0 && delta !== 0 && (
            <Text style={{ fontSize: type.caption, color: deltaDir === 'in' ? theme.income : theme.expense, marginTop: 2, fontWeight: weight.semibold }}>
              {delta > 0 ? '↑' : '↓'} {formatEuro(Math.abs(delta), { decimals: 0 })} vs. Vormonat
            </Text>
          )}
        </View>
        <CFIcon name="chevron" size={16} color={theme.textDim} />
      </TouchableOpacity>
    </View>
  );
}
