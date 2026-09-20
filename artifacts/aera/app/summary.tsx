/**
 * Trip Complete — AERA
 *
 * Shows a Trip Safety Score derived from whether the trip had alerts or
 * emergencies. This is a SAFETY RATING BAND — not raw AI confidence.
 *
 * Score bands:
 *   96 = Clean trip (no alerts)
 *   78 = Trip had potential risk alerts
 *   52 = Emergency was triggered
 *
 * The score label is "Trip Safety Score" — never shown as "AI confidence".
 * Real detection confidence is separately shown in the Events section if
 * the trip had incidents.
 *
 * All displayed values come from lastCompletedTrip which is recorded from
 * real sensor data during the trip.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QSafetyHalo } from '@/components/QSafetyHalo';
import { useTrip, type Trip } from '@/components/TripContext';
import { getTripKind, calculateTripScore } from '@/utils/tripUtils';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';
const CARD_BORDER = '#E2ECF7';

export default function TripCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { lastCompletedTrip, dismissCompletedTrip } = useTrip();
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // If someone lands here with no completed trip, drop them onto the Home
    // Dashboard (the tabs group), not the Landing splash.
    if (!lastCompletedTrip) router.replace('/(tabs)');
  }, [lastCompletedTrip]);

  const alerts = lastCompletedTrip
    ? lastCompletedTrip.alertCount ?? lastCompletedTrip.events.filter((e) => e.status === 'ALERT').length
    : 0;
  const tripKind = lastCompletedTrip ? getTripKind(lastCompletedTrip) : 'safe';
  const isEmergency = tripKind === 'emergency';
  const emergencies = isEmergency ? 1 : 0;
  const score = lastCompletedTrip ? calculateTripScore(lastCompletedTrip) : 100;

  const scoreColor = score >= 90 ? SAFE : score >= 70 ? WARN : DANGER;
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Review';

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: score,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score, scoreAnim]);

  if (!lastCompletedTrip) return null;

  const durationMin = Math.floor(lastCompletedTrip.duration / 60);
  const mascotPose = isEmergency ? 'heart' : 'celebrate';

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Mascot size={140} pose={mascotPose} />
          <Text style={styles.eyebrow}>TRIP COMPLETE</Text>
          <Text style={styles.title}>
            {isEmergency ? 'Take care of yourself.' : 'You drove safely.'}
          </Text>
          <Text style={styles.sub}>Your monitored drive has been saved to trip history.</Text>
        </View>

        {/* Trip Safety Score (safety rating band — not AI confidence) */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreSectionLabel}>TRIP SAFETY SCORE</Text>
          <QSafetyHalo
            value={score}
            size={200}
            stroke={11}
            color={scoreColor}
            centerLabel={`${score}`}
            centerCaption={scoreLabel}
            centerColor={scoreColor}
            captionColor={NAVY_SOFT}
          />
          <Text style={styles.scoreNote}>
            {isEmergency
              ? 'Emergency was triggered during this trip.'
              : alerts > 0
              ? 'Potential risks were detected but no emergency was needed.'
              : 'No safety alerts were triggered on this trip.'}
          </Text>
        </View>

        {/* Distance + duration — real values from trip */}
        <View style={styles.metricsRow}>
          <MetricTile label="Distance" value={`${lastCompletedTrip.distance.toFixed(1)}`} unit="km" />
          <MetricTile label="Duration" value={`${durationMin}`} unit="min" />
        </View>

        {/* Stats — all real, from trip record */}
        <View style={styles.statsCard}>
          <StatRow
            icon="shield"
            label="Safe Windows"
            value={lastCompletedTrip.safeWindows != null ? `${lastCompletedTrip.safeWindows}` : 'N/A'}
            color={SAFE}
          />
          <View style={styles.statDivider} />
          <StatRow icon="alert-triangle" label="Alerts" value={`${alerts}`} color={alerts > 0 ? WARN : MUTED} />
          <View style={styles.statDivider} />
          <StatRow
            icon="alert-octagon"
            label="Emergencies"
            value={`${emergencies}`}
            color={emergencies > 0 ? DANGER : MUTED}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="View Trip Details"
            onPress={() => {
              const id = lastCompletedTrip.id;
              // Navigate FIRST, then dismiss on the next tick so summary's
              // "no completed trip" guard doesn't race the intended route.
              router.replace(`/(tabs)/history?open=${encodeURIComponent(id)}`);
              setTimeout(() => dismissCompletedTrip(), 250);
            }}
            style={styles.actionBtn}
          />
          <Pressable
            onPress={() => router.push('/analytics' as never)}
            style={styles.secondaryBtn}
          >
            <Feather name="bar-chart-2" size={16} color={NAVY} />
            <Text style={styles.secondaryText}>View Safety Analytics</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              router.replace('/(tabs)');
              setTimeout(() => dismissCompletedTrip(), 250);
            }}
            style={styles.secondaryBtn}
          >
            <Feather name="home" size={16} color={NAVY} />
            <Text style={styles.secondaryText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statRow}>
      <Feather name={icon} size={16} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 16 },

  header: { alignItems: 'center', gap: 8 },
  eyebrow: { color: SAFE, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: NAVY, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  sub: { color: NAVY_SOFT, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  scoreCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    gap: 8,
  },
  scoreSectionLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scoreNote: {
    color: NAVY_SOFT,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue: { color: NAVY, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  metricUnit: { color: MUTED, fontSize: 14, fontWeight: '700' },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  statLabel: { flex: 1, color: NAVY, fontSize: 14, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800' },
  statDivider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  actions: { gap: 10 },
  actionBtn: { alignSelf: 'stretch' },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: { color: NAVY, fontSize: 14, fontWeight: '700' },
});
