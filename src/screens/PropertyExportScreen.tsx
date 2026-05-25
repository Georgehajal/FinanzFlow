import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '../data/AppContext';
import { propertyTotals, planStatus, PLAN_TYP_LABEL, formatEuro, finanzierungsStruktur, currentMietperiode, jahresCashflowSerie, SB_KATEGORIE_LABEL, steuerSaldoProJahr } from '../data/calc';
import { isoToDE } from '../data/dateUtils';
import { readAsBase64 } from '../data/fotoUtils';
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

  // Cache: fotoUri → base64 data URI (vor buildHtml gefüllt)
  const fotoCache: Record<string, string> = {};

  const buildHtml = () => {
    const blocks = props.map(p => {
      const t = propertyTotals(p);
      const fin = finanzierungsStruktur(p);
      const plans = p.kreditplaene ?? [];
      const planRows = plans.map(pl => {
        const st = planStatus(pl);
        return `<tr><td><b>${esc(pl.name)}</b><br><span style="font-size:11px;color:#888">${PLAN_TYP_LABEL[pl.typ]}${st.phaseLabel ? ` · ${st.phaseLabel}` : ''}</span></td>
          <td style="text-align:right">${formatEuro(st.monatsrate)}</td>
          <td style="text-align:right">${formatEuro(st.restschuld)}</td>
          <td style="text-align:right">${formatEuro(st.gezahlteTilgung)}</td>
          <td style="text-align:right">${st.restlaufzeitMonate > 0 ? Math.round(st.restlaufzeitMonate / 12) + ' J' : '—'}</td></tr>`;
      }).join('');
      const finBlock = (fin.kaufpreis > 0 || fin.kaufnebenkosten > 0 || fin.eigenkapital > 0)
        ? `<h3>Finanzierungsstruktur</h3><table>
            <tr><td>Kaufpreis</td><td style="text-align:right">${formatEuro(fin.kaufpreis)}</td></tr>
            <tr><td>+ Kaufnebenkosten</td><td style="text-align:right">${formatEuro(fin.kaufnebenkosten)}</td></tr>
            <tr><td>− Eigenkapital</td><td style="text-align:right">${formatEuro(fin.eigenkapital)}</td></tr>
            <tr><td><b>Finanzierungsbedarf</b></td><td style="text-align:right"><b>${formatEuro(fin.finanzierungsbedarf)}</b></td></tr>
            <tr><td>Kredite gesamt</td><td style="text-align:right">${formatEuro(fin.kreditsummeGesamt)}</td></tr>
            <tr><td>${fin.differenz >= 0 ? 'Liquiditätspuffer' : 'Lücke'}</td><td style="text-align:right" class="${fin.differenz >= 0 ? 'income' : 'expense'}">${formatEuro(Math.abs(fin.differenz))}</td></tr>
          </table>` : '';
      return `<div class="card"><h2>${esc(p.name)}</h2>
        <div class="grid">
          <div class="tile"><div class="l">Monatsrate gesamt</div><div class="v">${formatEuro(t.monatsrateGesamt)}</div></div>
          <div class="tile"><div class="l">Restschuld gesamt</div><div class="v expense">${formatEuro(t.restschuldGesamt)}</div></div>
          <div class="tile"><div class="l">Getilgt</div><div class="v income">${formatEuro(t.gezahlteTilgungGesamt)}</div></div>
          <div class="tile"><div class="l">Verträge</div><div class="v">${plans.length}</div></div>
        </div>
        ${plans.length > 0 ? `<h3>Kreditverträge</h3><table>
          <tr><th style="text-align:left">Vertrag</th><th style="text-align:right">Rate</th><th style="text-align:right">Rest</th><th style="text-align:right">Getilgt</th><th style="text-align:right">Restzeit</th></tr>
          ${planRows}
          ${t.sondertilgungenGesamt > 0 ? `<tr><td colspan="3">davon Sondertilgungen</td><td colspan="2" style="text-align:right" class="income">${formatEuro(t.sondertilgungenGesamt)}</td></tr>` : ''}
        </table>` : '<p style="color:#888">Keine Kreditverträge erfasst</p>'}
        ${finBlock}
        <h3>Laufende Kosten / Monat</h3>
        <table>
          <tr><td>Hausgeld</td><td style="text-align:right">${formatEuro(p.hausgeldMonatlich || 0)}</td></tr>
          <tr><td>Lebensversicherung</td><td style="text-align:right">${formatEuro(p.lebensversicherungMonatlich || 0)}</td></tr>
          <tr><td>Grundbesitzabgaben (${formatEuro(p.grundbesitzabgabenJaehrlich || 0)} / Jahr)</td><td style="text-align:right">${formatEuro((p.grundbesitzabgabenJaehrlich || 0) / 12)}</td></tr>
          <tr><td>Kreditrate gesamt</td><td style="text-align:right">${formatEuro(t.monatsrateGesamt)}</td></tr>
        </table>
        <h3>Aktuelle Mietperiode</h3>
        ${(() => {
          const per = currentMietperiode(p);
          if (!per) return '<p style="color:#888">Keine Mietperiode definiert</p>';
          const leer = (per.kaltmiete || 0) === 0 && (per.nebenkostenumlage || 0) === 0;
          if (leer) return `<p><b>🏚 Leerstand</b> (ab ${esc(isoToDE(per.vonDatum))}) · keine Mieteinnahmen</p>`;
          return `<table>
            <tr><td>ab</td><td style="text-align:right">${esc(isoToDE(per.vonDatum))}</td></tr>
            <tr><td>Kaltmiete</td><td style="text-align:right">${formatEuro(per.kaltmiete)}</td></tr>
            <tr><td>Nebenkostenumlage</td><td style="text-align:right">${formatEuro(per.nebenkostenumlage)}</td></tr>
            <tr><td>Brutto-Mietrendite</td><td style="text-align:right">${(t.bruttoRendite * 100).toFixed(2)} %</td></tr>
            <tr><td><b>Cashflow / Monat</b></td><td style="text-align:right" class="${t.mietCashflow >= 0 ? 'income' : 'expense'}"><b>${formatEuro(t.mietCashflow, { sign: true })}</b></td></tr>
          </table>`;
        })()}
        ${(() => {
          const sb = (p.sonderbuchungen ?? []);
          if (sb.length === 0) return '';
          const rows = sb.slice().sort((a, b) => a.datum < b.datum ? 1 : -1).map(s =>
            `<tr><td>${esc(isoToDE(s.datum))}</td><td>${SB_KATEGORIE_LABEL[s.kategorie]}${s.steuerlichAbsetzbar ? ' 💰' : ''}${s.notiz ? ` <span style="color:#888">· ${esc(s.notiz)}</span>` : ''}</td><td style="text-align:right" class="${s.typ === 'einnahme' ? 'income' : 'expense'}">${s.typ === 'einnahme' ? '+' : '−'}${formatEuro(s.betrag)}</td></tr>`
          ).join('');
          return `<h3>Sonderbuchungen</h3><table>
            <tr><th style="text-align:left">Datum</th><th style="text-align:left">Kategorie</th><th style="text-align:right">Betrag</th></tr>
            ${rows}
          </table>`;
        })()}
        ${(() => {
          const stSaldo = steuerSaldoProJahr(p);
          const jahre = Object.keys(stSaldo).sort();
          if (jahre.length === 0) return '';
          const absetzbar = (p.sonderbuchungen ?? []).filter(s => s.steuerlichAbsetzbar).sort((a, b) => a.datum < b.datum ? -1 : 1);
          const rows = absetzbar.map(s =>
            `<tr><td>${esc(isoToDE(s.datum))}</td><td>${SB_KATEGORIE_LABEL[s.kategorie]}${s.fotoUri ? ' 📎' : ''}${s.notiz ? ` <span style="color:#888">· ${esc(s.notiz)}</span>` : ''}</td><td style="text-align:right" class="${s.typ === 'einnahme' ? 'income' : 'expense'}">${s.typ === 'einnahme' ? '+' : '−'}${formatEuro(s.betrag)}</td></tr>`
          ).join('');
          const summen = jahre.map(y => `<tr><td colspan="2"><b>Saldo ${y}</b></td><td style="text-align:right" class="${stSaldo[Number(y)] >= 0 ? 'income' : 'expense'}"><b>${formatEuro(stSaldo[Number(y)], { sign: true })}</b></td></tr>`).join('');
          return `<h3>💰 Steuerlich absetzbar (Werbungskosten — Anlage V)</h3><table>
            <tr><th style="text-align:left">Datum</th><th style="text-align:left">Position</th><th style="text-align:right">Betrag</th></tr>
            ${rows}
            ${summen}
          </table>`;
        })()}
        ${(() => {
          const mitFoto = (p.sonderbuchungen ?? []).filter(s => s.fotoUri && fotoCache[s.fotoUri!]).sort((a, b) => a.datum < b.datum ? -1 : 1);
          if (mitFoto.length === 0) return '';
          const blocks = mitFoto.map(s => `
            <div style="page-break-inside:avoid;margin:14px 0;padding:10px;border:1px solid #eee;border-radius:8px">
              <div style="font-size:12px;color:#444;margin-bottom:6px">
                <b>${esc(isoToDE(s.datum))}</b> · ${SB_KATEGORIE_LABEL[s.kategorie]}${s.steuerlichAbsetzbar ? ' 💰' : ''} · ${s.typ === 'einnahme' ? '+' : '−'}${formatEuro(s.betrag)}
                ${s.notiz ? `<br><span style="color:#888">${esc(s.notiz)}</span>` : ''}
              </div>
              <img src="${fotoCache[s.fotoUri!]}" style="max-width:100%;max-height:400px;border-radius:6px"/>
            </div>`).join('');
          return `<h3>📎 Belege</h3>${blocks}`;
        })()}
        ${(() => {
          const jcs = jahresCashflowSerie(p);
          if (jcs.length === 0) return '';
          const rows = jcs.map(j =>
            `<tr><td>${j.jahr}</td><td>${j.monateVermietet === 0 ? 'Eigennutzung' : j.monateEigennutzung === 0 ? 'Vermietet' : `${j.monateVermietet}M verm. / ${j.monateEigennutzung}M eigen`}</td><td style="text-align:right">${formatEuro(j.einnahmenMiete + j.einnahmenSonder)}</td><td style="text-align:right">${formatEuro(j.ausgabenHausgeld + j.ausgabenKreditrate + j.ausgabenSonder)}</td><td style="text-align:right" class="${j.cashflow >= 0 ? 'income' : 'expense'}"><b>${formatEuro(j.cashflow, { sign: true })}</b></td></tr>`
          ).join('');
          return `<h3>Cashflow-Historie</h3><table>
            <tr><th style="text-align:left">Jahr</th><th style="text-align:left">Status</th><th style="text-align:right">Einnahmen</th><th style="text-align:right">Ausgaben</th><th style="text-align:right">Cashflow</th></tr>
            ${rows}
          </table>`;
        })()}
        </div>`;
    }).join('');

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>
      body{font-family:-apple-system,Arial,sans-serif;color:#111;padding:32px;max-width:820px;margin:0 auto}
      h1{font-size:26px;margin-bottom:2px}.sub{color:#666;font-size:13px;margin-bottom:20px}
      .card{border:1px solid #eee;border-radius:14px;padding:18px;margin-bottom:18px}
      h2{font-size:17px;margin:0 0 12px}h3{font-size:14px;margin:18px 0 8px;color:#444}
      th{font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;padding:6px 4px;border-bottom:1px solid #e5e5e5}
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
      // Alle Belege als Base64 laden (für PDF-Einbettung)
      for (const p of props) {
        for (const sb of (p.sonderbuchungen ?? [])) {
          if (sb.fotoUri && !fotoCache[sb.fotoUri]) {
            const b64 = await readAsBase64(sb.fotoUri);
            if (b64) {
              const ext = sb.fotoUri.split('.').pop()?.toLowerCase() || 'jpg';
              const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
              fotoCache[sb.fotoUri] = `data:${mime};base64,${b64}`;
            }
          }
        }
      }
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
            const t = propertyTotals(p);
            return (
              <View key={p.id} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '700', color: theme.text }}>{p.name}</Text>
                <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 4 }}>
                  Rate {formatEuro(t.monatsrateGesamt, { decimals: 0 })} · Restschuld {formatEuro(t.restschuldGesamt, { decimals: 0 })} · Cashflow {formatEuro(t.mietCashflow, { decimals: 0, sign: true })}
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
