import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { propertyTotals, formatEuro } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar, EmptyState } from '../components/UI';

export default function PropertyListScreen() {
  const { theme, data } = useApp();
  const navigation = useNavigation<any>();
  const props = data.properties;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title="Immobilien"
        onBack={() => navigation.goBack()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate('PropertyExport')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              <CFIcon name="pdf" size={17} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('PropertyEdit', {})} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
              <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>Separater Bereich — fließt nicht ins Monats-Dashboard ein.</Text>
        </View>

        {props.length === 0 ? (
          <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18 }}>
            <EmptyState
              theme={theme}
              icon="home"
              text="Noch keine Immobilie angelegt"
              ctaLabel="+ Erste Immobilie anlegen"
              onCtaPress={() => navigation.navigate('PropertyEdit', {})}
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {props.map(p => {
              const t = propertyTotals(p);
              const nPlans = (p.kreditplaene ?? []).length;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => navigation.navigate('PropertyDetail', { id: p.id })}
                  style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 18 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.orange + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <CFIcon name="home" size={20} color={theme.orange} stroke={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{p.name}</Text>
                      <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>
                        {nPlans} {nPlans === 1 ? 'Vertrag' : 'Verträge'} · Rate {formatEuro(t.monatsrateGesamt, { decimals: 0 })}
                      </Text>
                    </View>
                    <CFIcon name="chevron" size={16} color={theme.textDim} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                    <Stat theme={theme} l="Getilgt" v={formatEuro(t.gezahlteTilgungGesamt, { decimals: 0 })} />
                    <Stat theme={theme} l="Restschuld" v={formatEuro(t.restschuldGesamt, { decimals: 0 })} c={theme.expense} />
                    <Stat theme={theme} l="Cashflow" v={formatEuro(t.mietCashflow, { decimals: 0, sign: true })} c={t.mietCashflow >= 0 ? theme.income : theme.expense} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ theme, l, v, c }: { theme: any; l: string; v: string; c?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 11, color: theme.textMuted }}>{l}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: c ?? theme.text, marginTop: 2 }}>{v}</Text>
    </View>
  );
}
