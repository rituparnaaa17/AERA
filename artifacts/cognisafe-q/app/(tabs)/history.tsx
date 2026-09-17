/**
 * Trip History Screen — Premium visual trip cards with safety score
 */

import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, SectionHeader } from '@/components/AppPrimitives';
import { useTrip, Trip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

const formatDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(date));
const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(date));
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

function getTripScore(trip: Trip) {
  return trip.emergencyTriggered ? 52 : trip.hadAlert ? 78 : 96;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trips } = useTrip();
  const [selected, setSelected] = useState<Trip | null>(null);

  const totalScore = trips.length
    ? Math.max(72, Math.round(trips.reduce((acc, t) => acc + getTripScore(t), 0) / trips.length))
    : 96;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {selected ? (
        /* ── Trip Detail ── */
        <View>
          <Pressable onPress={() => setSelected(null)} style={styles.backRow}>
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>All Trips</Text>
          </Pressable>

          <Text style={[styles.detailDate, { color: colors.text1 }]}>{formatDate(selected.startedAt)}</Text>
          <Text style={[styles.detailMeta, { color: colors.text3 }]}>
            {formatTime(selected.startedAt)} · {formatDuration(selected.duration)} · {selected.distance.toFixed(1)} km
          </Text>

          {/* Score card */}
          <View style={[styles.detailScoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.scoreLeft}>
              <Text style={[styles.scoreLabelSm, { color: colors.text3 }]}>SAFETY SCORE</Text>
              <Text style={[styles.scoreValueLg, { color: getTripScore(selected) >= 90 ? colors.safe : colors.warning }]}>
                {getTripScore(selected)}
              </Text>
              <Text style={[styles.scoreOutOf, { color: colors.text4 }]}>out of 100</Text>
            </View>
            <View style={styles.scoreRight}>
              {[
                { label: 'Alerts', value: selected.alertCount ?? 0, color: colors.warning },
                { label: 'Emergency', value: selected.emergencyTriggered ? 1 : 0, color: colors.destructive },
                { label: 'Safe windows', value: selected.safeWindows ?? 0, color: colors.safe },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.scoreStatRow}>
                  <View style={[styles.scoreStatDot, { backgroundColor: color }]} />
                  <Text style={[styles.scoreStatLabel, { color: colors.text3 }]}>{label}</Text>
                  <Text style={[styles.scoreStatValue, { color: colors.text1 }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Timeline */}
          <SectionHeader title="Timeline" />
          <View style={[styles.timeline, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selected.events.map((event, idx) => {
              const eventColor =
                event.status === 'EMERGENCY'
                  ? colors.destructive
                  : event.status === 'ALERT'
                  ? colors.warning
                  : event.status === 'CANCELLED'
                  ? colors.text3
                  : colors.safe;
              return (
                <View key={event.id}>
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: eventColor }]} />
                      {idx < selected.events.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    <View style={styles.timelineCopy}>
                      <Text style={[styles.timelineLabel, { color: colors.text1 }]}>{event.label}</Text>
                      <Text style={[styles.timelineTime, { color: colors.text3 }]}>
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : trips.length ? (
        /* ── Trip List ── */
        <>
          <Text style={[styles.screenTitle, { color: colors.text1 }]}>Trip History</Text>
          <Text style={[styles.screenSub, { color: colors.text3 }]}>Your recent driving records</Text>

          {/* Overall score card */}
          <View style={[styles.overallCard, { backgroundColor: colors.primary }]}>
            <View>
              <Text style={[styles.overallLabel, { color: 'rgba(255,255,255,0.7)' }]}>OVERALL SAFETY SCORE</Text>
              <Text style={[styles.overallScore, { color: '#FFFFFF' }]}>{totalScore}</Text>
              <Text style={[styles.overallSub, { color: 'rgba(255,255,255,0.7)' }]}>
                Based on {trips.length} trip{trips.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.overallBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="shield" size={28} color="#FFFFFF" />
            </View>
          </View>

          {/* Trip cards */}
          <SectionHeader title="Recent Trips" />
          <View style={styles.tripList}>
            {trips.map((trip) => {
              const score = getTripScore(trip);
              const scoreColor = score >= 90 ? colors.safe : score >= 70 ? colors.warning : colors.destructive;
              const stateIcon = trip.emergencyTriggered ? 'alert-octagon' : trip.hadAlert ? 'alert-triangle' : 'check-circle';
              const stateColor = trip.emergencyTriggered ? colors.destructive : trip.hadAlert ? colors.warning : colors.safe;
              return (
                <Pressable
                  key={trip.id}
                  onPress={() => setSelected(trip)}
                  style={({ pressed }) => [
                    styles.tripCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {/* Card header */}
                  <View style={styles.tripCardHeader}>
                    <View style={[styles.tripCardIcon, { backgroundColor: stateColor + '18' }]}>
                      <Feather name={stateIcon} size={20} color={stateColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripCardDate, { color: colors.text1 }]}>{formatShortDate(trip.startedAt)}</Text>
                      <Text style={[styles.tripCardTime, { color: colors.text3 }]}>{formatTime(trip.startedAt)}</Text>
                    </View>
                    <View style={[styles.scorePill, { backgroundColor: scoreColor + '18' }]}>
                      <Text style={[styles.scorePillText, { color: scoreColor }]}>{score}</Text>
                    </View>
                  </View>

                  {/* Metrics row */}
                  <View style={[styles.tripMetricsRow, { borderTopColor: colors.border }]}>
                    <TripStat icon="navigation" value={`${trip.distance.toFixed(1)} km`} colors={colors} />
                    <TripStat icon="clock" value={formatDuration(trip.duration)} colors={colors} />
                    <TripStat
                      icon={trip.hadAlert ? 'alert-triangle' : 'shield'}
                      value={trip.hadAlert ? `${trip.alertCount ?? 0} alert${(trip.alertCount ?? 0) !== 1 ? 's' : ''}` : 'Safe'}
                      color={trip.hadAlert ? colors.warning : colors.safe}
                      colors={colors}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={[styles.screenTitle, { color: colors.text1 }]}>Trip History</Text>
          <Text style={[styles.screenSub, { color: colors.text3 }]}>Your recent driving records</Text>
          <EmptyState
            icon="clock"
            title="No trips yet"
            body="Start your first monitored trip and your driving record will appear here."
          />
        </View>
      )}
    </ScrollView>
  );
}

function TripStat({
  icon, value, color, colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  color?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.tripStat}>
      <Feather name={icon} size={13} color={color ?? colors.text3} />
      <Text style={[styles.tripStatText, { color: color ?? colors.text2 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  screenSub: { fontSize: 13, marginBottom: 6 },

  // Back
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '700' },

  // Detail
  detailDate: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
  detailMeta: { fontSize: 13, marginBottom: 20 },
  detailScoreCard: { borderRadius: 22, borderWidth: 1.5, padding: 20, flexDirection: 'row', gap: 20, marginBottom: 24 },
  scoreLeft: { alignItems: 'flex-start' },
  scoreLabelSm: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  scoreValueLg: { fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56 },
  scoreOutOf: { fontSize: 12 },
  scoreRight: { flex: 1, gap: 10, justifyContent: 'center' },
  scoreStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreStatDot: { width: 8, height: 8, borderRadius: 4 },
  scoreStatLabel: { flex: 1, fontSize: 13 },
  scoreStatValue: { fontSize: 14, fontWeight: '700' },

  // Timeline
  timeline: { borderRadius: 20, borderWidth: 1.5, padding: 18 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -4 },
  timelineCopy: { flex: 1, paddingBottom: 18 },
  timelineLabel: { fontSize: 14, fontWeight: '600' },
  timelineTime: { fontSize: 12, marginTop: 3 },

  // Overall card
  overallCard: { borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overallLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  overallScore: { fontSize: 56, fontWeight: '900', letterSpacing: -2, lineHeight: 60 },
  overallSub: { fontSize: 13, marginTop: 4 },
  overallBadge: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Trip list
  tripList: { gap: 12 },
  tripCard: { borderRadius: 22, borderWidth: 1.5, padding: 16 },
  tripCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tripCardIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tripCardDate: { fontSize: 16, fontWeight: '700' },
  tripCardTime: { fontSize: 12, marginTop: 2 },
  scorePill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  scorePillText: { fontSize: 15, fontWeight: '800' },
  tripMetricsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 0 },
  tripStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripStatText: { fontSize: 13, fontWeight: '500' },

  emptyWrap: { gap: 12 },
});