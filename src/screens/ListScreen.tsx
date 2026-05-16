import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { SECTIONS, SectionKey } from '../data/sections';
import { monthLabel, categoryDef, Vertrag } from '../data/model';
import { formatEuro, contractMonthAmount, contractCancelInfo } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar, EmptyState, MonthSwitcher } from '../components/UI';

export default function ListScreen() {
  const { theme, snapshot, monthKey, shiftMonth, deleteItem, deleteContract, deleteInvest, deleteCash } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const section: SectionKey = route.params?.section ?? 'income';
  const meta = SECTIONS[section];

  const items: any[] = (snapshot as any)[section] ?? [];

  // Bargeld zusätzlich hier anzeigen (Überblick): Ausgaben unter „Variable
  // Kosten", Einnahmen unter „Variable Einnahmen". Bearbeitung im Bargeld-Screen.
  const cashHere = section === 'variableExpenses' ? 'out'
    : section === 'variableIncome' ? 'in' : null;
  const cashEntries = cashHere ? snapshot.cash.filter(c => c.direction === cashHere) : [];
  const cashTotal = cashEntries.reduce((a, c) => a + (c.amount || 0), 0);

  const remove = (id: string, name: string) => {
    Alert.alert('Löschen?', `„${name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive', onPress: () => {
          if (meta.isContract) deleteContract(id);
          else if (section === 'invest') deleteInvest(id);
          else deleteItem(section as any, id);
        },
      },
    ]);
  };

  const removeCash = (id: string, name: string) => {
    Alert.alert('Löschen?', `Bargeld „${name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteCash(id) },
    ]);
  };

  const openEdit = (id?: string) => navigation.navigate('ItemEdit', { section, id });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title={meta.title}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={() => openEdit()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>
            {meta.carriedForward ? 'wird automatisch übertragen' : 'startet jeden Monat neu'}
          </Text>
        </View>

        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <EmptyState theme={theme} text="Noch keine Posten — oben + tippen" />
          ) : items.map((it, i) => {
            const isLast = i === items.length - 1;
            let sub = '';
            let amount = it.amount || 0;
            let warn: string | null = null;
            if (meta.isContract) {
              const v = it as Vertrag;
              amount = contractMonthAmount(v, monthKey);
              sub = v.interval === 'yearly'
                ? `Jährlich · Zahlmonat ${v.paymentMonth ?? 1}`
                : 'Monatlich';
              const ci = contractCancelInfo(v);
              if (ci.baldKuendbar) warn = `Bald kündbar (${ci.tageBisKuendigung} Tage)`;
              else if (ci.abgelaufen) warn = 'Kündigungsfrist verpasst';
            } else if (meta.categories) {
              const def = categoryDef(meta.direction === 'income' ? 'income' : 'expense', it.category);
              sub = def.label;
            }
            return (
              <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.border }}>
                <TouchableOpacity
                  onPress={() => openEdit(it.id)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 14 }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <CFIcon name={meta.icon as any} size={16} color={meta.color} stroke={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{it.name}</Text>
                    {sub ? <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>{sub}</Text> : null}
                    {warn ? <Text style={{ fontSize: 12, color: theme.expense, marginTop: 1, fontWeight: '600' }}>{warn}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{formatEuro(amount, { decimals: 0 })}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(it.id, it.name)} style={{ padding: 14 }}>
                  <CFIcon name="close" size={16} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {cashHere && (
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Bargeld {cashHere === 'out' ? '(Ausgaben)' : '(Einnahmen)'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{formatEuro(cashTotal, { decimals: 0 })}</Text>
            </View>
            <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' }}>
              {cashEntries.length === 0 ? (
                <EmptyState theme={theme} text="Kein Bargeld diesen Monat" />
              ) : cashEntries.map((c, i) => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: i === cashEntries.length - 1 ? 0 : 0.5, borderBottomColor: theme.border }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Cash')}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 14 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.mint + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <CFIcon name="coin" size={16} color={theme.mint} stroke={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{c.name}</Text>
                      <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>Bargeld</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{formatEuro(c.amount, { decimals: 0 })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeCash(c.id, c.name)} style={{ padding: 14 }}>
                    <CFIcon name="close" size={16} color={theme.textDim} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
