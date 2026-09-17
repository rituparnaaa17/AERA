/**
 * Alert Screen — Full-screen amber warning with countdown
 * Triggered when AI detects unusual motion. Driver must confirm safe.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

export default function AlertScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { confidence, alertSecondsLeft, acknowledgeOk, triggerManualSos } = useTrip();

  // Pulse warning icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    // Haptic on mount
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Shake effect on mount
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim, shakeAnim]);

  const confidencePct = Math.round((confidence ?? 0.89) * 100);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: '#FFFBEB', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.warning }]}>⚠ POTENTIAL RISK</Text>
        <Text style={[styles.eyebrowSub, { color: colors.text3 }]}>COGNISAFE-Q AI DETECTION</Text>
      </View>

      {/* ── Warning icon ── */}
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }, { translateX: shakeAnim }] }]}>
        <View style={[styles.iconOuter, { borderColor: colors.warningBorder }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.warning }]}>
            <Feather name="alert-triangle" size={40} color="#FFFFFF" />
          </View>
        </View>
      </Animated.View>

      {/* ── Main message ── */}
      <Text style={[styles.title, { color: colors.text1 }]}>Unusual Motion{'\n'}Detected</Text>
      <Text style={[styles.subtitle, { color: colors.text3 }]}>Are you okay? Please confirm below.</Text>

      {/* ── Countdown ── */}
      <View style={[styles.countdownCard, { backgroundColor: colors.warningBackground, borderColor: colors.warningBorder }]}>
        <Text style={[styles.countdownNum, { color: colors.warning }]}>{alertSecondsLeft}</Text>
        <Text style={[styles.countdownLabel, { color: colors.text2 }]}>SECONDS REMAINING</Text>
        {/* Progress bar */}
        <View style={[styles.progressBg, { backgroundColor: colors.warningBorder }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.warning,
                width: `${(alertSecondsLeft / 30) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* ── AI details ── */}
      <View style={[styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.aiRow}>
          <View>
            <Text style={[styles.aiLabel, { color: colors.text3 }]}>AI CONFIDENCE</Text>
            <Text style={[styles.aiValue, { color: colors.text1 }]}>{confidencePct}%</Text>
          </View>
          <View style={[styles.confidenceBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.confidenceFill, { width: `${confidencePct}%`, backgroundColor: colors.warning }]} />
          </View>
        </View>
        <View style={[styles.aiDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.aiDetected, { color: colors.text3 }]}>DETECTED PATTERNS</Text>
        {['Sudden acceleration detected', 'Increased rotational movement', 'Unusual motion pattern'].map((d) => (
          <View key={d} style={styles.detectionRow}>
            <Feather name="check-circle" size={13} color={colors.warning} />
            <Text style={[styles.detectionText, { color: colors.text2 }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <PrimaryButton
          icon="check"
          onPress={() => { acknowledgeOk(); router.replace('/trip'); }}
          variant="safe"
          testID="im-ok"
        >
          I'm OK — I'm Safe
        </PrimaryButton>
        <Pressable
          onPress={() => void triggerManualSos()}
          style={[styles.sosBtn, { borderColor: colors.warningBorder }]}
        >
          <Feather name="shield" size={18} color={colors.destructive} />
          <Text style={[styles.sosBtnText, { color: colors.destructive }]}>Send Emergency Alert</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  eyebrow: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  eyebrowSub: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600', marginTop: 2 },

  iconWrap: { alignSelf: 'center', marginBottom: 24 },
  iconOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },

  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1, textAlign: 'center', lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },

  countdownCard: { borderRadius: 22, borderWidth: 1.5, padding: 22, alignItems: 'center', gap: 6, marginBottom: 16 },
  countdownNum: { fontSize: 80, fontWeight: '900', letterSpacing: -3, lineHeight: 84 },
  countdownLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  progressBg: { width: '100%', height: 6, borderRadius: 6, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 6 },

  aiCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 10, marginBottom: 20 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  aiLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  aiValue: { fontSize: 22, fontWeight: '800' },
  confidenceBar: { flex: 1, height: 8, borderRadius: 6, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 6 },
  aiDivider: { height: 1 },
  aiDetected: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  detectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detectionText: { fontSize: 13 },

  actions: { gap: 12, marginTop: 'auto' },
  sosBtn: { height: 56, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  sosBtnText: { fontSize: 16, fontWeight: '700' },
});