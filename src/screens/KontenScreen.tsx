import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import {
  newId, Konto, KONTO_TYP_LABEL, KONTO_TYP_ICON, monthLabel,
} from '../data/model';
import { formatEuro, vermoegenFor, kontoStandExact } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar, EmptyState, MonthSwitcher } from '../components/UI';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n; };

export default function KontenScreen() {
  const { theme, data, monthKey, shiftMonth, upsertKontoStand } = useApp();
  const navigation = useNavigation<any>();

  const konten = (data.konten ?? []).filter(k => !k.archiviert);
  const verm = vermoegenFor(data, monthKey);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar
        theme={theme}
        title="Konten & Vermögen"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => navigation.navigate('KontoEdit')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="plus" size={18} color={theme.accentInk} stroke={2.6} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <MonthSwitcher theme={theme} label={monthLabel(monthKey)} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />

        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>Gesamtvermögen</Text>
          <Text style={{ fontSize: 36, fontWeight: '700', color: theme.accent, marginTop: 4 }}>{formatEuro(verm.gesamt, { decimals: 0 })}</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
            {konten.length} {konten.length === 1 ? 'Konto' : 'Konten'}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {konten.length === 0 ? (
            <View style={{ backgroundColor: theme.surface, borderRadius: 16 }}>
              <EmptyState
                theme={theme}
                icon="wallet"
                text="Noch kein Konto angelegt"
                ctaLabel="+ Erstes Konto anlegen"
                onCtaPress={() => navigation.navigate('KontoEdit')}
              />
            </View>
          ) : verm.details.map(({ konto, stand, isFallback }) => (
            <View key={konto.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 14 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('KontoEdit', { id: konto.id })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                activeOpacity={0.7}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <CFIcon name={KONTO_TYP_ICON[konto.typ] as any} size={20} color={theme.accent} stroke={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{konto.name}</Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                    {KONTO_TYP_LABEL[konto.typ]}{isFallback && stand > 0 ? ' · Letzter Wert' : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{formatEuro(stand, { decimals: 0 })}</Text>
                <CFIcon name="chevron" size={14} color={theme.textDim} />
              </TouchableOpacity>
              <StandEingabe theme={theme} konto={konto} monthKey={monthKey} data={data} upsertKontoStand={upsertKontoStand} />
            </View>
          ))}
        </View>

        {konten.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <Text style={{ fontSize: 11.5, color: theme.textMuted }}>
              Stand wird pro Monat eingetragen. Bei nicht ausgefüllten Monaten wird der letzte bekannte Wert übernommen.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StandEingabe({ theme, konto, monthKey, data, upsertKontoStand }: any) {
  const ex = kontoStandExact(data, konto.id, monthKey);
  const [val, setVal] = useState<string>(ex ? String(ex.betrag) : '');
  const [editing, setEditing] = useState(false);

  const save = () => {
    const betrag = num(val);
    upsertKontoStand({ id: ex?.id ?? newId('ks'), kontoId: konto.id, monthKey, betrag });
    setEditing(false);
  };

  if (!editing) {
    return (
      <TouchableOpacity onPress={() => setEditing(true)} style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: theme.textMuted }}>
          {ex ? `Stand ${monthLabel(monthKey, { short: true })} eingetragen` : `+ Stand für ${monthLabel(monthKey, { short: true })} eintragen`}
        </Text>
        <CFIcon name="note" size={14} color={theme.textDim} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, backgroundColor: theme.surface2 ?? theme.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}>
        <TextInput
          value={val}
          onChangeText={setVal}
          placeholder="Stand in €"
          placeholderTextColor={theme.textDim}
          keyboardType="decimal-pad"
          autoFocus
          style={{ fontSize: 15, color: theme.text }}
        />
      </View>
      <TouchableOpacity onPress={save} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.accent }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.accentInk }}>Speichern</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setEditing(false)} style={{ paddingHorizontal: 8 }}>
        <CFIcon name="close" size={14} color={theme.textDim} />
      </TouchableOpacity>
    </View>
  );
}
