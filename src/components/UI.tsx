import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CFIcon from './CFIcon';
import { Theme } from '../theme/tokens';

export function TopBar({
  theme, title, onBack, onClose, right,
}: {
  theme: Theme; title: string;
  onBack?: () => void; onClose?: () => void; right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 8,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {onBack || onClose ? (
        <TouchableOpacity
          onPress={onBack ?? onClose}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <CFIcon name={(onClose ? 'close' : 'arrowLeft') as any} size={18} color={theme.text} />
        </TouchableOpacity>
      ) : <View style={{ width: 36 }} />}
      <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }} numberOfLines={1}>{title}</Text>
      {right ?? <View style={{ width: 36 }} />}
    </View>
  );
}

export function SectionLabel({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <Text style={{
      paddingHorizontal: 24, paddingBottom: 6, paddingTop: 4,
      fontSize: 12, color: theme.textMuted, fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {children}
    </Text>
  );
}

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

export function FieldRow({
  theme, label, children, last,
}: { theme: Theme; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <Text style={{ fontSize: 15, color: theme.textMuted }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

export function TextField({
  theme, value, onChangeText, placeholder, keyboardType, align = 'right',
}: {
  theme: Theme; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; align?: 'left' | 'right';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textDim}
      keyboardType={keyboardType}
      style={{ fontSize: 15, color: theme.text, textAlign: align, minWidth: 80, padding: 0 }}
    />
  );
}

// Datumsfeld TT.MM.JJJJ — autoformatiert beim Tippen.
// Akzeptiert nur Ziffern, fügt Punkte automatisch ein.
export function DateField({
  theme, value, onChangeText, placeholder, align = 'right',
}: {
  theme: Theme; value: string; onChangeText: (t: string) => void;
  placeholder?: string; align?: 'left' | 'right';
}) {
  const handleChange = (t: string) => {
    // Nur Ziffern + Punkte erlauben, automatisch formatieren
    const digits = t.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    else formatted = digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
    onChangeText(formatted);
  };
  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      placeholder={placeholder ?? 'TT.MM.JJJJ'}
      placeholderTextColor={theme.textDim}
      keyboardType="number-pad"
      maxLength={10}
      style={{ fontSize: 15, color: theme.text, textAlign: align, minWidth: 100, padding: 0 }}
    />
  );
}

export function PrimaryButton({
  theme, label, icon, onPress, disabled,
}: { theme: Theme; label: string; icon?: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{
        height: 54, borderRadius: 16, backgroundColor: theme.accent,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon ? <CFIcon name={icon as any} size={18} color={theme.accentInk} stroke={2.6} /> : null}
      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.accentInk }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Pill({
  theme, active, label, color, onPress,
}: { theme: Theme; active: boolean; label: string; color?: string; onPress: () => void }) {
  const c = color ?? theme.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
        backgroundColor: active ? c + '24' : theme.surface,
        borderWidth: 1, borderColor: active ? c + '66' : 'transparent',
      }}
    >
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: active ? c : theme.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MonthSwitcher({
  theme, label, onPrev, onNext,
}: { theme: Theme; label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 4, paddingBottom: 6 }}>
      <TouchableOpacity onPress={onPrev} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
        <CFIcon name={'arrowLeft' as any} size={15} color={theme.text} />
      </TouchableOpacity>
      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, minWidth: 140, textAlign: 'center' }}>{label}</Text>
      <TouchableOpacity onPress={onNext} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
        <CFIcon name={'chevron' as any} size={15} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
}

export function EmptyState({ theme, text }: { theme: Theme; text: string }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <Text style={{ color: theme.textMuted, fontSize: 14 }}>{text}</Text>
    </View>
  );
}
