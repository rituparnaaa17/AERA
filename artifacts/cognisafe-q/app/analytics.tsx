/**
 * Safety Analytics — Batch 4B.
 *
 * Historical safety instrumentation derived entirely from persisted trip
 * history (`useTrip().trips`). Nothing is hardcoded. When there isn't
 * enough data to compute a metric, we show an honest unavailable state.
 *
 * Compare with `/analyzing` — that route is the LIVE analysis diagnostic
 * during an active trip. This route is the aggregate view.
 */

import React, { useMemo, useState } from 'react';
import {
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
import { QSafetyHalo } from '@/components/QSafetyHalo';
import { useTrip, Trip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const BRAND_BLUE = '#2563EB';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';

type Range = 'week' | 'month' | 'all';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const tripKind = (t: Trip): 'safe' | 'alert' | 'emergency' =>
  t.emergencyTriggered ? 'emergency' : t.hadAlert ? 'alert' : 'safe';
const tripScore = (t: Trip) => (t.emergencyTriggered ? 52 : t.hadAlert ? 78 : 96);
const bandColor = (score: number) =>
  score >= 90 ? SAFE : score >= 70 ? WARN : DANGER;
const bandLabel = (score: number) =>
  score >= 90 ? 'Great!' : score >= 70 ? 'Good' : 'Needs Review';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { trips } = useTrip();
  const [range, setRange] = useState<Range>('week');

  const now = Date.now();

  const inRange = useMemo(() => {
    if (range === 'all') return trips;
    const cutoff = range === 'week' ? now - WEEK_MS : now - MONTH_MS;
    return trips.filter((t) => new Date(t.endedAt).getTime() >= cutoff);
  }, [trips, range, now]);

  // ── Metric derivation (real data only) ───────────────────────────────
  const totalTrips = inRange.length;
  const safeTrips = inRange.filter((t) => tripKind(t) === 'safe').length;
  const alertTrips = inRange.filter((t) => tripKind(t) === 'alert').length;
  const emergencyTrips = inRange.filter((t) => tripKind(t) === 'emergency').length;
  const totalAlerts = inRange.reduce((s, t) => s + (t.alertCount ?? 0), 0);
  const totalSafeWindows = inRange.reduce((s, t) => s + (t.safeWindows ?? 0), 0);

  // Average safety score across the range (score bands per trip → mean)
  const safetyScore = totalTrips
    ? Math.round(
        inRange.reduce((s, t) => s + tripScore(t), 0) / totalTrips,
      )
    : null; // null → unavailable state, we won't show a fake 0

  // "Smooth Movement" — % of trips with no alerts of any kind.
  const smoothPct = totalTrips ? Math.round((safeTrips / totalTrips) * 100) : null;

  // "Stable Driving" — % of trips without an emergency (alerts ok, no SOS).
  const stablePct = totalTrips
    ? Math.round(((totalTrips - emergencyTrips) / totalTrips) * 100)
    : null;

  // "Alert Frequency" — alerts per trip (real per-trip mean).
  const alertPerTrip = totalTrips ? totalAlerts / totalTrips : null;

  const rangeLabel = range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time';

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={NAVY} />
          </Pressable>
          <Text style={styles.topTitle}>Safety Analytics</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* Range chips */}
        <View style={styles.rangeRow}>
          {(['week', 'month', 'all'] as const).map((r) => {
            const active = r === range;
            const label = r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'All Time';
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[styles.rangeChip, active ? styles.rangeChipActive : styles.rangeChipIdle]}
              >
                <Text style={[styles.rangeText, active ? styles.rangeTextActive : styles.rangeTextIdle]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Q Safety Halo — only when we have data */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{rangeLabel.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>Your Safety Score</Text>
          {safetyScore != null ? (
            <View style={{ marginTop: 6 }}>
              <QSafetyHalo
                value={safetyScore}
                size={220}
                stroke={12}
                color={bandColor(safetyScore)}
                centerLabel={`${safetyScore}`}
                centerCaption={bandLabel(safetyScore)}
                centerColor={NAVY}
                captionColor={MUTED}
              />
            </View>
          ) : (
            <View style={styles.heroEmpty}>
              <Feather name="bar-chart-2" size={22} color={MUTED} />
              <Text style={styles.heroEmptyTitle}>No trips in this range</Text>
              <Text style={styles.heroEmptyBody}>
                Complete a monitored trip and your score will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Breakdown bars */}
        <View style={styles.breakdown}>
          <BarRow
            label="Smooth Movement"
            hint="Trips without any alerts"
            value={smoothPct}
            color={SAFE}
          />
          <Divider />
          <BarRow
            label="Stable Driving"
            hint="Trips without an emergency"
            value={stablePct}
            color={BRAND_BLUE}
          />
          <Divider />
          <BarRow
            label="Alert Frequency"
            hint="Average alerts per trip"
            value={alertPerTrip != null ? Math.min(100, Math.round(alertPerTrip * 25)) : null}
            display={alertPerTrip != null ? alertPerTrip.toFixed(2) : null}
            color={
              alertPerTrip == null
                ? MUTED
                : alertPerTrip < 0.25
                ? SAFE
                : alertPerTrip < 1
                ? WARN
                : DANGER
            }
          />
        </View>

        {/* Count chips */}
        <View style={styles.chipRow}>
          <CountChip icon="check-circle" label="Safe" value={`${safeTrips}`} color={SAFE} />
          <CountChip
            icon="alert-triangle"
            label="Alerted"
            value={`${alertTrips}`}
            color={alertTrips > 0 ? WARN : MUTED}
          />
          <CountChip
            icon="alert-octagon"
            label="Emergency"
            value={`${emergencyTrips}`}
            color={emergencyTrips > 0 ? DANGER : MUTED}
          />
        </View>

        {/* Cumulative safe windows */}
        <View style={styles.metricCard}>
          <View style={styles.metricRow}>
            <Feather name="shield" size={16} color={SAFE} />
            <Text style={styles.metricLabel}>Safe Windows Recorded</Text>
            <Text style={styles.metricValue}>{totalSafeWindows}</Text>
          </View>
          <Text style={styles.metricSub}>
            AI-analysed windows across {totalTrips} trip{totalTrips === 1 ? '' : 's'} in {rangeLabel.toLowerCase()}.
          </Text>
        </View>

        {/* Explainer */}
        <View style={styles.explainerCard}>
          <View style={styles.explainerHead}>
            <Feather name="info" size={14} color={BRAND_BLUE} />
            <Text style={styles.explainerTitle}>How is this calculated?</Text>
          </View>
          <Text style={styles.explainerBody}>
            Q averages the safety band of every trip in this range (safe = 96,
            alert = 78, emergency = 52), then splits it into Smooth Movement,
            Stable Driving and Alert Frequency to show which factor is
            weighing on your score.
          </Text>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

// ── Small pieces ────────────────────────────────────────────────────────

function BarRow({
  label,
  hint,
  value,
  display,
  color,
}: {
  label: string;
  hint: string;
  value: number | null;
  /** Optional text override when `value` isn't a raw percentage. */
  display?: string | null;
  color: string;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel}>{label}</Text>
          <Text style={styles.barHint}>{hint}</Text>
        </View>
        <Text style={[styles.barPct, { color }]}>
          {value == null ? '—' : display ?? `${Math.round(pct)}%`}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: value == null ? MUTED : color }]} />
      </View>
    </View>
  );
}

function CountChip({
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
    <View style={styles.countChip}>
      <View style={[styles.countIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={13} color={color} />
      </View>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },

  // Range chips
  rangeRow: {
    flexDirection: 'row', gap: 8, alignSelf: 'stretch',
    padding: 4, backgroundColor: SURFACE, borderRadius: 999,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  rangeChip: {
    flex: 1, borderRadius: 999,
    paddingVertical: 8, alignItems: 'center',
  },
  rangeChipActive: { backgroundColor: BRAND_BLUE },
  rangeChipIdle: { backgroundColor: 'transparent' },
  rangeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  rangeTextActive: { color: '#FFFFFF' },
  rangeTextIdle: { color: NAVY_SOFT },

  // Hero
  heroCard: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 24, padding: 18, alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  heroEyebrow: { color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: NAVY, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  heroEmpty: {
    alignItems: 'center', gap: 4, padding: 20,
  },
  heroEmptyTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  heroEmptyBody: { color: MUTED, fontSize: 12, textAlign: 'center' },

  // Breakdown
  breakdown: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20, overflow: 'hidden',
  },
  barRow: { padding: 14, gap: 8 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barLabel: { color: NAVY, fontSize: 14, fontWeight: '800' },
  barHint: { color: MUTED, fontSize: 11, fontWeight: '600' },
  barPct: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  // Count chips
  chipRow: { flexDirection: 'row', gap: 10 },
  countChip: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: CARD_BORDER,
    paddingVertical: 12, paddingHorizontal: 12,
    alignItems: 'flex-start', gap: 4,
  },
  countIcon: {
    width: 26, height: 26, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  countValue: { color: NAVY, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  countLabel: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

  // Safe windows
  metricCard: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 18, padding: 14, gap: 6,
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { flex: 1, color: NAVY, fontSize: 13, fontWeight: '800' },
  metricValue: { color: NAVY, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  metricSub: { color: MUTED, fontSize: 12 },

  // Explainer
  explainerCard: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 16, padding: 14, gap: 6,
  },
  explainerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  explainerTitle: { color: NAVY, fontSize: 13, fontWeight: '800' },
  explainerBody: { color: NAVY_SOFT, fontSize: 12, lineHeight: 18 },
});
