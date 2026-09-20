/**
 * Live Trip — Batch 3B (reference screen 8)
 *
 * Composition:
 *   • Top bar with back / title / close
 *   • Green "Monitoring" pill
 *   • Driving mascot inside soft radial rings
 *   • Live metrics row: Speed / Distance / Duration (all real state)
 *   • Sensor Health card (shared component)
 *   • Red swipe-to-activate SOS (reuses SlideToConfirm with variant="red")
 *
 * The screen auto-navigates to Alert / Emergency / Summary via the root
 * layout's status watcher — same routing logic as before, unchanged.
 */

import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SensorGrid } from '@/components/SensorTiles';
import { SlideToConfirm } from '@/components/SlideToConfirm';
import { useTrip } from '@/components/TripContext';
import { SensorDebugPanel } from '@/components/SensorDebugPanel';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const CARD_BORDER = '#E2ECF7';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';

const formatTime = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(
    Math.floor((s % 3600) / 60)
  ).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function LiveTripScreen() {
  const insets = useSafeAreaInsets();
  const {
    tripActive,
    status,
    elapsedSeconds,
    distanceKm,
    speedKmh,
    confidence,
    stopTrip,
    triggerManualSos,
    settings,
    networkAvailable,
    windowsProcessed,
    lastCompletedTrip,
  } = useTrip();

  const pulse = useRef(new Animated.Value(1)).current;

  // Hooks BEFORE any conditional return.
  // Only fall back to Home if there is no trip in flight AND no just-completed
  // trip waiting to be shown in the summary — otherwise the "End Trip" handoff
  // to /summary races and lands us on the landing page.
  useEffect(() => {
    if (!tripActive && !lastCompletedTrip) router.replace('/(tabs)');
  }, [tripActive, lastCompletedTrip]);

  useEffect(() => {
    const speed = status === 'EMERGENCY' ? 400 : status === 'ALERT' ? 700 : 2000;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, [status, pulse]);

  if (!tripActive) return null;

  const statusColor = status === 'EMERGENCY' ? DANGER : status === 'ALERT' ? WARN : SAFE;
  const pillLabel = status === 'EMERGENCY' ? 'Emergency' : status === 'ALERT' ? 'Alerted' : 'Monitoring';
  const encouragement =
    status === 'EMERGENCY'
      ? 'Emergency response active'
      : status === 'ALERT'
      ? 'Please confirm you\'re okay'
      : "You're doing great!";

  const endTripConfirm = () =>
    Alert.alert('End Trip?', 'Your trip will be saved to history.', [
      { text: 'Keep driving', style: 'cancel' },
      {
        text: 'End trip',
        style: 'destructive',
        onPress: async () => {
          await stopTrip();
          router.replace('/summary');
        },
      },
    ]);

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.topBtn} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={NAVY} />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>Live Trip</Text>
          <View
            style={[
              styles.monitorPill,
              { backgroundColor: statusColor + '1F', borderColor: statusColor + '55' },
            ]}
          >
            <Animated.View
              style={[styles.monitorDot, { backgroundColor: statusColor, transform: [{ scale: pulse }] }]}
            />
            <Text style={[styles.monitorText, { color: statusColor }]}>{pillLabel}</Text>
          </View>
        </View>
        <Pressable onPress={endTripConfirm} style={styles.topBtn} hitSlop={8}>
          <Feather name="x" size={20} color={NAVY} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mascot inside soft rings ── */}
        <View style={styles.heroCard}>
          <View style={styles.ringWrap}>
            <Animated.View
              style={[styles.ringOuter, { borderColor: statusColor + '55', transform: [{ scale: pulse }] }]}
            />
            <View style={[styles.ringInner, { backgroundColor: statusColor + '14' }]} />
            <Mascot size={172} pose="driving" />
          </View>
          <Text style={styles.heroTitle}>{encouragement}</Text>
          <Text style={styles.heroSub}>Stay focused. Drive safe.</Text>
          {confidence != null && (
            <Text style={styles.confidenceText}>{Math.round(confidence * 100)}% AI confidence</Text>
          )}
        </View>

        {/* ── Metrics ── */}
        <View style={styles.metricsRow}>
          <MetricTile label="Speed" value={`${Math.round(speedKmh)}`} unit="km/h" color={statusColor} />
          <MetricTile label="Distance" value={distanceKm.toFixed(1)} unit="km" />
          <MetricTile label="Duration" value={formatTime(elapsedSeconds)} />
        </View>

        {/* ── AI Analyze quick-link ── */}
        <Pressable
          onPress={() => router.push('/analyzing')}
          style={styles.aiLink}
          accessibilityRole="button"
        >
          <View style={styles.aiIconBubble}>
            <Feather name="cpu" size={16} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiLinkTitle}>View AI Analysis</Text>
            <Text style={styles.aiLinkSub}>See what the model is checking right now.</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </Pressable>

        {/* ── End Trip CTA Card ── */}
        <View style={styles.endTripCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.endTripTitle}>Reached your destination?</Text>
            <Text style={styles.endTripSub}>Stop safety monitoring and view your drive summary.</Text>
          </View>
          <PrimaryButton
            label="End Trip Safely"
            onPress={endTripConfirm}
            style={styles.endTripBtn}
          />
        </View>

        {/* ── Sensor Health ── */}
        <Text style={styles.sectionTitle}>Sensor Health</Text>
        <SensorGrid
          isMockAi={settings.mockAi}
          isOffline={!networkAvailable}
          windowsProcessed={windowsProcessed}
        />

        {/* ── Swipe SOS ── */}
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Emergency</Text>
        <View style={styles.sosCard}>
          <Text style={styles.sosCardCopy}>
            Swipe to send an SOS to your emergency contacts with your live location.
          </Text>
          <View style={{ marginTop: 4 }}>
            <SlideToConfirm
              variant="red"
              label="Swipe to Send SOS"
              onConfirm={() => {
                void triggerManualSos();
                router.replace('/emergency');
              }}
            />
          </View>
        </View>

        {/* ── Diagnostics Debug Panel ── */}
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Real-Time Diagnostics</Text>
        <SensorDebugPanel />
      </ScrollView>
    </AppBackground>
  );
}

function MetricTile({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: { alignItems: 'center' },
  topTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },
  monitorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  monitorDot: { width: 7, height: 7, borderRadius: 3.5 },
  monitorText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  scroll: { paddingHorizontal: 20, gap: 16 },

  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 4,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  ringWrap: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ringOuter: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 1.5 },
  ringInner: { position: 'absolute', width: 172, height: 172, borderRadius: 86 },
  heroTitle: { color: NAVY, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: NAVY_SOFT, fontSize: 13 },
  confidenceText: { color: MUTED, fontSize: 12, marginTop: 2 },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue: { color: NAVY, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  metricUnit: { color: MUTED, fontSize: 12, fontWeight: '600' },

  sectionTitle: { color: NAVY, fontSize: 15, fontWeight: '800', letterSpacing: -0.2, marginTop: 4 },

  sosCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  sosCardCopy: { color: '#7F1D1D', fontSize: 13, lineHeight: 19 },

  aiLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 14,
  },
  aiIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLinkTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  aiLinkSub: { color: NAVY_SOFT, fontSize: 12, marginTop: 2 },

  endTripCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB33',
    borderRadius: 22,
    padding: 16,
    gap: 12,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  endTripTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },
  endTripSub: { color: NAVY_SOFT, fontSize: 13, marginTop: 2 },
  endTripBtn: { backgroundColor: NAVY, height: 50 },
});
