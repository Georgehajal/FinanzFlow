import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { newId, monthLabel } from '../data/model';
import { formatEuro } from '../data/calc';
import CFIcon from '../components/CFIcon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];

export default function CashScreen() {
  const { theme, snapshot, monthKey, metrics, addCash, deleteCash } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [dir, setDir] = useState<'out' | 'in'>('out');
  const [digits, setDigits] = useState('');
  const [purpose, setPurpose] = useState('');

  const handleKey = useCallback((k: string) => {
    if (k === '⌫') setDigits(d => d.slice(0, -1));
    else if (k === ',') { if (!digits.includes(',') && digits.length > 0) setDigits(d => d + ','); }
    else {
      const parts = digits.split(',');
      if (parts[1] !== undefined && parts[1].length >= 2) return;
      if (digits.replace(',', '').length >= 9) return;
      setDigits(d => d + k);
    }
  }, [digits]);

  const amount = (() => { const n = parseFloat(digits.replace(',', '.')); return isNaN(n) ? 0 : n; })();
  const disp = (() => {
    if (!digits) return '0,00';
    const [w, d] = digits.split(',');
    const whole = parseInt(w || '0', 10).toLocaleString('de-DE');
    return d !== undefined ? `${whole},${d}` : whole;
  })();
  const accent = dir === 'in' ? theme.income : theme.expense;

  const save = () => {
    if (amount <= 0) { Alert.alert('Betrag eingeben', 'Bitte einen Betrag größer als 0.'); return; }
    addCash({
      id: newId('cash'),
      name: purpose.trim() || (dir === 'in' ? 'Bargeld-Einnahme' : 'Bargeld-Ausgabe'),
      amount, direction: dir, ts: new Date().toISOString(),
    });
    setDigits('');
    setPurpose('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
          <CFIcon name="close" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>Bargeld · {monthLabel(monthKey, { short: true })}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Monats-Summen (kein laufender Kassenstand) */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>Eingenommen</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.income, marginTop: 2 }}>{formatEuro(metrics.bargeldEin, { decimals: 0 })}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 14 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>Ausgegeben</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.expense, marginTop: 2 }}>{formatEuro(metrics.bargeldAus, { decimals: 0 })}</Text>
        </View>
      </View>

      {/* Segmented */}
      <View style={{ marginHorizontal: 16, marginTop: 12, padding: 4, backgroundColor: theme.surface, borderRadius: 14, flexDirection: 'row', gap: 4 }}>
        {([{ k: 'out', label: 'Ausgabe' }, { k: 'in', label: 'Einnahme' }] as const).map(o => {
          const active = o.k === dir;
          return (
            <TouchableOpacity key={o.k} onPress={() => { setDir(o.k); setDigits(''); }}
              style={{ flex: 1, height: 38, borderRadius: 11, backgroundColor: active ? (o.k === 'in' ? theme.income : theme.surface2) : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: active ? (o.k === 'in' ? theme.accentInk : theme.text) : theme.textMuted }}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Amount */}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ fontSize: 28, color: theme.textMuted, fontWeight: '600', marginBottom: 6 }}>{dir === 'in' ? '+' : '−'}</Text>
          <Text style={{ fontSize: 58, fontWeight: '700', letterSpacing: -2, lineHeight: 64, color: accent }}>{disp.split(',')[0]}</Text>
          <Text style={{ fontSize: 28, color: theme.textMuted, fontWeight: '600', marginBottom: 6 }}>,{disp.split(',')[1] ?? '00'} €</Text>
        </View>
      </View>

      {/* Verwendungszweck / Notiz */}
      <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CFIcon name="note" size={17} color={theme.textMuted} />
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder="Wofür? z. B. Essen, Trinkgeld"
          placeholderTextColor={theme.textDim}
          style={{ flex: 1, fontSize: 14, color: theme.text, padding: 0 }}
        />
      </View>

      {/* Entry list */}
      <ScrollView style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {snapshot.cash.length === 0 ? (
          <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, paddingVertical: 16 }}>Noch keine Bargeld-Einträge diesen Monat</Text>
        ) : snapshot.cash.map(c => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: (c.direction === 'in' ? theme.income : theme.expense) + '22', alignItems: 'center', justifyContent: 'center' }}>
              <CFIcon name={(c.direction === 'in' ? 'arrowUp' : 'arrowDown') as any} size={14} color={c.direction === 'in' ? theme.income : theme.expense} stroke={2.6} />
            </View>
            <Text style={{ flex: 1, fontSize: 14, color: theme.text }}>{c.name}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.direction === 'in' ? theme.income : theme.expense }}>
              {c.direction === 'in' ? '+' : '−'}{formatEuro(c.amount, { decimals: 0 })}
            </Text>
            <TouchableOpacity onPress={() => deleteCash(c.id)} style={{ paddingLeft: 8 }}>
              <CFIcon name="close" size={15} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Numpad */}
      <View style={{ marginHorizontal: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {KEYS.map(k => (
            <TouchableOpacity key={k} onPress={() => handleKey(k)}
              style={{ width: '30%', flexGrow: 1, height: 50, borderRadius: 14, backgroundColor: k === '⌫' ? 'transparent' : theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              {k === '⌫' ? <CFIcon name="arrowLeft" size={20} color={theme.text} /> : <Text style={{ fontSize: 24, fontWeight: '500', color: theme.text }}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={save}
        style={{ marginHorizontal: 16, marginTop: 12, marginBottom: insets.bottom + 8, height: 52, borderRadius: 16, backgroundColor: accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <CFIcon name="check" size={18} color="#fff" stroke={2.6} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}
