import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { amortize, amortSchedule, formatEuro } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar, SectionLabel, Card } from '../components/UI';
import { AmortAreaChart, Legend } from '../components/Charts';

const CHART_W = Dimensions.get('window').width - 32 - 28;

function Row({ theme, l, v, c, last }: { theme: any; l: string; v: string; c?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.border }}>
      <Text style={{ fontSize: 14.5, color: theme.textMuted }}>{l}</Text>
      <Text style={{ fontSize: 14.5, fontWeight: '700', color: c ?? theme.text }}>{v}</Text>
    </View>
  );
}

export default function PropertyDetailScreen() {
  const { theme, data, deleteProperty } = useApp();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const p = data.properties.find(x => x.id === id);

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <TopBar theme={theme} title="Immobilie" onBack={() => navigation.goBack()} />
      </View>
    );
  }
  const a = amortize(p);
  const sched = amortSchedule(p);
  const tilgungProzent = p.kreditsumme > 0 ? a.bereitsGetilgt / p.kreditsumme : 0;

  const del = () => {
    Alert.alert('Löschen?', `„${p.name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { deleteProperty(p.id); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title={p.name}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('PropertyEdit', { id: p.id })} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="note" size={16} color={theme.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>Monatsrate (Annuität)</Text>
          <Text style={{ fontSize: 40, fontWeight: '700', color: theme.text, marginTop: 4 }}>{formatEuro(a.monatsrate)}</Text>
          <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 4 }}>
            davon Zins {formatEuro(a.aktuellZinsanteil, { decimals: 0 })} · Tilgung {formatEuro(a.aktuellTilgungsanteil, { decimals: 0 })}
          </Text>
        </View>

        {/* Tilgungsfortschritt */}
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, padding: 16, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: theme.textMuted }}>Getilgt {Math.round(tilgungProzent * 100)}%</Text>
            <Text style={{ fontSize: 13, color: theme.textMuted }}>{a.monateGezahlt} / {p.laufzeitMonate} Monate</Text>
          </View>
          <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(1, tilgungProzent) * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 4 }} />
          </View>
        </View>

        <SectionLabel theme={theme}>Tilgungsverlauf</SectionLabel>
        <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, padding: 14 }}>
          <AmortAreaChart theme={theme} width={CHART_W} schedule={sched} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 2 }}>
            <Text style={{ fontSize: 10, color: theme.textDim }}>Start</Text>
            <Text style={{ fontSize: 10, color: theme.textDim }}>{Math.round(p.laufzeitMonate / 12)} J</Text>
          </View>
          <Legend theme={theme} items={[
            { label: 'Restschuld', color: theme.expense },
            { label: 'Getilgt (kumuliert)', color: theme.accent },
          ]} />
        </View>

        <SectionLabel theme={theme}>Kredit</SectionLabel>
        <Card theme={theme}>
          <Row theme={theme} l="Kreditsumme" v={formatEuro(p.kreditsumme, { decimals: 0 })} />
          <Row theme={theme} l="Sollzins" v={`${p.sollzinsProzent} % p. a.`} />
          <Row theme={theme} l="Bereits getilgt" v={formatEuro(a.bereitsGetilgt, { decimals: 0 })} c={theme.income} />
          <Row theme={theme} l="Gezahlte Zinsen" v={formatEuro(a.gezahlteZinsen, { decimals: 0 })} />
          <Row theme={theme} l="Restschuld" v={formatEuro(a.restschuld, { decimals: 0 })} c={theme.expense} />
          <Row theme={theme} l="Restlaufzeit" v={`${a.restlaufzeitMonate} Monate`} last />
        </Card>

        <SectionLabel theme={theme}>Vermietung</SectionLabel>
        <Card theme={theme}>
          <Row theme={theme} l="Kaltmiete" v={formatEuro(p.kaltmiete, { decimals: 0 })} />
          <Row theme={theme} l="Warmmiete" v={formatEuro(p.warmmiete, { decimals: 0 })} />
          <Row theme={theme} l="Nebenkosten" v={formatEuro(p.nebenkosten, { decimals: 0 })} />
          <Row theme={theme} l="Brutto-Mietrendite" v={`${(a.bruttoRendite * 100).toFixed(2)} %`} />
          <Row theme={theme} l="Cashflow (Warm − NK − Rate)" v={formatEuro(a.mietCashflow, { sign: true })} c={a.mietCashflow >= 0 ? theme.income : theme.expense} />
          <Row theme={theme} l="Vermietet seit" v={p.vermietetSeit ?? '—'} last />
        </Card>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <TouchableOpacity onPress={del} style={{ height: 50, borderRadius: 16, backgroundColor: theme.expense + '1F', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.expense }}>Immobilie löschen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
