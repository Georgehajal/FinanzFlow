import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '../data/AppContext';
import { formatEuro, computeMetrics, contractMonthAmount, yearOverview } from '../data/calc';
import { monthLabel, categoryDef, yearOf } from '../data/model';
import CFIcon from '../components/CFIcon';
import { TopBar } from '../components/UI';

const esc = (s: string) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export default function ExportScreen() {
  const { theme, data, monthKey, snapshot, metrics } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [generating, setGenerating] = useState(false);
  const [scope, setScope] = useState<'month' | 'year'>('month');

  const now = new Date();

  const rows = (title: string, items: { name: string; amount: number; extra?: string }[]) => {
    if (!items.length) return '';
    const body = items.map(it =>
      `<tr><td>${esc(it.name)}</td><td>${esc(it.extra ?? '')}</td><td style="text-align:right">${formatEuro(it.amount)}</td></tr>`).join('');
    return `<h2>${esc(title)}</h2><table><thead><tr><th>Posten</th><th>Detail</th><th style="text-align:right">Betrag</th></tr></thead><tbody>${body}</tbody></table>`;
  };

  const buildHtml = () => {
    const label = scope === 'month' ? monthLabel(monthKey) : `Jahr ${yearOf(monthKey)}`;
    let summary = '';
    let body = '';

    if (scope === 'month') {
      const m = metrics;
      summary = `
        <div class="tile"><div class="l">Einnahmen</div><div class="v income">${formatEuro(m.einnahmen)}</div></div>
        <div class="tile"><div class="l">Fixkosten</div><div class="v">${formatEuro(m.fixkosten)}</div></div>
        <div class="tile"><div class="l">Variable Kosten</div><div class="v">${formatEuro(m.variableKosten)}</div></div>
        <div class="tile"><div class="l">Überschuss</div><div class="v ${m.ueberschuss < 0 ? 'expense' : 'income'}">${formatEuro(m.ueberschuss)}</div></div>
        <div class="tile"><div class="l">Invest (Sparen)</div><div class="v">${formatEuro(m.invest)}</div></div>
        <div class="tile"><div class="l">Sparquote</div><div class="v">${Math.round(m.sparquote * 100)} %</div></div>`;
      body =
        rows('Einnahmen', snapshot.income.map(p => ({ name: p.name + (p.recurring === false ? ' (einmalig)' : ''), amount: p.amount, extra: categoryDef('income', p.category).label }))) +
        rows('Fixkosten & Verträge', snapshot.contracts.map(v => ({ name: v.name, amount: contractMonthAmount(v, monthKey), extra: v.interval === 'yearly' ? `jährl. (Monat ${v.paymentMonth ?? 1})` : 'monatl.' }))) +
        rows('Variable Kosten', snapshot.variableExpenses.map(p => ({ name: p.name, amount: p.amount, extra: categoryDef('expense', p.category).label }))) +
        rows('Invest (Sparen)', snapshot.invest.map(p => ({ name: p.name + (p.recurring === false ? ' (spontan)' : ''), amount: p.amount }))) +
        rows('Bargeld', snapshot.cash.map(c => ({ name: c.name, amount: c.amount, extra: c.direction === 'in' ? 'Einnahme' : 'Ausgabe' })));
    } else {
      const ov = yearOverview(data, yearOf(monthKey));
      summary = `
        <div class="tile"><div class="l">Einnahmen</div><div class="v income">${formatEuro(ov.totals.einnahmen)}</div></div>
        <div class="tile"><div class="l">Ausgaben</div><div class="v expense">${formatEuro(ov.totals.fixkosten + ov.totals.variableKosten)}</div></div>
        <div class="tile"><div class="l">Überschuss</div><div class="v">${formatEuro(ov.totals.ueberschuss)}</div></div>
        <div class="tile"><div class="l">Invest</div><div class="v">${formatEuro(ov.totals.invest)}</div></div>`;
      const mb = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      body = `<h2>Monate</h2><table><thead><tr><th>Monat</th><th style="text-align:right">Einnahmen</th><th style="text-align:right">Ausgaben</th><th style="text-align:right">Überschuss</th></tr></thead><tbody>` +
        ov.months.map((m, i) => `<tr><td>${mb[i]}</td><td style="text-align:right">${formatEuro(m.einnahmen)}</td><td style="text-align:right">${formatEuro(m.fixkosten + m.variableKosten)}</td><td style="text-align:right">${formatEuro(m.ueberschuss)}</td></tr>`).join('') +
        `</tbody></table>`;
    }

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>
      body{font-family:-apple-system,Arial,sans-serif;color:#111;padding:32px;max-width:820px;margin:0 auto}
      h1{font-size:26px;margin-bottom:2px}.sub{color:#666;font-size:13px;margin-bottom:20px}
      .grid{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px}
      .tile{flex:1;min-width:140px;border:1px solid #eee;border-radius:12px;padding:14px}
      .l{font-size:12px;color:#666}.v{font-size:20px;font-weight:700;margin-top:4px}
      .income{color:#2E9E44}.expense{color:#E5484D}
      h2{font-size:15px;margin:22px 0 8px}table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:8px 10px;background:#f5f5f5}td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
      .ft{margin-top:36px;font-size:11px;color:#999;text-align:center}</style></head><body>
      <div style="display:flex;justify-content:space-between"><div><h1>Finanzflow</h1><div class="sub">Finanzbericht · ${esc(label)}</div></div>
      <div style="text-align:right;font-size:12px;color:#999">${now.toLocaleDateString('de-DE')}</div></div>
      <div class="grid">${summary}</div>${body}
      <div class="ft">Finanzflow · ${now.getFullYear()} · ohne Immobilien (separater Export)</div></body></html>`;
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(), base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Finanzflow Bericht' });
    } catch {
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title="PDF-Export" onClose={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>Gesamtbericht ohne Immobilien (die haben einen eigenen Export).</Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 16, padding: 4, backgroundColor: theme.surface, borderRadius: 14, flexDirection: 'row', gap: 4 }}>
          {([{ k: 'month', l: monthLabel(monthKey) }, { k: 'year', l: `Jahr ${yearOf(monthKey)}` }] as const).map(o => {
            const active = scope === o.k;
            return (
              <TouchableOpacity key={o.k} onPress={() => setScope(o.k)}
                style={{ flex: 1, height: 40, borderRadius: 11, backgroundColor: active ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: active ? theme.accentInk : theme.textMuted }}>{o.l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 48, paddingTop: 28, alignItems: 'center' }}>
          <View style={{ width: 190, aspectRatio: 0.71, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12, transform: [{ rotate: '-2deg' }] }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#111' }}>Finanzflow</Text>
            <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{scope === 'month' ? monthLabel(monthKey) : `Jahr ${yearOf(monthKey)}`}</Text>
            <Text style={{ marginTop: 10, fontSize: 17, fontWeight: '700', color: '#111' }}>{formatEuro(metrics.ueberschuss, { decimals: 0 })}</Text>
            <View style={{ marginTop: 10, gap: 5 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <View key={i} style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ flex: 1, height: 5, backgroundColor: '#F0F0F0', borderRadius: 1 }} />
                  <View style={{ width: 26, height: 5, backgroundColor: '#E0E0E0', borderRadius: 1 }} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.bg, borderTopWidth: 0.5, borderTopColor: theme.border }}>
        <TouchableOpacity onPress={generate} disabled={generating} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 16, backgroundColor: theme.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generating ? 0.7 : 1 }}>
          {generating ? <ActivityIndicator color={theme.accentInk} /> : <>
            <CFIcon name="share" size={18} color={theme.accentInk} stroke={2.6} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accentInk }}>PDF exportieren & teilen</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
