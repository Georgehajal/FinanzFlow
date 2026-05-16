import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '../data/AppContext';
import { amortize, formatEuro } from '../data/calc';
import CFIcon from '../components/CFIcon';
import { TopBar } from '../components/UI';

const esc = (s: string) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export default function PropertyExportScreen() {
  const { theme, data } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [generating, setGenerating] = useState(false);
  const now = new Date();
  const props = data.properties;

  const buildHtml = () => {
    const blocks = props.map(p => {
      const a = amortize(p);
      return `<div class="card"><h2>${esc(p.name)}</h2>
        <div class="grid">
          <div class="tile"><div class="l">Monatsrate</div><div class="v">${formatEuro(a.monatsrate)}</div></div>
          <div class="tile"><div class="l">Restschuld</div><div class="v expense">${formatEuro(a.restschuld)}</div></div>
          <div class="tile"><div class="l">Getilgt</div><div class="v income">${formatEuro(a.bereitsGetilgt)}</div></div>
          <div class="tile"><div class="l">Restlaufzeit</div><div class="v">${a.restlaufzeitMonate} Mon.</div></div>
        </div>
        <table>
          <tr><td>Kreditsumme</td><td style="text-align:right">${formatEuro(p.kreditsumme)}</td></tr>
          <tr><td>Sollzins</td><td style="text-align:right">${p.sollzinsProzent} % p. a.</td></tr>
          <tr><td>Gezahlte Zinsen</td><td style="text-align:right">${formatEuro(a.gezahlteZinsen)}</td></tr>
          <tr><td>Zins-/Tilgungsanteil aktuell</td><td style="text-align:right">${formatEuro(a.aktuellZinsanteil)} / ${formatEuro(a.aktuellTilgungsanteil)}</td></tr>
          <tr><td>Kaltmiete / Warmmiete</td><td style="text-align:right">${formatEuro(p.kaltmiete)} / ${formatEuro(p.warmmiete)}</td></tr>
          <tr><td>Nebenkosten</td><td style="text-align:right">${formatEuro(p.nebenkosten)}</td></tr>
          <tr><td>Brutto-Mietrendite</td><td style="text-align:right">${(a.bruttoRendite * 100).toFixed(2)} %</td></tr>
          <tr><td>Cashflow (Warm − NK − Rate)</td><td style="text-align:right">${formatEuro(a.mietCashflow, { sign: true })}</td></tr>
          <tr><td>Vermietet seit</td><td style="text-align:right">${esc(p.vermietetSeit ?? '—')}</td></tr>
        </table></div>`;
    }).join('');

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>
      body{font-family:-apple-system,Arial,sans-serif;color:#111;padding:32px;max-width:820px;margin:0 auto}
      h1{font-size:26px;margin-bottom:2px}.sub{color:#666;font-size:13px;margin-bottom:20px}
      .card{border:1px solid #eee;border-radius:14px;padding:18px;margin-bottom:18px}
      h2{font-size:17px;margin:0 0 12px}
      .grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
      .tile{flex:1;min-width:120px;border:1px solid #f0f0f0;border-radius:10px;padding:12px}
      .l{font-size:11px;color:#666}.v{font-size:17px;font-weight:700;margin-top:4px}
      .income{color:#2E9E44}.expense{color:#E5484D}
      table{width:100%;border-collapse:collapse;font-size:13px}td{padding:7px 4px;border-bottom:1px solid #f3f3f3}
      .ft{margin-top:30px;font-size:11px;color:#999;text-align:center}</style></head><body>
      <div style="display:flex;justify-content:space-between"><div><h1>Finanzflow — Immobilien</h1>
      <div class="sub">Immobilienbericht · ${props.length} Objekt(e)</div></div>
      <div style="text-align:right;font-size:12px;color:#999">${now.toLocaleDateString('de-DE')}</div></div>
      ${blocks || '<p>Keine Immobilien erfasst.</p>'}
      <div class="ft">Finanzflow · separater Immobilien-Export · ${now.getFullYear()}</div></body></html>`;
  };

  const generate = async () => {
    if (props.length === 0) { Alert.alert('Keine Immobilien', 'Lege zuerst eine Immobilie an.'); return; }
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(), base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Finanzflow Immobilien' });
    } catch {
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title="Immobilien-PDF" onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>Eigener Bericht nur für Immobilien — getrennt vom Haushalts-Export.</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 10 }}>
          {props.map(p => {
            const a = amortize(p);
            return (
              <View key={p.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '700', color: theme.text }}>{p.name}</Text>
                <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 4 }}>
                  Rate {formatEuro(a.monatsrate, { decimals: 0 })} · Restschuld {formatEuro(a.restschuld, { decimals: 0 })} · Cashflow {formatEuro(a.mietCashflow, { decimals: 0, sign: true })}
                </Text>
              </View>
            );
          })}
          {props.length === 0 ? <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>Keine Immobilien erfasst</Text> : null}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.bg, borderTopWidth: 0.5, borderTopColor: theme.border }}>
        <TouchableOpacity onPress={generate} disabled={generating} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 16, backgroundColor: theme.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generating ? 0.7 : 1 }}>
          {generating ? <ActivityIndicator color={theme.accentInk} /> : <>
            <CFIcon name="share" size={18} color={theme.accentInk} stroke={2.6} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accentInk }}>Immobilien-PDF teilen</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
