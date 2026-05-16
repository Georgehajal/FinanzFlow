import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { SECTIONS, MANAGE_ORDER } from '../data/sections';
import { monthLabel } from '../data/model';
import { formatEuro, contractMonthAmount } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { MonthSwitcher } from '../components/UI';

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
    // Bargeld zählt mit (Ausgaben → variable Kosten, Einnahmen → variable Einnahmen)
    if (key === 'variableExpenses' || key === 'variableIncome') {
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
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 4 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', letterSpacing: -0.6, color: theme.text }}>Verwalten</Text>
        </View>
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
          {MANAGE_ORDER.map(key => {
            const s = SECTIONS[key];
            const { count, total } = sumOf(key);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => navigation.navigate('List', { section: key })}
                style={{ backgroundColor: theme.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: s.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <CFIcon name={s.icon as any} size={20} color={s.color} stroke={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '700', color: theme.text }}>{s.title}</Text>
                  <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>
                    {count} Posten{s.carriedForward ? ' · wird übertragen' : ' · monatlich neu'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{formatEuro(total, { decimals: 0 })}</Text>
                  <CFIcon name="chevron" size={14} color={theme.textDim} stroke={2.2} />
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => navigation.navigate('PropertyList')}
            style={{ backgroundColor: theme.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.orange + '22', alignItems: 'center', justifyContent: 'center' }}>
              <CFIcon name="home" size={20} color={theme.orange} stroke={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: theme.text }}>Immobilien</Text>
              <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>Separater Bereich · eigener PDF-Export</Text>
            </View>
            <CFIcon name="chevron" size={14} color={theme.textDim} stroke={2.2} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
