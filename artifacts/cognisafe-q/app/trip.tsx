/**
 * Trip Screen — Full-screen glanceable monitoring view
 * Star screen of Cognisafe-Q. Premium, minimal, safety-command-center feel.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { PrimaryButton } from '@/components/AppPrimitives';
import { SOSButton } from '@/components/SOSButton';
import { useTrip } from '@/components/TripContext';

const formatTime = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function TripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    tripActive,
    status,
    elapsedSeconds,
    distanceKm,
    speedKmh,
    confidence,
    alertSecondsLeft,
    emergencySent,
    canCancelEmergency,
    stopTrip,
    acknowledgeOk,
    cancelEmergency,
    triggerManualSos,
  } = useTrip();

  if (!tripActive) {
    router.replace('/');
    return null;
  }

  const statusColor =
    status === 'SAFE' ? colors.safe : status === 'ALERT' ? colors.warning : colors.destructive;
  const statusBg =
    status === 'SAFE' ? colors.safeBackground : status === 'ALERT' ? colors.warningBackground : '#FFF0F0';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const outerRingAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const speed = status === 'EMERGENCY' ? 400 : status === 'ALERT' ? 700 : 2000;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(outerRingAnim, { toValue: 1, duration: speed * 1.5, useNativeDriver: true }),
        Animated.timing(outerRingAnim, { toValue: 0.8, duration: speed * 1.5, useNativeDriver: true }),
      ])
    ).start();
    return () => { pulseAnim.stopAnimation(); outerRingAnim.stopAnimation(); };
  }, [status, pulseAnim, outerRingAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.topBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="chevron-left" size={22} color={colors.text2} />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={[styles.topTitle, { color: colors.text1 }]}>Live Trip</Text>
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.liveText, { color: statusColor }]}>MONITORING</Text>
          </View>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert('End Trip?', 'Your trip will be saved to history.', [
              { text: 'Keep driving', style: 'cancel' },
              { text: 'End trip', style: 'destructive', onPress: async () => { await stopTrip(); router.replace('/summary'); } },
            ])
          }
          style={[styles.topBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="x" size={20} color={colors.text2} />
        </Pressable>
      </View>

      {/* ── Main Status ── */}
      <View style={[styles.statusSection, { backgroundColor: statusBg }]}>
        {/* Rings */}
        <View style={styles.ringContainer}>
          <Animated.View style={[styles.outerRing, { borderColor: statusColor, opacity: outerRingAnim }]} />
          <Animated.View style={[styles.innerRing, { borderColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
          {/* Core */}
          <View style={[styles.statusCore, { backgroundColor: statusColor }]}>
            <Feather
              name={status === 'SAFE' ? 'shield' : status === 'ALERT' ? 'alert-triangle' : 'alert-octagon'}
              size={36}
              color="#FFFFFF"
            />
          </View>
        </View>
        <Text style={[styles.bigStatus, { color: statusColor }]}>
          {status === 'SAFE' ? 'SAFE' : status === 'ALERT' ? 'ALERT' : 'EMERGENCY'}
        </Text>
        <Text style={[styles.statusSub, { color: colors.text3 }]}>
          {status === 'SAFE' ? 'Monitoring your journey' : status === 'ALERT' ? 'Unusual motion detected' : 'Emergency response active'}
        </Text>
        {confidence != null && (
          <Text style={[styles.confidenceText, { color: colors.text4 }]}>
            {Math.round(confidence * 100)}% AI confidence
          </Text>
        )}
      </View>

      {/* ── Speed Gauge ── */}
      <View style={[styles.speedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.speedMain}>
          <Text style={[styles.speedNumber, { color: statusColor }]}>{Math.round(speedKmh)}</Text>
          <Text style={[styles.speedUnit, { color: colors.text3 }]}>km/h</Text>
        </View>
        <View style={[styles.speedTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.speedFill, { width: `${Math.min(100, (speedKmh / 140) * 100)}%`, backgroundColor: statusColor }]} />
        </View>
      </View>

      {/* ── Trip Metrics ── */}
      <View style={[styles.metricsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TripMetric label="Duration" value={formatTime(elapsedSeconds)} icon="clock" color={colors.text1} colors={colors} />
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <TripMetric label="Distance" value={`${distanceKm.toFixed(1)} km`} icon="navigation" color={colors.text1} colors={colors} />
      </View>

      {/* ── Alert Countdown Overlay ── */}
      {status === 'ALERT' && (
        <View style={[styles.alertBox, { backgroundColor: colors.warningBackground, borderColor: colors.warningBorder }]}>
          <Text style={[styles.alertBoxTitle, { color: colors.warning }]}>⚠ Are you okay?</Text>
          <Text style={[styles.countdown, { color: colors.warning }]}>{alertSecondsLeft}</Text>
          <Text style={[styles.countdownLabel, { color: colors.text3 }]}>seconds to respond</Text>
          <PrimaryButton icon="check" onPress={acknowledgeOk} testID="im-ok" variant="safe">
            I'm OK — Confirm Safe
          </PrimaryButton>
        </View>
      )}

      {/* ── Emergency Note ── */}
      {emergencySent && (
        <View style={[styles.emergencyNote, { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' }]}>
          <Feather name="radio" size={18} color={colors.destructive} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.emergencyNoteTitle, { color: colors.destructive }]}>Emergency alert sent</Text>
            <Text style={[styles.emergencyNoteSub, { color: colors.text3 }]}>Your location shared with contacts</Text>
          </View>
          {canCancelEmergency && (
            <Pressable onPress={cancelEmergency}>
              <Text style={[styles.cancelFalse, { color: colors.text3 }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── SOS Section ── */}
      {status !== 'ALERT' && (
        <View style={styles.sosSection}>
          <SOSButton
            onActivate={() => void triggerManualSos()}
            disabled={emergencySent}
          />
          <Text style={[styles.sosCap, { color: colors.text4 }]}>Hold for emergency</Text>
        </View>
      )}
    </View>
  );
}

function TripMetric({
  label, value, icon, color, colors,
}: {
  label: string; value: string; icon: React.ComponentProps<typeof Feather>['name'];
  color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.tripMetric}>
      <Feather name={icon} size={14} color={colors.text3} />
      <View>
        <Text style={[styles.tripMetricValue, { color }]}>{value}</Text>
        <Text style={[styles.tripMetricLabel, { color: colors.text3 }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  topBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  topCenter: { alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },

  // Status section
  statusSection: { alignItems: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24 },
  ringContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  outerRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1 },
  innerRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1.5 },
  statusCore: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  bigStatus: { fontSize: 26, fontWeight: '900', letterSpacing: 3 },
  statusSub: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  confidenceText: { fontSize: 12, marginTop: 4 },

  // Speed
  speedCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 12 },
  speedMain: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 12 },
  speedNumber: { fontSize: 56, fontWeight: '900', letterSpacing: -2, lineHeight: 60 },
  speedUnit: { fontSize: 16, fontWeight: '600', paddingBottom: 8 },
  speedTrack: { height: 6, borderRadius: 6, overflow: 'hidden' },
  speedFill: { height: '100%', borderRadius: 6, minWidth: 6 },

  // Metrics
  metricsCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', padding: 18, marginBottom: 12 },
  metricDivider: { width: 1, marginHorizontal: 18 },
  tripMetric: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  tripMetricValue: { fontSize: 18, fontWeight: '700' },
  tripMetricLabel: { fontSize: 12, marginTop: 2 },

  // Alert box
  alertBox: { marginHorizontal: 20, borderRadius: 22, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 10, marginBottom: 12 },
  alertBoxTitle: { fontSize: 16, fontWeight: '700' },
  countdown: { fontSize: 68, fontWeight: '900', letterSpacing: -2, lineHeight: 72 },
  countdownLabel: { fontSize: 14, marginBottom: 4 },

  // Emergency note
  emergencyNote: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  emergencyNoteTitle: { fontSize: 14, fontWeight: '700' },
  emergencyNoteSub: { fontSize: 12, marginTop: 2 },
  cancelFalse: { fontSize: 12, fontWeight: '600' },

  // SOS
  sosSection: { alignItems: 'center', gap: 8, marginTop: 8 },
  sosCap: { fontSize: 12, fontWeight: '500' },
});