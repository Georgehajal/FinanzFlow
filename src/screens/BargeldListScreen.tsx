import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { monthLabel } from '../data/model';
import { formatEuro } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar, EmptyState, MonthSwitcher } from '../components/UI';

export default function BargeldListScreen() {
  const { theme, snapshot, monthKey, shiftMonth, deleteCash, metrics } = useApp();
  const navigation = useNavigation<any>();

  const eintraege = snapshot.cash;

  const remove = (id: string, name: string) => {
    Alert.alert('Löschen?', `Bargeld „${name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteCash(id) },
    ]);
  };

  const editEntry = (id: string) => navigation.navigate('Cash', { editCashId: id, editMonthKey: monthKey });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title="Bargeld"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('Cash')}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />

        {/* Summen */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14 }}>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>Eingenommen</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.income, marginTop: 2 }}>{formatEuro(metrics.bargeldEin, { decimals: 0 })}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14 }}>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>Ausgegeben</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.expense, marginTop: 2 }}>{formatEuro(metrics.bargeldAus, { decimals: 0 })}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Einträge</Text>
        </View>

        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' }}>
          {eintraege.length === 0 ? (
            <EmptyState theme={theme} text="Kein Bargeld diesen Monat" />
          ) : eintraege.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: i === eintraege.length - 1 ? 0 : 0.5, borderBottomColor: theme.border }}>
              <TouchableOpacity
                onPress={() => editEntry(c.id)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 14 }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (c.direction === 'in' ? theme.income : theme.expense) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <CFIcon name={(c.direction === 'in' ? 'arrowUp' : 'arrowDown') as any} size={15} color={c.direction === 'in' ? theme.income : theme.expense} stroke={2.6} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{c.name}</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>
                    {c.direction === 'in' ? 'Einnahme' : 'Ausgabe'} · Bar
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.direction === 'in' ? theme.income : theme.expense }}>
                  {c.direction === 'in' ? '+' : '−'}{formatEuro(c.amount, { decimals: 0 })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(c.id, c.name)} style={{ padding: 14 }}>
                <CFIcon name="close" size={16} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
