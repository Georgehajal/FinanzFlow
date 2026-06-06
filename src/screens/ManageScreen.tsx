import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { SECTIONS, SectionKey, MANAGE_ORDER } from '../data/sections';
import { monthLabel } from '../data/model';
import { formatEuro, contractMonthAmount } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { MonthSwitcher, MoneyAmount, space, type, weight, radius, touch } from '../components/UI';

export default function ManageScreen() {
  const { theme, snapshot, monthKey, shiftMonth } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const sumOf = (key: string): { count: number; total: number } => {
    if (key === 'contracts') {
      const arr = snapshot.contracts;
      return { count: arr.length, total: arr.reduce((a, v) => a + contractMonthAmount(v, monthKey), 0) };
    }
    const arr = (snapshot as any)[key] as { amount: number }[];
    let count = arr.length;
    let total = arr.reduce((a, x) => a + (x.amount || 0), 0);
    if (key === 'variableExpenses' || key === 'income') {
      const wantOut = key === 'variableExpenses';
      const cash = snapshot.cash.filter(c => (c.direction === 'out') === wantOut);
      count += cash.length;
      total += cash.reduce((a, c) => a + (c.amount || 0), 0);
    }
    return { count, total };
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxs }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: type.heading, fontWeight: weight.bold, letterSpacing: -0.6, color: theme.text }}
          >
            Verwalten
          </Text>
        </View>
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />

        {/* Sektionsgruppe: Monatliche Posten */}
        <View style={{ paddingHorizontal: space.md, paddingTop: space.md, gap: space.xs }}>
          {MANAGE_ORDER.map(key => {
            const s = SECTIONS[key];
            const { count, total } = sumOf(key);
            const dir = s.direction === 'income' ? 'in' : s.direction === 'expense' ? 'out' : 'neutral';
            return (
              <ManageCard
                key={key}
                theme={theme}
                icon={s.icon}
                color={s.color}
                title={s.title}
                subtitle={`${count} Posten${s.carriedForward ? ' · wird übertragen' : ' · monatlich neu'}`}
                onPress={() => navigation.navigate('List', { section: key })}
                rightAmount={total}
                amountDirection={dir as any}
                accessibilityLabel={`${s.title}: ${count} Posten, Summe ${formatEuro(total, { decimals: 0 })}`}
              />
            );
          })}
        </View>

        {/* Sektionsgruppe: Eigene Bereiche */}
        <View style={{ paddingHorizontal: space.md, paddingTop: space.md, gap: space.xs }}>
          <ManageCard
            theme={theme}
            icon="wallet"
            color={theme.accent}
            title="Konten & Vermögen"
            subtitle="Girokonto, Tagesgeld, Depot · monatlicher Stand"
            onPress={() => navigation.navigate('Konten')}
            accessibilityLabel="Konten und Vermögen öffnen"
          />
          <ManageCard
            theme={theme}
            icon="coin"
            color={theme.mint}
            title="Bargeld"
            subtitle={`${snapshot.cash.length} Einträge · ${formatEuro(snapshot.cash.reduce((a, c) => a + c.amount, 0), { decimals: 0 })}`}
            onPress={() => navigation.navigate('BargeldList')}
            accessibilityLabel="Bargeld-Liste öffnen"
          />
          <ManageCard
            theme={theme}
            icon="home"
            color={theme.orange}
            title="Immobilien"
            subtitle="Separater Bereich · eigener PDF-Export"
            onPress={() => navigation.navigate('PropertyList')}
            accessibilityLabel="Immobilien öffnen"
          />
          <ManageCard
            theme={theme}
            icon="note"
            color={theme.accent}
            title="Steuer"
            subtitle="Werbungskosten & Betriebsausgaben · separate PDFs für Steuerberater"
            onPress={() => navigation.navigate('SteuerHome')}
            accessibilityLabel="Steuer-Bereich öffnen"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ManageCard({
  theme, icon, color, title, subtitle, onPress, rightAmount, amountDirection, accessibilityLabel,
}: {
  theme: any;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  rightAmount?: number;
  amountDirection?: 'in' | 'out' | 'neutral';
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        padding: space.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        minHeight: 64,
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <CFIcon name={icon as any} size={20} color={color} stroke={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, fontWeight: weight.bold, color: theme.text }}>{title}</Text>
        <Text style={{ fontSize: type.caption, color: theme.textMuted, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
        {rightAmount !== undefined && (
          <MoneyAmount theme={theme} amount={rightAmount} direction={amountDirection ?? 'neutral'} size="small" decimals={0} showSymbol={false} />
        )}
        <CFIcon name="chevron" size={14} color={theme.textDim} stroke={2.2} />
      </View>
    </TouchableOpacity>
  );
}
