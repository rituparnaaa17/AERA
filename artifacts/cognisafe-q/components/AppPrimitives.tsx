/**
 * Cognisafe-Q Design System — AppPrimitives
 *
 * Premium, safety-focused component library.
 * All components follow the new light/red design language.
 */

import { Feather } from '@expo/vector-icons';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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

// ─── Screen Header ────────────────────────────────────────────────────────────

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow.toUpperCase()}</Text>
        ) : null}
        <Text style={[styles.title, { color: colors.text1 }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.text3 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionHeaderText, { color: colors.text1 }]}>{title}</Text>
      {action}
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

export function StatusPill({ status }: { status: SafetyStatus }) {
  const colors = useColors();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'SAFE') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => pulseAnim.stopAnimation();
  }, [status, pulseAnim]);

  const config = {
    SAFE: { label: 'SAFE', color: colors.safe, bg: colors.safeBackground, border: colors.safeBorder },
    ALERT: { label: 'ALERT', color: colors.warning, bg: colors.warningBackground, border: colors.warningBorder },
    EMERGENCY: { label: 'EMERGENCY', color: colors.destructive, bg: '#FFF0F0', border: '#FFCCCC' },
  }[status];

  return (
    <View style={[styles.statusPill, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Animated.View style={[styles.statusDot, { backgroundColor: config.color, transform: [{ scale: pulseAnim }] }]} />
      <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Large Status Indicator ───────────────────────────────────────────────────

export function SafetyStatusCard({
  status,
  label,
  confidence,
}: {
  status: SafetyStatus;
  label?: string;
  confidence?: number | null;
}) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  const ringAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    const speed = status === 'EMERGENCY' ? 500 : status === 'ALERT' ? 800 : 1800;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 0.85, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: speed * 1.3, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(ringAnim, { toValue: 0.75, duration: speed * 1.3, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    return () => { pulseAnim.stopAnimation(); ringAnim.stopAnimation(); };
  }, [status, pulseAnim, ringAnim]);

  const stateColor =
    status === 'SAFE' ? colors.safe : status === 'ALERT' ? colors.warning : colors.destructive;
  const stateLabel = label ?? (status === 'SAFE' ? 'You\'re Protected' : status === 'ALERT' ? 'Check In Now' : 'Emergency Active');
  const icon = status === 'SAFE' ? 'shield' : status === 'ALERT' ? 'alert-triangle' : 'alert-octagon';

  return (
    <View style={styles.safetyCardCenter}>
      {/* Outer ring */}
      <Animated.View
        style={[
          styles.safetyRingOuter,
          { borderColor: stateColor, opacity: ringAnim },
        ]}
      />
      {/* Inner glow */}
      <Animated.View
        style={[
          styles.safetyRingInner,
          { backgroundColor: `${stateColor}18`, transform: [{ scale: pulseAnim }] },
        ]}
      />
      {/* Core circle */}
      <View style={[styles.safetyCore, { backgroundColor: stateColor }]}>
        <Feather name={icon} size={34} color="#FFFFFF" />
      </View>
      <Text style={[styles.safetyStatusLabel, { color: stateColor }]}>{status}</Text>
      <Text style={[styles.safetyStateSubtitle, { color: colors.text2 }]}>{stateLabel}</Text>
      {confidence != null ? (
        <Text style={[styles.safetyConfidence, { color: colors.text4 }]}>
          {Math.round(confidence * 100)}% AI confidence
        </Text>
      ) : null}
    </View>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────

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
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'safe';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const palette = {
    primary: { backgroundColor: colors.primary, foreground: '#FFFFFF', borderColor: colors.primary },
    secondary: { backgroundColor: colors.card, foreground: colors.text1, borderColor: colors.border },
    danger: { backgroundColor: colors.destructive, foreground: '#FFFFFF', borderColor: colors.destructive },
    ghost: { backgroundColor: 'transparent', foreground: colors.primary, borderColor: colors.border },
    safe: { backgroundColor: colors.safe, foreground: '#FFFFFF', borderColor: colors.safe },
  }[variant];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.button,
          { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        {loading ? <ActivityIndicator color={palette.foreground} size="small" /> : null}
        {!loading && icon ? <Feather name={icon} size={18} color={palette.foreground} /> : null}
        <Text style={[styles.buttonText, { color: palette.foreground }]}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

export function SectionLabel({ children }: PropsWithChildren) {
  const colors = useColors();
  return <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{children}</Text>;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

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
      <View style={styles.metricRow}>
        <Text style={[styles.metricValue, { color: colors.text1 }]}>{value}</Text>
        {unit ? <Text style={[styles.metricUnit, { color: colors.text3 }]}>{unit}</Text> : null}
      </View>
      <Text style={[styles.metricLabel, { color: colors.text3 }]}>{label}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

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
      <View style={[styles.emptyIconWrap, { backgroundColor: '#FFF0F0' }]}>
        <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text1 }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.text3 }]}>{body}</Text>
    </View>
  );
}

// ─── Icon Button ─────────────────────────────────────────────────────────────

export function IconButton({
  icon,
  onPress,
  variant = 'default',
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  variant?: 'default' | 'primary' | 'ghost';
}) {
  const colors = useColors();
  const bg = variant === 'primary' ? colors.primary : variant === 'ghost' ? 'transparent' : colors.card;
  const fg = variant === 'primary' ? '#FFFFFF' : colors.text2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Feather name={icon} size={19} color={fg} />
    </Pressable>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  noPadding,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; noPadding?: boolean }>) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        !noPadding && styles.cardPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 6, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, lineHeight: 36 },
  headerSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionHeaderText: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

  // Status pill
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  // Safety status card
  safetyCardCenter: { alignItems: 'center', paddingVertical: 8 },
  safetyRingOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    top: 8 - 90 + 60,
  },
  safetyRingInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 8 - 70 + 60,
  },
  safetyCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  safetyStatusLabel: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  safetyStateSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  safetyConfidence: { fontSize: 12, marginTop: 4 },

  // Button
  button: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  disabled: { opacity: 0.45 },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 10 },

  // Metric
  metric: { flex: 1 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  metricValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  metricUnit: { fontSize: 13, fontWeight: '600', paddingBottom: 3 },
  metricLabel: { fontSize: 12, marginTop: 3, fontWeight: '500' },

  // Empty state
  empty: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 10,
  },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 260 },

  // Icon button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card
  card: { borderRadius: 24, borderWidth: 1.5 },
  cardPadding: { padding: 20 },

  // Divider
  divider: { height: 1, marginHorizontal: 0 },
});