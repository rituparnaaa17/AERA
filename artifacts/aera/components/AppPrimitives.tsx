/**
 * AERA Design System — AppPrimitives (Liquid Minimalism)
 *
 * Glass-surfaced, Safety-Blue-accented component library.
 * Squircle geometry: outer radius 20 → inner 14 → innermost 8.
 * Alert Red is RESERVED for emergency / destructive states only.
 */

import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { SafetyStatus } from '@/components/TripContext';

// ─── Glass Card ───────────────────────────────────────────────────────────────
// The primary container primitive. Uses BlurView on capable platforms.

export function GlassCard({
  children,
  style,
  intensity = 60,
  noPadding,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  noPadding?: boolean;
}>) {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const canBlur = Platform.OS === 'ios'; // BlurView backdrop only on iOS native

  if (canBlur) {
    return (
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.glassCard,
          { borderColor: colors.glassBorder },
          !noPadding && styles.cardPadding,
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  // Android / web: opaque tinted fallback
  return (
    <View
      style={[
        styles.glassCard,
        { backgroundColor: colors.card, borderColor: colors.glassBorder },
        !noPadding && styles.cardPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Card (legacy alias → GlassCard) ─────────────────────────────────────────

export function Card({
  children,
  style,
  noPadding,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; noPadding?: boolean }>) {
  return (
    <GlassCard style={style} noPadding={noPadding}>
      {children}
    </GlassCard>
  );
}

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
          <Text style={[styles.eyebrow, { color: colors.brandCyan }]}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: colors.text1 }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.text3 }]}>
            {subtitle}
          </Text>
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
      <Text style={[styles.sectionHeaderText, { color: colors.text2 }]}>
        {title}
      </Text>
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
    EMERGENCY: { label: 'EMERGENCY', color: colors.destructive, bg: colors.destructiveBackground, border: colors.destructiveBorder },
  }[status];

  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <Animated.View
        style={[
          styles.statusDot,
          { backgroundColor: config.color, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Text style={[styles.statusPillText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ─── Safety Status Card ───────────────────────────────────────────────────────

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
  const stateLabel =
    label ?? (status === 'SAFE' ? "You're Protected" : status === 'ALERT' ? 'Check In Now' : 'Emergency Active');
  const icon = status === 'SAFE' ? 'shield' : status === 'ALERT' ? 'alert-triangle' : 'alert-octagon';

  return (
    <View style={styles.safetyCardCenter}>
      <Animated.View
        style={[styles.safetyRingOuter, { borderColor: stateColor, opacity: ringAnim }]}
      />
      <Animated.View
        style={[
          styles.safetyRingInner,
          { backgroundColor: `${stateColor}18`, transform: [{ scale: pulseAnim }] },
        ]}
      />
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

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const palette = {
    primary: {
      backgroundColor: colors.brandBlue,
      foreground: '#FFFFFF',
      borderColor: colors.brandBlue,
      shadowColor: colors.brandBlue,
    },
    secondary: {
      backgroundColor: colors.card,
      foreground: colors.text1,
      borderColor: colors.glassBorder,
      shadowColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.destructive,
      foreground: '#FFFFFF',
      borderColor: colors.destructive,
      shadowColor: colors.destructive,
    },
    ghost: {
      backgroundColor: 'transparent',
      foreground: colors.brandBlue,
      borderColor: colors.glassBorder,
      shadowColor: 'transparent',
    },
    safe: {
      backgroundColor: colors.safe,
      foreground: '#FFFFFF',
      borderColor: colors.safe,
      shadowColor: colors.safe,
    },
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
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
            shadowColor: palette.shadowColor,
          },
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        {loading ? <ActivityIndicator color={palette.foreground} size="small" /> : null}
        {!loading && icon ? (
          <Feather name={icon} size={17} color={palette.foreground} />
        ) : null}
        <Text style={[styles.buttonText, { color: palette.foreground }]}>
          {children}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

export function SectionLabel({ children }: PropsWithChildren) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{children}</Text>
  );
}

// ─── Metric ───────────────────────────────────────────────────────────────────

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
        {unit ? (
          <Text style={[styles.metricUnit, { color: colors.text3 }]}>{unit}</Text>
        ) : null}
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
    <GlassCard style={styles.empty}>
      <View
        style={[styles.emptyIconWrap, { backgroundColor: colors.brandBlueSubtle }]}
      >
        <Feather name={icon} size={24} color={colors.brandBlue} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text1 }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.text3 }]}>{body}</Text>
    </GlassCard>
  );
}

// ─── Icon Button ──────────────────────────────────────────────────────────────

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
  const bg =
    variant === 'primary'
      ? colors.brandBlue
      : variant === 'ghost'
      ? 'transparent'
      : colors.card;
  const fg = variant === 'primary' ? '#FFFFFF' : colors.text2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg, borderColor: colors.glassBorder },
        pressed && { opacity: 0.72 },
      ]}
    >
      <Feather name={icon} size={19} color={fg} />
    </Pressable>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Glass card
  glassCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardPadding: { padding: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  headerSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Status pill
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  // Safety status card
  safetyCardCenter: { alignItems: 'center', paddingVertical: 8 },
  safetyRingOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  safetyStatusLabel: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  safetyStateSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  safetyConfidence: { fontSize: 12, marginTop: 4 },

  // Primary button
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.45 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Metric
  metric: { flex: 1 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  metricValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  metricUnit: { fontSize: 13, fontWeight: '600', paddingBottom: 3 },
  metricLabel: { fontSize: 12, marginTop: 3, fontWeight: '500' },

  // Empty state
  empty: {
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 260,
  },

  // Icon button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: { height: 1 },
});