import { Feather } from '@expo/vector-icons';
import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { SafetyStatus } from '@/components/TripContext';

export function ScreenHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function StatusPill({ status }: { status: SafetyStatus }) {
  const colors = useColors();
  const config = {
    SAFE: { label: 'Safe', color: colors.primary, icon: 'check-circle' as const },
    ALERT: { label: 'Attention', color: colors.warning, icon: 'alert-triangle' as const },
    EMERGENCY: { label: 'Emergency', color: colors.destructive, icon: 'alert-octagon' as const },
  }[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: `${config.color}1A` }]}>
      <Feather name={config.icon} size={14} color={config.color} />
      <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  testID,
}: PropsWithChildren<{
  onPress: () => void;
  icon?: React.ComponentProps<typeof Feather>['name'];
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const colors = useColors();
  const palette = {
    primary: { backgroundColor: colors.primary, foreground: colors.primaryForeground, borderColor: colors.primary },
    secondary: { backgroundColor: colors.secondary, foreground: colors.secondaryForeground, borderColor: colors.border },
    danger: { backgroundColor: colors.destructive, foreground: colors.destructiveForeground, borderColor: colors.destructive },
    ghost: { backgroundColor: 'transparent', foreground: colors.primary, borderColor: colors.border },
  }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.foreground} /> : null}
      {!loading && icon ? <Feather name={icon} size={18} color={palette.foreground} /> : null}
      <Text style={[styles.buttonText, { color: palette.foreground }]}>{children}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  const colors = useColors();
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{children}</Text>;
}

export function Metric({
  label,
  value,
  unit,
  style,
}: {
  label: string;
  value: string;
  unit?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View style={[styles.metric, style]}>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}<Text style={[styles.metricUnit, { color: colors.mutedForeground }]}>{unit}</Text></Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  body: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -1.1 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  button: { minHeight: 54, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  metric: { flex: 1 },
  metricValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.7 },
  metricUnit: { fontSize: 13, fontWeight: '500', letterSpacing: 0 },
  metricLabel: { fontSize: 12, marginTop: 5 },
  empty: { alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 28 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 7, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
});