import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import {
  propertyTotals, finanzierungsStruktur, planStatus,
  PLAN_TYP_KURZ, formatEuro,
  zinsbindungInfo, currentMietperiode, istLeerstandPeriode,
  jahresCashflowSerie, sonderbuchungSaldoProJahr,
} from '../data/calc';
import { KreditPlan } from '../data/model';
import { isoToDE } from '../data/dateUtils';
import CFIcon from '../components/CFIcon';
import { TopBar, SectionLabel, Card, EmptyState } from '../components/UI';

type Tab = 'uebersicht' | 'vertraege' | 'mieten' | 'belege';

const TABS: { key: Tab; label: string }[] = [
  { key: 'uebersicht', label: 'Übersicht' },
  { key: 'vertraege', label: 'Verträge' },
  { key: 'mieten', label: 'Mieten' },
  { key: 'belege', label: 'Belege' },
];

function Row({ theme, l, v, c, last }: { theme: any; l: string; v: string; c?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.border }}>
      <Text style={{ fontSize: 14.5, color: theme.textMuted }}>{l}</Text>
      <Text style={{ fontSize: 14.5, fontWeight: '700', color: c ?? theme.text }}>{v}</Text>
    </View>
  );
}

export default function PropertyDetailScreen() {
  const { theme, data, deleteProperty, deletePlan } = useApp();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const p = data.properties.find(x => x.id === id);
  const [tab, setTab] = useState<Tab>('uebersicht');

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <TopBar theme={theme} title="Immobilie" onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const plans = p.kreditplaene ?? [];
  const totals = propertyTotals(p);
  const fin = finanzierungsStruktur(p);
  const aktPer = currentMietperiode(p);
  const leerstand = istLeerstandPeriode(aktPer);
  const tilgungProzent = totals.kreditsummeGesamt > 0 ? totals.gezahlteTilgungGesamt / totals.kreditsummeGesamt : 0;
  const jahresCF = jahresCashflowSerie(p);
  const sonderSaldo = sonderbuchungSaldoProJahr(p);
  const hatLaufendeKosten = (p.hausgeldMonatlich || 0) + (p.lebensversicherungMonatlich || 0) + (p.grundbesitzabgabenJaehrlich || 0) > 0;

  const del = () => {
    Alert.alert('Löschen?', `„${p.name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { deleteProperty(p.id); navigation.goBack(); } },
    ]);
  };

  const delPlan = (plan: KreditPlan) => {
    Alert.alert('Vertrag löschen?', `„${plan.name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deletePlan(p.id, plan.id) },
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

      {/* Hero — Cashflow (immer sichtbar) */}
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 10 }}>
        <Text style={{ fontSize: 13, color: theme.textMuted }}>Cashflow / Monat</Text>
        <Text style={{ fontSize: 36, fontWeight: '700', color: totals.mietCashflow >= 0 ? theme.income : theme.expense, marginTop: 2 }}>
          {formatEuro(totals.mietCashflow, { sign: true })}
        </Text>
        <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
          {leerstand ? 'Leerstand' : 'Vermietet'} · Kredit {formatEuro(totals.monatsrateGesamt, { decimals: 0 })}
        </Text>
      </View>

      {/* Tab-Bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? theme.accent : 'transparent' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? theme.accent : theme.textMuted }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
        {/* ──── ÜBERSICHT ──── */}
        {tab === 'uebersicht' && (
          <>
            {totals.kreditsummeGesamt > 0 && (
              <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, padding: 16, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: theme.textMuted }}>Getilgt {Math.round(tilgungProzent * 100)}%</Text>
                  <Text style={{ fontSize: 13, color: theme.textMuted }}>
                    {formatEuro(totals.gezahlteTilgungGesamt, { decimals: 0 })} / {formatEuro(totals.kreditsummeGesamt, { decimals: 0 })}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(1, tilgungProzent) * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 4 }} />
                </View>
                {totals.sondertilgungenGesamt > 0 && (
                  <Text style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 8 }}>
                    davon {formatEuro(totals.sondertilgungenGesamt, { decimals: 0 })} aus Sondertilgungen
                  </Text>
                )}
              </View>
            )}

            {(fin.kaufpreis > 0 || fin.kaufnebenkosten > 0 || fin.eigenkapital > 0) && (
              <>
                <SectionLabel theme={theme}>Finanzierungsstruktur</SectionLabel>
                <Card theme={theme}>
                  <Row theme={theme} l="Kaufpreis" v={formatEuro(fin.kaufpreis, { decimals: 0 })} />
                  <Row theme={theme} l="+ Kaufnebenkosten" v={formatEuro(fin.kaufnebenkosten, { decimals: 0 })} />
                  <Row theme={theme} l="− Eigenkapital" v={formatEuro(fin.eigenkapital, { decimals: 0 })} />
                  <Row theme={theme} l="= Finanzierungsbedarf" v={formatEuro(fin.finanzierungsbedarf, { decimals: 0 })} c={theme.text} />
                  <Row theme={theme} l="Kredite gesamt" v={formatEuro(fin.kreditsummeGesamt, { decimals: 0 })} />
                  <Row theme={theme} l={fin.differenz >= 0 ? 'Liquiditätspuffer' : 'Lücke'} v={formatEuro(Math.abs(fin.differenz), { decimals: 0 })} c={fin.differenz >= 0 ? theme.income : theme.expense} last />
                </Card>
              </>
            )}

            {jahresCF.length > 0 && (
              <>
                <SectionLabel theme={theme}>Cashflow-Historie</SectionLabel>
                <Card theme={theme}>
                  <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
                    <Text style={{ width: 56, fontSize: 11, color: theme.textMuted, fontWeight: '600' }}>JAHR</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: theme.textMuted, fontWeight: '600' }}>STATUS</Text>
                    <Text style={{ width: 90, fontSize: 11, color: theme.textMuted, fontWeight: '600', textAlign: 'right' }}>CASHFLOW</Text>
                  </View>
                  {jahresCF.map((j, i) => (
                    <View key={j.jahr} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i === jahresCF.length - 1 ? 0 : 0.5, borderBottomColor: theme.border }}>
                      <Text style={{ width: 56, fontSize: 14, fontWeight: '600', color: theme.text }}>{j.jahr}</Text>
                      <Text style={{ flex: 1, fontSize: 12, color: theme.textMuted }}>
                        {j.monateVermietet === 0 ? 'Eigennutzung' : j.monateEigennutzung === 0 ? 'Vermietet' : `${j.monateVermietet}M verm. / ${j.monateEigennutzung}M eigen`}
                      </Text>
                      <Text style={{ width: 90, fontSize: 14, fontWeight: '700', color: j.cashflow >= 0 ? theme.income : theme.expense, textAlign: 'right' }}>
                        {formatEuro(j.cashflow, { decimals: 0, sign: true })}
                      </Text>
                    </View>
                  ))}
                </Card>
              </>
            )}

            <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
              <TouchableOpacity onPress={del} style={{ height: 50, borderRadius: 16, backgroundColor: theme.expense + '1F', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.expense }}>Immobilie löschen</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ──── VERTRÄGE ──── */}
        {tab === 'vertraege' && (
          <>
            <SectionHeader theme={theme} label="Kreditverträge" onAdd={() => navigation.navigate('KreditPlanEdit', { propId: p.id })} addLabel="Vertrag" />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {plans.length === 0 ? (
                <View style={{ backgroundColor: theme.surface, borderRadius: 16 }}>
                  <EmptyState theme={theme} text={'Noch kein Vertrag — oben „+ Vertrag" tippen'} />
                </View>
              ) : (
                plans.map(pl => {
                  const st = planStatus(pl);
                  const zi = zinsbindungInfo(pl);
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      onPress={() => navigation.navigate('KreditPlanEdit', { propId: p.id, planId: pl.id })}
                      onLongPress={() => delPlan(pl)}
                      style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 14 }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: theme.accent + '22' }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.accent, letterSpacing: 0.3 }}>{PLAN_TYP_KURZ[pl.typ].toUpperCase()}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: theme.text }} numberOfLines={1}>{pl.name}</Text>
                        <TouchableOpacity onPress={() => delPlan(pl)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <CFIcon name="close" size={14} color={theme.textDim} />
                        </TouchableOpacity>
                      </View>
                      {st.phaseLabel && <Text style={{ fontSize: 11.5, color: theme.textMuted, marginBottom: 6 }}>{st.phaseLabel}</Text>}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Mini theme={theme} l="Rate" v={formatEuro(st.monatsrate, { decimals: 0 })} />
                        <Mini theme={theme} l="Restschuld" v={formatEuro(st.restschuld, { decimals: 0 })} c={theme.expense} />
                        <Mini theme={theme} l="Getilgt" v={formatEuro(st.gezahlteTilgung, { decimals: 0 })} c={theme.income} />
                        <Mini theme={theme} l="Rest" v={st.restlaufzeitMonate > 0 ? `${Math.round(st.restlaufzeitMonate / 12)} J` : '—'} />
                      </View>
                      {zi.hatZinsbindung && (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.border }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: zi.warnung ? theme.expense : theme.textMuted }}>
                            {zi.warnung ? '⚠ ' : ''}Zinsbindung bis {isoToDE(zi.endeISO!)}
                            {zi.monateBisEnde != null && zi.monateBisEnde >= 0 ? ` · noch ${Math.floor(zi.monateBisEnde / 12)}J ${zi.monateBisEnde % 12}M` : ' · abgelaufen'}
                          </Text>
                          {zi.restschuldZumEnde != null && (
                            <Text style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 2 }}>
                              Voraussichtl. Restschuld bei Ende: {formatEuro(zi.restschuldZumEnde, { decimals: 0 })}
                            </Text>
                          )}
                        </View>
                      )}
                      {st.bausparGuthaben != null && (
                        <Text style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 8 }}>
                          Guthaben {formatEuro(st.bausparGuthaben, { decimals: 0 })}{st.zuteilungInMonaten ? ` · Zuteilung in ${st.zuteilungInMonaten} Mon.` : ''}
                        </Text>
                      )}
                      {st.sondertilgungenSumme > 0 && (
                        <Text style={{ fontSize: 11.5, color: theme.income, marginTop: 4, fontWeight: '600' }}>
                          Sondertilgungen: {formatEuro(st.sondertilgungenSumme, { decimals: 0 })}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* ──── MIETEN ──── */}
        {tab === 'mieten' && (
          <>
            <SectionHeader theme={theme} label="Laufende Kosten / Monat" onAdd={() => navigation.navigate('LaufendeKosten', { propId: p.id })} addLabel="verwalten" />
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={() => navigation.navigate('LaufendeKosten', { propId: p.id })} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }} activeOpacity={0.7}>
                {hatLaufendeKosten ? (
                  <>
                    <KostenRow theme={theme} l="Hausgeld" v={(p.hausgeldMonatlich || 0) > 0 ? formatEuro(p.hausgeldMonatlich!, { decimals: 0 }) : '—'} />
                    <KostenRow theme={theme} l="Lebensversicherung" v={(p.lebensversicherungMonatlich || 0) > 0 ? formatEuro(p.lebensversicherungMonatlich!, { decimals: 0 }) : '—'} />
                    <KostenRow theme={theme} l={(p.grundbesitzabgabenJaehrlich || 0) > 0 ? `Grundbesitzabgaben (${formatEuro(p.grundbesitzabgabenJaehrlich!, { decimals: 0 })} / Jahr)` : 'Grundbesitzabgaben'} v={(p.grundbesitzabgabenJaehrlich || 0) > 0 ? formatEuro(p.grundbesitzabgabenJaehrlich! / 12, { decimals: 0 }) : '—'} last />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.border }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Summe / Monat</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.expense }}>
                        {formatEuro((p.hausgeldMonatlich || 0) + (p.lebensversicherungMonatlich || 0) + (p.grundbesitzabgabenJaehrlich || 0) / 12, { decimals: 0 })}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={{ fontSize: 14, color: theme.textMuted }}>Noch keine laufenden Kosten erfasst — tippen zum Eintragen</Text>
                )}
              </TouchableOpacity>
            </View>

            <SectionHeader theme={theme} label="Mietperioden" onAdd={() => navigation.navigate('Mietperioden', { propId: p.id })} addLabel="verwalten" />
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={() => navigation.navigate('Mietperioden', { propId: p.id })} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }} activeOpacity={0.7}>
                {aktPer ? (
                  <>
                    <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6 }}>Aktuelle Periode: ab {isoToDE(aktPer.vonDatum)}</Text>
                    {leerstand ? (
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.expense, marginTop: 2 }}>🏚 Leerstand</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Mini theme={theme} l="Kaltmiete" v={formatEuro(aktPer.kaltmiete, { decimals: 0 })} c={theme.income} />
                        <Mini theme={theme} l="NK-Umlage" v={formatEuro(aktPer.nebenkostenumlage, { decimals: 0 })} c={theme.income} />
                        <Mini theme={theme} l="Gesamt" v={formatEuro(aktPer.kaltmiete + aktPer.nebenkostenumlage, { decimals: 0 })} c={theme.income} />
                      </View>
                    )}
                    <Text style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 8 }}>
                      {(p.mietperioden ?? []).length} Periode(n) · tippen zum Verwalten
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 14, color: theme.textMuted }}>Noch keine Mietperiode — tippen zum Anlegen</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ──── BELEGE ──── */}
        {tab === 'belege' && (
          <>
            <SectionHeader theme={theme} label="Sonderbuchungen" onAdd={() => navigation.navigate('Sonderbuchung', { propId: p.id })} addLabel="verwalten" />
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={() => navigation.navigate('Sonderbuchung', { propId: p.id })} style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16 }} activeOpacity={0.7}>
                {(p.sonderbuchungen ?? []).length === 0 ? (
                  <Text style={{ fontSize: 14, color: theme.textMuted }}>
                    Keine Sonderbuchungen — tippen zum Anlegen{'\n'}(Nebenkostenabrechnung, Reparatur, Anwalt …)
                  </Text>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                    {Object.keys(sonderSaldo).sort().reverse().slice(0, 6).map(y => (
                      <View key={y}>
                        <Text style={{ fontSize: 11, color: theme.textMuted }}>{y}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: sonderSaldo[Number(y)] >= 0 ? theme.income : theme.expense, marginTop: 2 }}>
                          {formatEuro(sonderSaldo[Number(y)], { decimals: 0, sign: true })}
                        </Text>
                      </View>
                    ))}
                    <Text style={{ fontSize: 11.5, color: theme.textMuted, marginLeft: 'auto', alignSelf: 'flex-end' }}>
                      {(p.sonderbuchungen ?? []).length} Einträge
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ theme, label, onAdd, addLabel }: { theme: any; label: string; onAdd: () => void; addLabel: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <TouchableOpacity onPress={onAdd} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.accent }}>
        <CFIcon name="plus" size={12} color={theme.accentInk} stroke={2.6} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.accentInk }}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function KostenRow({ theme, l, v, last }: { theme: any; l: string; v: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.border }}>
      <Text style={{ fontSize: 13.5, color: theme.textMuted, flex: 1 }} numberOfLines={1}>{l}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{v}</Text>
    </View>
  );
}

function Mini({ theme, l, v, c }: { theme: any; l: string; v: string; c?: string }) {
  return (
    <View>
      <Text style={{ fontSize: 10.5, color: theme.textMuted }}>{l}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c ?? theme.text, marginTop: 2 }}>{v}</Text>
    </View>
  );
}
