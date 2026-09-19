/**
 * Risk Alert — Batch 3B (reference screen 10)
 *
 * Triggered from TripContext when the model flags a window as ALERT. The
 * driver has `alertSecondsLeft` to confirm they're safe, otherwise the
 * root layout escalates to Emergency.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTrip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const WARN = '#F59E0B';
const WARN_BG = '#FEF3C7';
const WARN_BORDER = '#FDE68A';
const CARD_BORDER = '#E2ECF7';

const DEFAULT_COUNTDOWN = 30;

export default function RiskAlertScreen() {
  const insets = useSafeAreaInsets();
  const { confidence, alertSecondsLeft, acknowledgeOk, triggerManualSos, settings } = useTrip();

  const pulse = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -5, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    return () => {
      pulse.stopAnimation();
      shake.stopAnimation();
    };
  }, [pulse, shake]);

  const countdownMax = settings.countdownSeconds ?? DEFAULT_COUNTDOWN;
  const progressPct = Math.max(0, Math.min(100, (alertSecondsLeft / countdownMax) * 100));

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Feather name="alert-triangle" size={16} color={WARN} />
            <Text style={styles.eyebrow}>POTENTIAL RISK</Text>
          </View>
          <Text style={styles.subEyebrow}>AERA AI DETECTION</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pulse }, { translateX: shake }] }}>
          <Mascot size={168} pose="alert" />
        </Animated.View>

        <Text style={styles.title}>Potential Risk Detected</Text>
        <Text style={styles.sub}>I noticed some unusual movement.</Text>

        {/* Countdown card */}
        <View style={styles.countdownCard}>
          <Text style={styles.countdownNum}>{alertSecondsLeft}</Text>
          <Text style={styles.countdownLabel}>seconds</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.countdownQuestion}>Are you okay?</Text>
        </View>

        {/* Detection detail — only show what we actually have. Confidence
             may be null for a manual/mock alert; hide the whole card in
             that case so we never fabricate a percentage.  */}
        {confidence != null && (
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>AI Confidence</Text>
              <Text style={styles.detailValue}>
                {Math.round(confidence * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="I'm OK — I'm Safe"
            onPress={() => { acknowledgeOk(); router.replace('/trip'); }}
            style={styles.actionBtn}
            testID="im-ok"
          />
          <Pressable
            onPress={() => {
              void triggerManualSos();
              router.replace('/emergency');
            }}
            style={styles.sosBtn}
            accessibilityRole="button"
          >
            <Feather name="alert-octagon" size={16} color="#B91C1C" />
            <Text style={styles.sosText}>Send SOS</Text>
          </Pressable>
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, alignItems: 'center', gap: 12 },

  header: { alignItems: 'center', gap: 4 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { color: WARN, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  subEyebrow: { color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  title: { color: NAVY, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  sub: { color: NAVY_SOFT, fontSize: 14, textAlign: 'center' },

  countdownCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: WARN_BG,
    borderColor: WARN_BORDER,
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 20,
    gap: 6,
  },
  countdownNum: { color: WARN, fontSize: 72, fontWeight: '900', letterSpacing: -3, lineHeight: 76 },
  countdownLabel: { color: NAVY_SOFT, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  progressTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDE68A',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: WARN },
  countdownQuestion: { color: NAVY, fontSize: 15, fontWeight: '700', marginTop: 8 },

  detailCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: CARD_BORDER,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  detailValue: { color: NAVY, fontSize: 20, fontWeight: '900' },
  detailNote: { color: NAVY_SOFT, fontSize: 12, lineHeight: 18 },

  actions: { alignSelf: 'stretch', gap: 10, marginTop: 'auto' },
  actionBtn: { alignSelf: 'stretch' },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
  },
  sosText: { color: '#B91C1C', fontSize: 14, fontWeight: '800' },
});
