import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { SECTIONS, SectionKey } from '../data/sections';
import { monthLabel, categoryDef, Vertrag } from '../data/model';
import { formatEuro, contractMonthAmount, contractCancelInfo } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar, EmptyState, MonthSwitcher, MoneyAmount, IconButton, space, type, weight, radius, touch } from '../components/UI';

export default function ListScreen() {
  const { theme, snapshot, monthKey, shiftMonth, deleteItem, deleteContract, deleteCash } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const section: SectionKey = route.params?.section ?? 'income';
  const meta = SECTIONS[section];

  const items: any[] = (snapshot as any)[section] ?? [];

  // Bargeld zusätzlich hier anzeigen (Überblick): Ausgaben unter „Variable Kosten",
  // Einnahmen unter „Einnahmen". Bearbeitung im Bargeld-Screen.
  const cashHere = section === 'variableExpenses' ? 'out'
    : section === 'income' ? 'in' : null;
  const cashEntries = cashHere ? snapshot.cash.filter(c => c.direction === cashHere) : [];
  const cashTotal = cashEntries.reduce((a, c) => a + (c.amount || 0), 0);

  const remove = (id: string, name: string) => {
    Alert.alert('Löschen?', `„${name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive', onPress: () => {
          if (meta.isContract) deleteContract(id);
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
          <IconButton
            theme={theme}
            icon="plus"
            onPress={() => openEdit()}
            accessibilityLabel={`Neuen Eintrag zu ${meta.title} hinzufügen`}
            bg={theme.accent}
            color={theme.accentInk}
          />
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>
            {meta.carriedForward ? 'wird automatisch übertragen' : 'startet jeden Monat neu'}
          </Text>
        </View>

        <View style={{ marginHorizontal: space.md, backgroundColor: theme.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <EmptyState
              theme={theme}
              icon={meta.icon}
              text={`Noch keine ${meta.title}`}
              ctaLabel={`+ Ersten Eintrag hinzufügen`}
              onCtaPress={() => openEdit()}
            />
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
            const dir = meta.direction === 'income' ? 'in' : meta.direction === 'expense' ? 'out' : 'neutral';
            return (
              <View
                key={it.id}
                style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: theme.border, minHeight: touch.min }}
              >
                <TouchableOpacity
                  onPress={() => openEdit(it.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.name}, ${formatEuro(amount, { decimals: 0 })}${sub ? `, ${sub}` : ''}${warn ? `, Warnung: ${warn}` : ''}. Tippen zum Bearbeiten.`}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingLeft: space.sm + 2, minHeight: touch.min }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: radius.md - 2, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <CFIcon name={meta.icon as any} size={16} color={meta.color} stroke={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: type.body, fontWeight: weight.semibold, color: theme.text }}>{it.name}</Text>
                    {sub ? <Text style={{ fontSize: type.caption, color: theme.textMuted, marginTop: 1 }}>{sub}</Text> : null}
                    {warn ? (
                      <Text style={{ fontSize: type.caption, color: theme.expense, marginTop: 1, fontWeight: weight.semibold }}>
                        ⚠ {warn}
                      </Text>
                    ) : null}
                  </View>
                  <MoneyAmount
                    theme={theme}
                    amount={amount}
                    direction={dir}
                    size="body"
                    decimals={0}
                    showSymbol={false}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(it.id, it.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.name} löschen`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}
                >
                  <CFIcon name="close" size={16} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {cashHere && (
          <>
            <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                accessibilityRole="header"
                style={{ fontSize: type.caption, color: theme.textMuted, fontWeight: weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Bargeld {cashHere === 'out' ? '(Ausgaben)' : '(Einnahmen)'}
              </Text>
              <MoneyAmount theme={theme} amount={cashTotal} direction={cashHere === 'in' ? 'in' : 'out'} size="small" decimals={0} showSymbol={false} />
            </View>
            <View style={{ marginHorizontal: space.md, backgroundColor: theme.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
              {cashEntries.length === 0 ? (
                <EmptyState theme={theme} text="Kein Bargeld diesen Monat" />
              ) : cashEntries.map((c, i) => (
                <View
                  key={c.id}
                  style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: i === cashEntries.length - 1 ? 0 : 0.5, borderBottomColor: theme.border, minHeight: touch.min }}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Cash', { editCashId: c.id, editMonthKey: monthKey })}
                    accessibilityRole="button"
                    accessibilityLabel={`Bargeld ${c.name}, ${formatEuro(c.amount, { decimals: 0 })}. Tippen zum Bearbeiten.`}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingLeft: space.sm + 2 }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: radius.md - 2, backgroundColor: theme.mint + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <CFIcon name="coin" size={16} color={theme.mint} stroke={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: type.body, fontWeight: weight.semibold, color: theme.text }}>{c.name}</Text>
                      <Text style={{ fontSize: type.caption, color: theme.textMuted, marginTop: 1 }}>Bargeld</Text>
                    </View>
                    <MoneyAmount theme={theme} amount={c.amount} direction={c.direction === 'in' ? 'in' : 'out'} size="body" decimals={0} showSymbol={false} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeCash(c.id, c.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Bargeld ${c.name} löschen`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}
                  >
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
