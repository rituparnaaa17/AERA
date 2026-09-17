/**
 * Trip Summary Screen — Post-trip summary with score and timeline
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lastCompletedTrip, dismissCompletedTrip } = useTrip();

  const scoreAnim = useRef(new Animated.Value(0)).current;

  if (!lastCompletedTrip) {
    router.replace('/');
    return null;
  }

  const alerts = lastCompletedTrip.alertCount ?? lastCompletedTrip.events.filter((e) => e.status === 'ALERT').length;
  const score = lastCompletedTrip.emergencyTriggered ? 52 : alerts ? 78 : 96;
  const scoreColor = score >= 90 ? colors.safe : score >= 70 ? colors.warning : colors.destructive;
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Review';

  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: score,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score, scoreAnim]);

  const durationMin = Math.floor(lastCompletedTrip.duration / 60);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 }]}
    >
      {/* ── Trip complete header ── */}
      <View style={styles.completeHeader}>
        <View style={[styles.completeIcon, { backgroundColor: colors.safeBackground, borderColor: colors.safeBorder }]}>
          <Feather name="check-circle" size={32} color={colors.safe} />
        </View>
        <Text style={[styles.completeEyebrow, { color: colors.safe }]}>TRIP COMPLETE</Text>
        <Text style={[styles.completeTitle, { color: colors.text1 }]}>You arrived safely.</Text>
        <Text style={[styles.completeSub, { color: colors.text3 }]}>
          Your monitored drive has been saved to trip history.
        </Text>
      </View>

      {/* ── Score card ── */}
      <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.scoreCardTop}>
          <View>
            <Text style={[styles.scoreLabelSmall, { color: colors.text3 }]}>SAFETY SCORE</Text>
            <Animated.Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {score}
            </Animated.Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
          </View>
          <View style={[styles.scoreIcon, { backgroundColor: scoreColor + '18' }]}>
            <Feather
              name={lastCompletedTrip.emergencyTriggered ? 'alert-triangle' : 'shield'}
              size={28}
              color={scoreColor}
            />
          </View>
        </View>
        {/* Score bar */}
        <View style={[styles.scoreBar, { backgroundColor: colors.muted }]}>
          <Animated.View
            style={[
              styles.scoreBarFill,
              {
                backgroundColor: scoreColor,
                width: scoreAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
        <Text style={[styles.scoreBarLabel, { color: colors.text4 }]}>{score} / 100</Text>
      </View>

      {/* ── Trip metrics ── */}
      <View style={[styles.metricsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TripMetric icon="clock" label="Duration" value={`${durationMin} min`} colors={colors} />
        <View style={[styles.metricsDivider, { backgroundColor: colors.border }]} />
        <TripMetric icon="navigation" label="Distance" value={`${lastCompletedTrip.distance.toFixed(1)} km`} colors={colors} />
      </View>

      {/* ── Stats ── */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <StatRow
          icon="shield"
          label="Safe Windows"
          value={`${lastCompletedTrip.safeWindows ?? 0}`}
          color={colors.safe}
          colors={colors}
        />
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <StatRow
          icon="alert-triangle"
          label="Alerts"
          value={`${alerts}`}
          color={alerts > 0 ? colors.warning : colors.text3}
          colors={colors}
        />
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <StatRow
          icon="alert-octagon"
          label="Emergencies"
          value={lastCompletedTrip.emergencyTriggered ? '1' : '0'}
          color={lastCompletedTrip.emergencyTriggered ? colors.destructive : colors.text3}
          colors={colors}
        />
      </View>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <PrimaryButton
          icon="clock"
          onPress={() => { dismissCompletedTrip(); router.replace('/history'); }}
        >
          View Trip Details
        </PrimaryButton>
        <PrimaryButton
          variant="ghost"
          icon="home"
          onPress={() => { dismissCompletedTrip(); router.replace('/'); }}
        >
          Back to Home
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

function TripMetric({ icon, label, value, colors }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.tripMetric}>
      <View style={[styles.tripMetricIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={15} color={colors.text3} />
      </View>
      <Text style={[styles.tripMetricValue, { color: colors.text1 }]}>{value}</Text>
      <Text style={[styles.tripMetricLabel, { color: colors.text3 }]}>{label}</Text>
    </View>
  );
}

function StatRow({ icon, label, value, color, colors }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.statRow}>
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.statLabel, { color: colors.text2 }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 16 },

  completeHeader: { alignItems: 'center', gap: 10, marginBottom: 8 },
  completeIcon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  completeEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  completeTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  completeSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  scoreCard: { borderRadius: 22, borderWidth: 1.5, padding: 20, gap: 14 },
  scoreCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  scoreLabelSmall: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  scoreNumber: { fontSize: 60, fontWeight: '900', letterSpacing: -2, lineHeight: 64 },
  scoreLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  scoreIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scoreBar: { height: 8, borderRadius: 8, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 8 },
  scoreBarLabel: { fontSize: 11, textAlign: 'right' },

  metricsCard: { borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', padding: 20 },
  metricsDivider: { width: 1, marginHorizontal: 20 },
  tripMetric: { flex: 1, alignItems: 'center', gap: 6 },
  tripMetricIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tripMetricValue: { fontSize: 22, fontWeight: '800' },
  tripMetricLabel: { fontSize: 12 },

  statsCard: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  statLabel: { flex: 1, fontSize: 14 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statsDivider: { height: 1, marginHorizontal: 15 },

  actions: { gap: 12, marginTop: 4 },
});