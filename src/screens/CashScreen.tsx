import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import {
  newId, monthLabel, addMonthsKey,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, CashEntry, Posten,
} from '../data/model';
import { formatEuro } from '../data/calc';
import CFIcon from '../components/CFIcon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];

type Modus = 'bar' | 'bank';

export default function CashScreen() {
  const { theme, monthKey, settings, data, addCash, updateCash, deleteCash, upsertItem, updateSettings } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Edit-Modus: ein bestehender Cash-Eintrag wird bearbeitet
  const editCashId: string | undefined = route.params?.editCashId;
  const editMonthKey: string | undefined = route.params?.editMonthKey;
  const isEdit = !!editCashId;

  // Aktiver Monat (kann von monthKey abweichen wenn man Monatswechsel im Screen nutzt)
  const [activeMonthKey, setActiveMonthKey] = useState<string>(editMonthKey ?? monthKey);

  // Modus: gemerkt in Settings (default 'bar')
  const [modus, setModus] = useState<Modus>(settings.cashShortcutMode ?? 'bar');
  const [dir, setDir] = useState<'out' | 'in'>('out');
  const [digits, setDigits] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState<string>('sonstiges');

  // Modus persistieren bei Wechsel
  useEffect(() => {
    if (modus !== settings.cashShortcutMode) {
      updateSettings({ cashShortcutMode: modus });
    }
  }, [modus]);

  // Beim Edit: bestehenden Eintrag laden
  useEffect(() => {
    if (!isEdit) return;
    const snap = data.months[activeMonthKey];
    if (!snap) return;
    const c = snap.cash.find(x => x.id === editCashId);
    if (c) {
      setModus('bar');
      setDir(c.direction);
      setDigits(c.amount.toString().replace('.', ','));
      setPurpose(c.name);
    }
  }, [isEdit, editCashId, activeMonthKey, data]);

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

  const shiftMonthLocal = (delta: number) => {
    setActiveMonthKey(prev => addMonthsKey(prev, delta));
  };

  // Aktuelle Snapshot-Daten des aktiven Monats (für Anzeige unten + Edit)
  const activeSnap = data.months[activeMonthKey];
  const cashEintraege = activeSnap?.cash ?? [];

  const save = () => {
    if (amount <= 0) { Alert.alert('Betrag eingeben', 'Bitte einen Betrag größer als 0.'); return; }

    if (modus === 'bar') {
      const entry: CashEntry = {
        id: isEdit ? editCashId! : newId('cash'),
        name: purpose.trim() || (dir === 'in' ? 'Bargeld-Einnahme' : 'Bargeld-Ausgabe'),
        amount,
        direction: dir,
        ts: new Date().toISOString(),
      };
      if (isEdit) updateCash(entry, activeMonthKey);
      else addCash(entry, activeMonthKey);
    } else {
      // Bankgeld:
      // Einnahme → income mit recurring=false (einmalige Einnahme)
      // Ausgabe → variableExpenses
      const section = dir === 'in' ? 'income' : 'variableExpenses';
      const posten: Posten = {
        id: newId(section.slice(0, 3)),
        name: purpose.trim() || (dir === 'in' ? 'Einmalige Einnahme' : 'Variable Ausgabe'),
        amount,
        category,
        ...(dir === 'in' ? { recurring: false } : {}),
      };
      upsertItem(section, posten, activeMonthKey);
    }

    if (isEdit) {
      navigation.goBack();
    } else {
      setDigits('');
      setPurpose('');
    }
  };

  const onDeleteCashEntry = (id: string) => {
    Alert.alert('Löschen?', 'Diesen Eintrag wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteCash(id, activeMonthKey) },
    ]);
  };

  const kategorien = dir === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      {/* Top Bar */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
          <CFIcon name="close" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
          {isEdit ? 'Bargeld bearbeiten' : 'Schnell eintragen'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Modus-Schalter Bargeld / Bankgeld */}
      {!isEdit && (
        <View style={{ marginHorizontal: 16, marginTop: 10, padding: 4, backgroundColor: theme.surface, borderRadius: 14, flexDirection: 'row', gap: 4 }}>
          {([{ k: 'bar' as Modus, label: '💵 Bargeld', sub: 'cash' }, { k: 'bank' as Modus, label: '🏦 Bankgeld', sub: 'variabel' }]).map(o => {
            const active = o.k === modus;
            return (
              <TouchableOpacity key={o.k} onPress={() => setModus(o.k)}
                style={{ flex: 1, height: 44, borderRadius: 11, backgroundColor: active ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: active ? theme.accentInk : theme.textMuted }}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Monatswechsel */}
      {!isEdit && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 10 }}>
          <TouchableOpacity onPress={() => shiftMonthLocal(-1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="arrowLeft" size={15} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, minWidth: 140, textAlign: 'center' }}>{monthLabel(activeMonthKey)}</Text>
          <TouchableOpacity onPress={() => shiftMonthLocal(1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
            <CFIcon name="chevron" size={15} color={theme.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Richtung Ausgabe / Einnahme */}
      <View style={{ marginHorizontal: 16, marginTop: 10, padding: 4, backgroundColor: theme.surface, borderRadius: 14, flexDirection: 'row', gap: 4 }}>
        {([{ k: 'out' as const, label: 'Ausgabe' }, { k: 'in' as const, label: 'Einnahme' }]).map(o => {
          const active = o.k === dir;
          return (
            <TouchableOpacity key={o.k} onPress={() => { setDir(o.k); }}
              style={{ flex: 1, height: 38, borderRadius: 11, backgroundColor: active ? (o.k === 'in' ? theme.income : theme.surface2) : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: active ? (o.k === 'in' ? theme.accentInk : theme.text) : theme.textMuted }}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Amount */}
      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ fontSize: 24, color: theme.textMuted, fontWeight: '600', marginBottom: 6 }}>{dir === 'in' ? '+' : '−'}</Text>
          <Text style={{ fontSize: 50, fontWeight: '700', letterSpacing: -2, lineHeight: 56, color: accent }}>{disp.split(',')[0]}</Text>
          <Text style={{ fontSize: 24, color: theme.textMuted, fontWeight: '600', marginBottom: 6 }}>,{disp.split(',')[1] ?? '00'} €</Text>
        </View>
      </View>

      {/* Verwendungszweck */}
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 14, height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <CFIcon name="note" size={17} color={theme.textMuted} />
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder={modus === 'bar' ? 'Wofür? z. B. Essen' : 'Name (z. B. Lebensmittel REWE)'}
          placeholderTextColor={theme.textDim}
          style={{ flex: 1, fontSize: 14, color: theme.text, padding: 0 }}
        />
      </View>

      {/* Kategorie nur bei Bankgeld */}
      {modus === 'bank' && !isEdit && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {kategorien.map(c => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                backgroundColor: category === c.key ? c.color + '24' : theme.surface,
                borderWidth: 1, borderColor: category === c.key ? c.color + '66' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: category === c.key ? c.color : theme.text }}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bargeld-Liste aktuellen Monats (nur im bar-Modus) */}
      {modus === 'bar' && !isEdit && cashEintraege.length > 0 && (
        <ScrollView style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {cashEintraege.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: (c.direction === 'in' ? theme.income : theme.expense) + '22', alignItems: 'center', justifyContent: 'center' }}>
                <CFIcon name={(c.direction === 'in' ? 'arrowUp' : 'arrowDown') as any} size={13} color={c.direction === 'in' ? theme.income : theme.expense} stroke={2.6} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: theme.text }} numberOfLines={1}>{c.name}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.direction === 'in' ? theme.income : theme.expense }}>
                {c.direction === 'in' ? '+' : '−'}{formatEuro(c.amount, { decimals: 0 })}
              </Text>
              <TouchableOpacity onPress={() => onDeleteCashEntry(c.id)} style={{ paddingLeft: 6 }}>
                <CFIcon name="close" size={14} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      {(modus === 'bank' || cashEintraege.length === 0) && !isEdit && <View style={{ flex: 1 }} />}

      {/* Numpad */}
      <View style={{ marginHorizontal: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {KEYS.map(k => (
            <TouchableOpacity key={k} onPress={() => handleKey(k)}
              style={{ width: '30%', flexGrow: 1, height: 46, borderRadius: 14, backgroundColor: k === '⌫' ? 'transparent' : theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              {k === '⌫' ? <CFIcon name="arrowLeft" size={20} color={theme.text} /> : <Text style={{ fontSize: 22, fontWeight: '500', color: theme.text }}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={save}
        style={{ marginHorizontal: 16, marginTop: 10, marginBottom: insets.bottom + 8, height: 50, borderRadius: 16, backgroundColor: accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <CFIcon name="check" size={18} color="#fff" stroke={2.6} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{isEdit ? 'Speichern' : 'Hinzufügen'}</Text>
      </TouchableOpacity>
    </View>
  );
}
