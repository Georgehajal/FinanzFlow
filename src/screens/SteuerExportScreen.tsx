import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '../data/AppContext';
import { SteuerBereich, STEUER_BEREICH_LABEL, STEUER_BEREICH_KURZ } from '../data/model';
import { formatEuro, steuerJahresansicht, steuerVerfuegbareJahre } from '../data/calc';
import { isoToDE } from '../data/dateUtils';
import { readAsBase64 } from '../data/fotoUtils';
import CFIcon from '../components/CFIcon';
import { TopBar } from '../components/UI';

const esc = (s: string) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export default function SteuerExportScreen() {
  const { theme, data } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bereich: SteuerBereich = route.params?.bereich ?? 'nicht_selbst';
  const [jahr, setJahr] = useState<number>(route.params?.jahr ?? new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const jahre = steuerVerfuegbareJahre(data);

  const eintraege = steuerJahresansicht(data, jahr, bereich);
  const summe = eintraege.reduce((a, e) => a + e.betrag, 0);

  // Nach Kategorie gruppieren für Übersicht
  const gruppen: Record<string, { label: string; summe: number; anzahl: number }> = {};
  for (const e of eintraege) {
    if (!gruppen[e.kategorie]) gruppen[e.kategorie] = { label: e.kategorieLabel, summe: 0, anzahl: 0 };
    gruppen[e.kategorie].summe += e.betrag;
    gruppen[e.kategorie].anzahl += 1;
  }

  const fotoCache: Record<string, string> = {};

  const buildHtml = () => {
    const now = new Date();
    const gruppenRows = Object.values(gruppen)
      .sort((a, b) => b.summe - a.summe)
      .map(g => `<tr><td>${esc(g.label)}</td><td style="text-align:right">${g.anzahl}</td><td style="text-align:right"><b>${formatEuro(g.summe)}</b></td></tr>`)
      .join('');

    const detailRows = eintraege.map(e =>
      `<tr><td>${esc(isoToDE(e.datum))}</td><td>${esc(e.kategorieLabel)}${e.isContract ? ' 🔁' : ''}${e.fotoUri ? ' 📎' : ''}</td><td>${esc(e.beschreibung)}${e.notiz ? `<br><span style="color:#888;font-size:11px">${esc(e.notiz)}</span>` : ''}</td><td style="text-align:right">${formatEuro(e.betrag)}</td></tr>`
    ).join('');

    const belegBlocks = eintraege.filter(e => e.fotoUri && fotoCache[e.fotoUri!]).map(e =>
      `<div style="page-break-inside:avoid;margin:14px 0;padding:10px;border:1px solid #eee;border-radius:8px">
        <div style="font-size:12px;color:#444;margin-bottom:6px">
          <b>${esc(isoToDE(e.datum))}</b> · ${esc(e.kategorieLabel)} · ${formatEuro(e.betrag)}
          <br>${esc(e.beschreibung)}
        </div>
        <img src="${fotoCache[e.fotoUri!]}" style="max-width:100%;max-height:400px;border-radius:6px"/>
      </div>`
    ).join('');

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>
      body{font-family:-apple-system,Arial,sans-serif;color:#111;padding:32px;max-width:820px;margin:0 auto}
      h1{font-size:24px;margin-bottom:4px}h2{font-size:18px;margin:24px 0 10px}h3{font-size:14px;margin:18px 0 8px;color:#444}
      .sub{color:#666;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px}
      th{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;padding:6px 4px;border-bottom:2px solid #ddd;text-align:left}
      td{padding:7px 4px;border-bottom:1px solid #f3f3f3}
      .tot{background:#f8f8f8;font-weight:700}
      .ft{margin-top:30px;font-size:11px;color:#999;text-align:center}
    </style></head><body>
      <h1>Finanzflow — Steuerübersicht</h1>
      <div class="sub">${STEUER_BEREICH_LABEL[bereich]} · Steuerjahr ${jahr}</div>

      <h2>Übersicht nach Kategorie</h2>
      <table>
        <tr><th>Kategorie</th><th style="text-align:right">Posten</th><th style="text-align:right">Summe</th></tr>
        ${gruppenRows}
        <tr class="tot"><td colspan="2"><b>Summe gesamt</b></td><td style="text-align:right"><b>${formatEuro(summe)}</b></td></tr>
      </table>

      <h2>Alle Posten</h2>
      <table>
        <tr><th>Datum</th><th>Kategorie</th><th>Beschreibung</th><th style="text-align:right">Betrag</th></tr>
        ${detailRows || '<tr><td colspan="4" style="color:#888;text-align:center;padding:14px">Keine Einträge</td></tr>'}
      </table>

      ${belegBlocks ? `<h2>📎 Belege</h2>${belegBlocks}` : ''}

      <div class="ft">
        Finanzflow · ${STEUER_BEREICH_KURZ[bereich]} ${jahr} · erstellt ${now.toLocaleDateString('de-DE')}<br>
        🔁 = aus wiederkehrendem Vertrag &nbsp; 📎 = Beleg vorhanden
      </div>
    </body></html>`;
  };

  const generate = async () => {
    if (eintraege.length === 0) { Alert.alert('Keine Daten', `Für ${jahr} gibt es keine Einträge in diesem Bereich.`); return; }
    setGenerating(true);
    try {
      for (const e of eintraege) {
        if (e.fotoUri && !fotoCache[e.fotoUri]) {
          const b64 = await readAsBase64(e.fotoUri);
          if (b64) {
            const ext = e.fotoUri.split('.').pop()?.toLowerCase() || 'jpg';
            const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            fotoCache[e.fotoUri] = `data:${mime};base64,${b64}`;
          }
        }
      }
      const { uri } = await Print.printToFileAsync({ html: buildHtml(), base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Steuer ${STEUER_BEREICH_KURZ[bereich]} ${jahr}` });
    } catch {
      Alert.alert('Fehler', 'PDF konnte nicht erstellt werden.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <TopBar theme={theme} title={`PDF · ${STEUER_BEREICH_KURZ[bereich]}`} onClose={() => navigation.goBack()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>
            Eigenes PDF für deinen Steuerberater — nur {STEUER_BEREICH_KURZ[bereich]} ({jahr}).
          </Text>
        </View>

        {/* Jahres-Wahl */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600', letterSpacing: 0.4, marginBottom: 8 }}>JAHR</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {jahre.map(y => (
              <TouchableOpacity
                key={y}
                onPress={() => setJahr(y)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: jahr === y ? theme.accent + '24' : theme.surface,
                  borderWidth: 1, borderColor: jahr === y ? theme.accent + '66' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: jahr === y ? theme.accent : theme.text }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vorschau */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{eintraege.length} {eintraege.length === 1 ? 'Posten' : 'Posten'}</Text>
            <Text style={{ fontSize: 14, color: theme.accent, marginTop: 4, fontWeight: '700' }}>{formatEuro(summe, { decimals: 0 })}</Text>
            <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>
              davon {eintraege.filter(e => e.fotoUri).length} mit Beleg
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          {Object.values(gruppen).sort((a, b) => b.summe - a.summe).map((g, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
              <Text style={{ fontSize: 13, color: theme.text, flex: 1 }} numberOfLines={1}>{g.label}</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, width: 40, textAlign: 'right' }}>{g.anzahl}×</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, width: 80, textAlign: 'right' }}>{formatEuro(g.summe, { decimals: 0 })}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.bg, borderTopWidth: 0.5, borderTopColor: theme.border }}>
        <TouchableOpacity onPress={generate} disabled={generating} activeOpacity={0.85}
          style={{ height: 54, borderRadius: 16, backgroundColor: theme.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: generating ? 0.7 : 1 }}>
          {generating ? <ActivityIndicator color={theme.accentInk} /> : <>
            <CFIcon name="share" size={18} color={theme.accentInk} stroke={2.6} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accentInk }}>PDF teilen</Text>
          </>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
