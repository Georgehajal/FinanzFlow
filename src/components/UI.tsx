import React from 'react';
import { View, Text, TouchableOpacity, TextInput, AccessibilityRole } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CFIcon from './CFIcon';
import { Theme } from '../theme/tokens';
import { space, type as type_, weight, radius, touch, shadow, moneySymbol, moneyColor, MoneyDirection } from '../theme/tokens';

// ── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({
  theme, title, onBack, onClose, right,
}: {
  theme: Theme; title: string;
  onBack?: () => void; onClose?: () => void; right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const leftIconName = onClose ? 'close' : 'arrowLeft';
  const leftLabel = onClose ? 'Schließen' : 'Zurück';
  return (
    <View style={{
      paddingTop: insets.top + space.md, paddingHorizontal: space.md, paddingBottom: space.xs,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {onBack || onClose ? (
        <TouchableOpacity
          onPress={onBack ?? onClose}
          accessibilityRole="button"
          accessibilityLabel={leftLabel}
          style={{ width: touch.min, height: touch.min, borderRadius: touch.min / 2, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <CFIcon name={leftIconName as any} size={20} color={theme.text} />
        </TouchableOpacity>
      ) : <View style={{ width: touch.min }} />}
      <Text
        accessibilityRole="header"
        style={{ fontSize: type_.bodyLg, fontWeight: weight.semibold, color: theme.text, flex: 1, textAlign: 'center', marginHorizontal: space.xs }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right ?? <View style={{ width: touch.min }} />}
    </View>
  );
}

// ── Section Label (ALL CAPS Untertitel) ──────────────────────────────────────

export function SectionLabel({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs,
        fontSize: type_.caption, color: theme.textMuted, fontWeight: weight.semibold,
        textTransform: 'uppercase', letterSpacing: 0.6,
      }}
    >
      {children}
    </Text>
  );
}

// ── Card-Varianten ───────────────────────────────────────────────────────────

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ marginHorizontal: space.md, backgroundColor: theme.surface, borderRadius: radius.lg, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

// Hero-Card: für Cashflow + Vermögen — größer, mit Akzent-Rahmen oben
export function HeroCard({
  theme, children, accent, style,
}: { theme: Theme; children: React.ReactNode; accent?: string; style?: any }) {
  const c = accent ?? theme.accent;
  return (
    <View style={[{
      marginHorizontal: space.md,
      backgroundColor: theme.surface,
      borderRadius: radius.xl,
      padding: space.lg,
      borderTopWidth: 3,
      borderTopColor: c,
      ...shadow.md,
    }, style]}>
      {children}
    </View>
  );
}

// Action-Tile: Quick-Action-Button mit Icon + Label + Touch-Target ≥44pt
export function ActionTile({
  theme, icon, label, color, onPress, accessibilityLabel: a11yLabel,
}: {
  theme: Theme; icon: string; label: string; color: string;
  onPress: () => void; accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      style={{
        flex: 1,
        minHeight: 72,
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        padding: space.sm,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.xxs,
      }}
    >
      <CFIcon name={icon as any} size={22} color={color} stroke={2.2} />
      <Text style={{ fontSize: type_.caption, fontWeight: weight.semibold, color: theme.text, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── FieldRow + TextField + DateField ─────────────────────────────────────────

export function FieldRow({
  theme, label, children, last,
}: { theme: Theme; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{
      paddingHorizontal: space.md, paddingVertical: space.sm,
      minHeight: touch.min,
      borderBottomWidth: last ? 0 : 0.5, borderBottomColor: theme.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    }}>
      <Text style={{ fontSize: type_.body, color: theme.textMuted }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

export function TextField({
  theme, value, onChangeText, placeholder, keyboardType, align = 'right',
  accessibilityLabel: a11yLabel,
}: {
  theme: Theme; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; align?: 'left' | 'right';
  accessibilityLabel?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textDim}
      keyboardType={keyboardType}
      accessibilityLabel={a11yLabel}
      style={{
        fontSize: type_.body, color: theme.text, textAlign: align,
        minWidth: 80, padding: 0, minHeight: 32,
      }}
    />
  );
}

// Datumsfeld TT.MM.JJJJ — autoformatiert beim Tippen.
export function DateField({
  theme, value, onChangeText, placeholder, align = 'right',
}: {
  theme: Theme; value: string; onChangeText: (t: string) => void;
  placeholder?: string; align?: 'left' | 'right';
}) {
  const handleChange = (t: string) => {
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
      accessibilityLabel={placeholder ?? 'Datum'}
      accessibilityHint="Format Tag Punkt Monat Punkt Jahr"
      style={{
        fontSize: type_.body, color: theme.text, textAlign: align,
        minWidth: 110, padding: 0, minHeight: 32,
      }}
    />
  );
}

// MoneyField: TextField + Live-Format-Vorschau direkt darunter
export function MoneyField({
  theme, value, onChangeText, placeholder = '0',
  accessibilityLabel: a11yLabel,
}: {
  theme: Theme; value: string; onChangeText: (t: string) => void;
  placeholder?: string; accessibilityLabel?: string;
}) {
  const parsed = parseFloat((value || '').replace(',', '.'));
  const hasValid = !isNaN(parsed) && value.trim() !== '';
  const preview = hasValid
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(parsed)
    : null;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
        keyboardType="decimal-pad"
        accessibilityLabel={a11yLabel ?? 'Betrag in Euro'}
        style={{ fontSize: type_.body, color: theme.text, textAlign: 'right', minWidth: 80, padding: 0, minHeight: 32 }}
      />
      {preview && (
        <Text style={{ fontSize: type_.caption, color: theme.textDim, marginTop: 2 }}>
          → {preview}
        </Text>
      )}
    </View>
  );
}

// ── PrimaryButton + SecondaryButton ──────────────────────────────────────────

export function PrimaryButton({
  theme, label, icon, onPress, disabled, accessibilityLabel: a11yLabel,
}: { theme: Theme; label: string; icon?: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        minHeight: 54, borderRadius: radius.lg, backgroundColor: theme.accent,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: space.md,
      }}
    >
      {icon ? <CFIcon name={icon as any} size={18} color={theme.accentInk} stroke={2.6} /> : null}
      <Text style={{ fontSize: type_.body, fontWeight: weight.bold, color: theme.accentInk }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  theme, label, icon, onPress, danger,
}: { theme: Theme; label: string; icon?: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? theme.expense : theme.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 50, borderRadius: radius.lg,
        backgroundColor: danger ? theme.expense + '1F' : theme.surface,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
        paddingHorizontal: space.md,
      }}
    >
      {icon ? <CFIcon name={icon as any} size={16} color={color} stroke={2.4} /> : null}
      <Text style={{ fontSize: type_.body, fontWeight: weight.semibold, color }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Pill — Auswahl-Element, jetzt mit min Touch-Target ───────────────────────

export function Pill({
  theme, active, label, color, onPress,
}: { theme: Theme; active: boolean; label: string; color?: string; onPress: () => void }) {
  const c = color ?? theme.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{
        minHeight: 40,
        paddingVertical: space.xs, paddingHorizontal: space.sm + 2, borderRadius: radius.pill,
        backgroundColor: active ? c + '24' : theme.surface,
        borderWidth: 1, borderColor: active ? c + '66' : 'transparent',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: type_.small, fontWeight: weight.semibold, color: active ? c : theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── MonthSwitcher — Touch-Targets auf 44pt ──────────────────────────────────

export function MonthSwitcher({
  theme, label, onPrev, onNext,
}: { theme: Theme; label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, paddingTop: space.xs, paddingBottom: space.xs }}>
      <TouchableOpacity
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Vorheriger Monat"
        style={{ width: touch.min, height: touch.min, borderRadius: touch.min / 2, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}
      >
        <CFIcon name="arrowLeft" size={18} color={theme.text} />
      </TouchableOpacity>
      <Text
        accessibilityRole="header"
        accessibilityLabel={`Monat: ${label}`}
        style={{ fontSize: type_.body, fontWeight: weight.bold, color: theme.text, minWidth: 160, textAlign: 'center' }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="Nächster Monat"
        style={{ width: touch.min, height: touch.min, borderRadius: touch.min / 2, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}
      >
        <CFIcon name="chevron" size={18} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
}

// ── EmptyState — mit Icon + CTA ──────────────────────────────────────────────

export function EmptyState({
  theme, text, icon, ctaLabel, onCtaPress,
}: {
  theme: Theme;
  text: string;
  icon?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}) {
  return (
    <View style={{ paddingVertical: space.xl, paddingHorizontal: space.lg, alignItems: 'center', gap: space.sm }}>
      {icon && (
        <View style={{ width: 56, height: 56, borderRadius: radius.lg, backgroundColor: theme.accent + '14', alignItems: 'center', justifyContent: 'center', marginBottom: space.xxs }}>
          <CFIcon name={icon as any} size={26} color={theme.accent} stroke={2.2} />
        </View>
      )}
      <Text style={{ color: theme.textMuted, fontSize: type_.small, textAlign: 'center' }}>{text}</Text>
      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          onPress={onCtaPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={{
            marginTop: space.xs,
            minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.lg,
            backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: type_.small, fontWeight: weight.bold, color: theme.accentInk }}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── MoneyAmount — Symbol + Vorzeichen + Farbe (nie nur Farbe!) ───────────────

export function MoneyAmount({
  theme, amount, direction, size = 'body', decimals = 2, showSymbol = true,
}: {
  theme: Theme;
  amount: number;
  direction?: MoneyDirection;
  size?: 'caption' | 'small' | 'body' | 'bodyLg' | 'title' | 'heading' | 'display';
  decimals?: number;
  showSymbol?: boolean;
}) {
  const dir: MoneyDirection = direction
    ?? (amount > 0 ? 'in' : amount < 0 ? 'out' : 'neutral');
  const color = moneyColor(theme, dir);
  const sym = showSymbol && dir !== 'neutral' ? moneySymbol[dir] + ' ' : '';
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(Math.abs(amount));
  const prefix = dir === 'in' ? '+' : dir === 'out' ? '−' : '';
  const accessibilityLabel = dir === 'in'
    ? `Einnahme ${formatted} Euro`
    : dir === 'out'
    ? `Ausgabe ${formatted} Euro`
    : `${formatted} Euro`;
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      style={{
        fontSize: type_[size],
        fontWeight: weight.bold,
        color,
        letterSpacing: size === 'display' ? -1 : 0,
      }}
    >
      {sym}{prefix}{formatted} €
    </Text>
  );
}

// ── IconButton — barrierefreier Icon-Button mit Touch-Target ─────────────────

export function IconButton({
  theme, icon, onPress, accessibilityLabel, color, bg, size = touch.min, iconSize = 18,
}: {
  theme: Theme;
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  bg?: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: bg ?? theme.surface,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <CFIcon name={icon as any} size={iconSize} color={color ?? theme.text} />
    </TouchableOpacity>
  );
}

// Re-exports für bequeme Imports in Screens
export { space, type_ as type, weight, radius, touch, shadow };
