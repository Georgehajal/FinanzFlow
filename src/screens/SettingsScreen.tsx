import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Switch, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import { exportBackup, importBackup } from '../data/backupUtils';
import { isBiometryAvailable, supportedTypeLabel } from '../data/authUtils';
import { THEME_PRESETS, presetById, ThemeId } from '../theme/tokens';
import CFIcon from '../components/CFIcon';

// ACCENT_SWATCHES war veraltet — Akzent kommt jetzt aus themeId / THEME_PRESETS

export default function SettingsScreen() {
  const { theme, settings, updateSettings, data, replaceAllData } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [biometryLabel, setBiometryLabel] = useState<string>('Face ID / PIN');
  const [biometryAvailable, setBiometryAvailable] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const ok = await isBiometryAvailable();
      setBiometryAvailable(ok);
      if (ok) setBiometryLabel(await supportedTypeLabel());
    })();
  }, []);

  const handleExport = async () => {
    try {
      await exportBackup(data);
    } catch (e: any) {
      Alert.alert('Export fehlgeschlagen', e?.message ?? 'Unbekannter Fehler');
    }
  };

  const handleImport = async () => {
    try {
      const imported = await importBackup();
      if (!imported) return;
      Alert.alert(
        'Backup importieren?',
        'Alle aktuellen Daten werden überschrieben. Fotos der Belege müssen separat gesichert sein (sie sind nicht im Backup enthalten).',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Importieren', style: 'destructive', onPress: async () => {
            await replaceAllData(imported);
            Alert.alert('Erledigt', 'Daten wurden importiert.');
          }},
        ],
      );
    } catch (e: any) {
      Alert.alert('Import fehlgeschlagen', e?.message ?? 'Unbekannter Fehler');
    }
  };

  const toggleAppLock = (v: boolean) => {
    if (v && !biometryAvailable) {
      Alert.alert(
        'Nicht verfügbar',
        'Auf diesem Gerät ist keine Biometrie (Face ID / Touch ID) oder Geräte-PIN eingerichtet. Bitte erst in den Geräte-Einstellungen aktivieren.',
      );
      return;
    }
    updateSettings({ appLockEnabled: v });
  };

  const initials = (settings.userName || 'FF').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', letterSpacing: -0.6, color: theme.text }}>Einstellungen</Text>
        </View>

        {/* Profile */}
        <View style={{ marginHorizontal: 16, marginBottom: 16, padding: 18, borderRadius: 22, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.accentInk, fontWeight: '700', fontSize: 20 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              value={settings.userName}
              onChangeText={t => updateSettings({ userName: t })}
              placeholder="Name"
              placeholderTextColor={theme.textDim}
              style={{ fontSize: 17, fontWeight: '700', color: theme.text, padding: 0 }}
            />
            <TextInput
              value={settings.userEmail}
              onChangeText={t => updateSettings({ userEmail: t })}
              placeholder="E-Mail (optional)"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ fontSize: 13, color: theme.textMuted, marginTop: 4, padding: 0 }}
            />
          </View>
        </View>

        <Section label="Darstellung" theme={theme}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconBox icon="sliders" color={theme.pink} />
              <Text style={{ fontSize: 15.5, color: theme.text }}>Dunkelmodus</Text>
            </View>
            <Switch
              value={settings.dark}
              onValueChange={v => updateSettings({ dark: v })}
              trackColor={{ false: 'rgba(120,120,128,0.32)', true: theme.accent }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <IconBox icon="star" color={theme.yellow} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15.5, color: theme.text }}>Farbschema</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {presetById(settings.themeId).label} · {presetById(settings.themeId).description}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 42, flexWrap: 'wrap' }}>
              {THEME_PRESETS.map(p => {
                const active = (settings.themeId ?? 'lime') === p.id;
                const swatch = settings.dark ? p.accentDark : p.accentLight;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => updateSettings({ themeId: p.id as ThemeId, accent: swatch })}
                    accessibilityRole="button"
                    accessibilityLabel={`Farbschema ${p.label}`}
                    accessibilityState={{ selected: active }}
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: swatch,
                      borderWidth: active ? 3 : 0,
                      borderColor: theme.text,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {active && <CFIcon name="check" size={18} color={p.inkOnAccent} stroke={2.6} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Section>

        <Section label="Sicherheit & Backup" theme={theme}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                <CFIcon name="lock" size={16} color={theme.accent} stroke={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: theme.text }}>App schützen ({biometryLabel})</Text>
                <Text style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 2 }}>
                  {biometryAvailable ? 'Bei jedem App-Start entsperren' : 'Geräte-PIN/Biometrie nicht eingerichtet'}
                </Text>
              </View>
            </View>
            <Switch
              value={!!settings.appLockEnabled}
              onValueChange={toggleAppLock}
              trackColor={{ false: 'rgba(120,120,128,0.32)', true: theme.accent }}
              thumbColor="#fff"
            />
          </View>
          <Row theme={theme} icon="share" bg={theme.blue} label="Backup exportieren (JSON)" onPress={handleExport} />
          <Row theme={theme} icon="note" bg={theme.purple} label="Backup importieren (JSON)" onPress={handleImport} last />
        </Section>

        <Section label="Berichte" theme={theme}>
          <Row theme={theme} icon="pdf" bg={theme.expense} label="PDF-Export (gesamt)" onPress={() => navigation.navigate('Export')} />
          <Row theme={theme} icon="home" bg={theme.orange} label="Immobilien-PDF-Export" onPress={() => navigation.navigate('PropertyExport')} />
          <Row theme={theme} icon="note" bg={theme.accent} label="Steuer Nichtselbstständig (PDF)" onPress={() => navigation.navigate('SteuerExport', { bereich: 'nicht_selbst', jahr: new Date().getFullYear() })} />
          <Row theme={theme} icon="wallet" bg={theme.purple} label="Steuer Selbstständig (PDF)" onPress={() => navigation.navigate('SteuerExport', { bereich: 'selbst', jahr: new Date().getFullYear() })} last />
        </Section>

        <Section label="Daten" theme={theme}>
          <Row theme={theme} icon="calendar" bg={theme.blue} label="Erfasste Monate" value={String(Object.keys(data.months).length)} />
          <Row theme={theme} icon="home" bg={theme.mint} label="Immobilien" value={String(data.properties.length)} last />
        </Section>

        <Section label="Über" theme={theme}>
          <Row theme={theme} icon="info" bg={theme.textMuted} label="Finanzflow" value="1.0.0" last />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ label, children, theme }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ paddingHorizontal: 24, paddingBottom: 6, fontSize: 12, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function IconBox({ icon, color }: any) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color + '33', alignItems: 'center', justifyContent: 'center' }}>
      <CFIcon name={icon} size={16} color={color} stroke={2.2} />
    </View>
  );
}

function Row({ theme, icon, bg, label, value, onPress, last }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.border }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <CFIcon name={icon} size={16} color="#fff" stroke={2.2} />
      </View>
      <Text style={{ flex: 1, fontSize: 15.5, color: theme.text }}>{label}</Text>
      {value ? <Text style={{ fontSize: 14, color: theme.textMuted }}>{value}</Text> : null}
      {onPress ? <CFIcon name="chevron" size={14} color={theme.textDim} stroke={2.2} /> : null}
    </TouchableOpacity>
  );
}
