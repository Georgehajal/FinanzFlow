import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Switch, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../data/AppContext';
import CFIcon from '../components/CFIcon';

const ACCENT_SWATCHES = ['#B8F12C', '#5AC8FA', '#FF9F0A', '#BF5AF2', '#FF453A', '#34C759'];

export default function SettingsScreen() {
  const { theme, settings, updateSettings, data } = useApp();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

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
              <Text style={{ fontSize: 15.5, color: theme.text }}>Akzentfarbe</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 42 }}>
              {ACCENT_SWATCHES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => updateSettings({ accent: c })}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: settings.accent === c ? 3 : 0, borderColor: theme.text }}
                />
              ))}
            </View>
          </View>
        </Section>

        <Section label="Berichte" theme={theme}>
          <Row theme={theme} icon="pdf" bg={theme.expense} label="PDF-Export (gesamt)" onPress={() => navigation.navigate('Export')} />
          <Row theme={theme} icon="home" bg={theme.orange} label="Immobilien-PDF-Export" onPress={() => navigation.navigate('PropertyExport')} last />
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
