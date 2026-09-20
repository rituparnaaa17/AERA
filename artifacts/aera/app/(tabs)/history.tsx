/**
 * Trip History & Trip Details — Batch 4A rebuild.
 *
 * List view (Trip History):
 *   • Centred "Trip History" header with a small driving-record eyebrow.
 *   • Filter chips (All · Safe · Alerts · Emergency), each showing a real
 *     count derived from stored trips.
 *   • Trips grouped by day (Today / Yesterday / Older) — compact rows with
 *     a coloured left dot, connector, title + severity pill, time range,
 *     distance · duration, and a small score chip on the right.
 *   • Empty state uses the neutral mascot.
 *
 * Detail view (Trip Details):
 *   • Route header card with date eyebrow, trip title, time range, halo
 *     showing the safety score.
 *   • Three concise metric tiles (Distance / Duration / Alerts).
 *   • Trip Overview: start/end/day summary and how far ago it happened.
 *   • Vertical Event Timeline: every event stored on the trip, colour-coded
 *     by severity (green / amber / red / muted for CANCELLED).
 *
 * Deep-link: opens `?open=<tripId>` to jump straight into a specific trip's
 * details (used by Trip Complete's "View Trip Summary" and Dashboard's
 * "Last Trip" row).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { TripRouteMap } from '@/components/TripRouteMap';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { EmptyState } from '@/components/AppPrimitives';
import { Mascot } from '@/components/Mascot';
import { QSafetyHalo } from '@/components/QSafetyHalo';
import { useTrip, Trip } from '@/components/TripContext';

// ── palette (light, local) ──────────────────────────────────────────────
const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const BRAND_BLUE = '#2563EB';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';

type Filter = 'all' | 'safe' | 'alert' | 'emergency';

// ── helpers ─────────────────────────────────────────────────────────────
const startOfDay = (d: Date) => {
  const c = new Date(d); c.setHours(0, 0, 0, 0);
  return c.getTime();
};
const tripKind = (t: Trip): 'safe' | 'alert' | 'emergency' =>
  t.emergencyTriggered ? 'emergency' : t.hadAlert ? 'alert' : 'safe';
const kindColor = (k: 'safe' | 'alert' | 'emergency') =>
  k === 'emergency' ? DANGER : k === 'alert' ? WARN : SAFE;
// Trip safety score — MUST match `calculateScore` in app/summary.tsx.
// Real state only (alertCount, hadAlert, emergencyTriggered from the
// persisted Trip record). No random / hardcoded per-trip values.
const tripScore = (t: Trip): number => {
  const alertCount = t.alertCount ?? t.events.filter((e) => e.status === 'ALERT').length;

  if (t.emergencyTriggered) {
    const penalty = Math.min(55, alertCount * 12 + 25);
    return Math.max(42, Math.round(100 - penalty));
  }
  if (t.hadAlert || alertCount > 0) {
    const penalty = Math.min(25, alertCount * 8);
    return Math.max(72, Math.round(98 - penalty));
  }
  return 98;
};
const tripTitle = (t: Trip) => {
  const h = new Date(t.startedAt).getHours();
  if (h < 12) return 'Morning Trip';
  if (h < 17) return 'Afternoon Trip';
  if (h < 21) return 'Evening Trip';
  return 'Night Trip';
};
const fmtRange = (t: Trip) => {
  const s = new Date(t.startedAt);
  const e = new Date(t.endedAt);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
};
const fmtDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtLongDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso));
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Less than an hour ago';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

// ─── List screen ────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { trips } = useTrip();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Trip | null>(null);

  // Deep link — `?open=<tripId>` from Trip Complete / Dashboard.
  const params = useLocalSearchParams<{ open?: string }>();
  useEffect(() => {
    if (!params.open) return;
    const match = trips.find((t) => t.id === params.open);
    if (match) setSelected(match);
  }, [params.open, trips]);

  // Real-state filter counts for the chips
  const counts = useMemo(() => {
    let safe = 0, alert = 0, emergency = 0;
    for (const t of trips) {
      const k = tripKind(t);
      if (k === 'safe') safe += 1;
      else if (k === 'alert') alert += 1;
      else emergency += 1;
    }
    return { all: trips.length, safe, alert, emergency };
  }, [trips]);

  const filtered = useMemo(
    () => (filter === 'all' ? trips : trips.filter((t) => tripKind(t) === filter)),
    [trips, filter]
  );

  const grouped = useMemo(() => {
    const g: Record<'Today' | 'Yesterday' | 'Older', Trip[]> = { Today: [], Yesterday: [], Older: [] };
    const today = startOfDay(new Date());
    for (const t of filtered) {
      const ts = startOfDay(new Date(t.startedAt));
      const bucket: 'Today' | 'Yesterday' | 'Older' =
        ts === today ? 'Today' : ts === today - 86_400_000 ? 'Yesterday' : 'Older';
      g[bucket].push(t);
    }
    return g;
  }, [filtered]);

  if (selected) return <TripDetail trip={selected} onBack={() => setSelected(null)} insets={insets} />;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'safe', label: 'Safe', count: counts.safe },
    { key: 'alert', label: 'Alerts', count: counts.alert },
    { key: 'emergency', label: 'Emergency', count: counts.emergency },
  ];

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
        {/* Centered header */}
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>DRIVING RECORD</Text>
          <Text style={styles.pageTitle}>Trip History</Text>
          <Text style={styles.pageSub}>
            {counts.all === 0
              ? 'No trips yet.'
              : `${counts.all} trip${counts.all === 1 ? '' : 's'} · ${counts.safe} safe · ${counts.alert} alert${counts.alert === 1 ? '' : 's'}${counts.emergency ? ` · ${counts.emergency} emergency` : ''}`}
          </Text>
        </View>

        {/* Filter chips — one horizontal row, scrollable on tight widths */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRowScroll}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                accessibilityRole="button"
                accessibilityState={active ? { selected: true } : {}}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
                  {f.label}
                </Text>
                <View style={[styles.chipCount, active ? styles.chipCountActive : styles.chipCountIdle]}>
                  <Text style={[styles.chipCountText, { color: active ? '#FFFFFF' : NAVY_SOFT }]}>
                    {f.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {trips.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 12, marginTop: 20 }}>
            <Mascot size={120} pose="neutral" />
            <EmptyState
              icon="clock"
              title="No trips yet"
              body="Start your first monitored trip and your driving record will appear here."
            />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyFilter}>
            <Feather name="filter" size={22} color={MUTED} />
            <Text style={styles.emptyFilterTitle}>No {filter} trips</Text>
            <Text style={styles.emptyFilterBody}>
              Nothing matches this filter — try a different one.
            </Text>
          </View>
        ) : (
          (['Today', 'Yesterday', 'Older'] as const).map((section) => {
            const rows = grouped[section];
            if (!rows.length) return null;
            return (
              <View key={section} style={styles.section}>
                <Text style={styles.sectionLabel}>{section}</Text>
                <View>
                  {rows.map((trip, i) => (
                    <TimelineRow
                      key={trip.id}
                      trip={trip}
                      last={i === rows.length - 1}
                      onPress={() => setSelected(trip)}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </AppBackground>
  );
}

// ── Timeline row ────────────────────────────────────────────────────────

function TimelineRow({ trip, last, onPress }: { trip: Trip; last: boolean; onPress: () => void }) {
  const kind = tripKind(trip);
  const color = kindColor(kind);
  const score = tripScore(trip);
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={styles.dotCol}>
        <View style={[styles.dot, { backgroundColor: color, borderColor: color + '55' }]} />
        {!last && <View style={styles.line} />}
      </View>
      <View style={styles.rowBody}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.rowHead}>
            <Text style={styles.rowTitle}>{tripTitle(trip)}</Text>
            <View style={[styles.pill, { backgroundColor: color + '18', borderColor: color + '55' }]}>
              <Text style={[styles.pillText, { color }]}>{kind.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.rowRange}>{fmtRange(trip)}</Text>
          <Text style={styles.rowMeta}>
            {trip.distance.toFixed(1)} km · {fmtDuration(trip.duration)}
          </Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: color + '18', borderColor: color + '55' }]}>
          <Text style={[styles.scoreValue, { color }]}>{score}</Text>
          <Text style={styles.scoreLabel}>SCORE</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Detail screen ──────────────────────────────────────────────────────

function TripDetail({
  trip,
  onBack,
  insets,
}: {
  trip: Trip;
  onBack: () => void;
  insets: { top: number; bottom: number };
}) {
  const kind = tripKind(trip);
  const color = kindColor(kind);
  const score = tripScore(trip);
  const durationMin = Math.floor(trip.duration / 60);
  const alertsCount = trip.alertCount ?? trip.events.filter((e) => e.status === 'ALERT').length;
  const emergencyCount = trip.emergencyTriggered ? 1 : 0;

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
        {/* Header row */}
        <View style={styles.detailHead}>
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={NAVY} />
          </Pressable>
          <Text style={styles.detailTopTitle}>Trip Details</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* Report header */}
        <View style={styles.reportHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.detailEyebrow}>{fmtLongDate(trip.startedAt).toUpperCase()}</Text>
            <Text style={styles.detailTitle}>{tripTitle(trip)}</Text>
            <Text style={styles.detailSub}>{fmtRange(trip)}</Text>
            <View style={[styles.pill, styles.reportPill, { backgroundColor: color + '18', borderColor: color + '55' }]}>
              <Text style={[styles.pillText, { color }]}>{kind.toUpperCase()}</Text>
            </View>
          </View>
          <QSafetyHalo
            value={score}
            size={96}
            stroke={5}
            color={color}
            centerLabel={`${score}`}
            centerCaption="SCORE"
            centerColor={NAVY}
            captionColor={MUTED}
          />
        </View>

        {/* Route map (real GPS samples when available) */}
        <Text style={styles.sectionHeader}>ROUTE</Text>
        <TripRouteMap samples={trip.route ?? []} height={200} distanceKm={trip.distance} />

        {/* Concise metrics */}
        <View style={styles.metricsRow}>
          <MiniMetric icon="navigation" label="Distance" value={`${trip.distance.toFixed(1)} km`} />
          <MiniMetric icon="clock" label="Duration" value={fmtDuration(trip.duration)} />
          <MiniMetric icon="alert-triangle" label="Alerts" value={`${alertsCount}`} accent={alertsCount > 0 ? WARN : undefined} />
        </View>

        {/* Trip Overview */}
        <Text style={styles.sectionHeader}>TRIP OVERVIEW</Text>
        <View style={styles.overviewCard}>
          <OverviewRow icon="play-circle" label="Started" value={fmtTime(trip.startedAt)} />
          <Divider />
          <OverviewRow icon="flag" label="Ended" value={fmtTime(trip.endedAt)} />
          <Divider />
          <OverviewRow icon="calendar" label="When" value={fmtRelative(trip.endedAt)} />
          {emergencyCount > 0 && (
            <>
              <Divider />
              <OverviewRow
                icon="alert-octagon"
                label="Emergencies"
                value={`${emergencyCount}`}
                accent={DANGER}
              />
            </>
          )}
        </View>

        {/* Event Timeline */}
        <Text style={styles.sectionHeader}>EVENT TIMELINE</Text>
        <View style={styles.timelineCard}>
          {trip.events.length === 0 ? (
            <Text style={styles.timelineEmpty}>No events were logged during this trip.</Text>
          ) : (
            trip.events.map((event, i) => {
              const evColor =
                event.status === 'EMERGENCY' ? DANGER
                : event.status === 'ALERT' ? WARN
                : event.status === 'CANCELLED' ? MUTED
                : SAFE;
              const last = i === trip.events.length - 1;
              return (
                <View key={event.id} style={styles.evtRow}>
                  <View style={styles.dotCol}>
                    <View style={[styles.dot, { backgroundColor: evColor, borderColor: evColor + '55' }]} />
                    {!last && <View style={styles.line} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 10 }}>
                    <View style={styles.evtHead}>
                      <Text style={styles.evtTime}>{fmtTime(event.timestamp)}</Text>
                      {event.status !== 'SAFE' && (
                        <View style={[styles.pill, { backgroundColor: evColor + '18', borderColor: evColor + '55' }]}>
                          <Text style={[styles.pillText, { color: evColor }]}>{event.status}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.evtLabel}>{event.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

// ── Small components ────────────────────────────────────────────────────

function MiniMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.miniMetric}>
      <Feather name={icon} size={13} color={accent ?? MUTED} />
      <Text style={[styles.miniMetricValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.miniMetricLabel}>{label}</Text>
    </View>
  );
}

function OverviewRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.overviewRow}>
      <View style={styles.overviewIcon}>
        <Feather name={icon} size={14} color={accent ?? BRAND_BLUE} />
      </View>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={[styles.overviewValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 14 },

  // Header
  pageHeader: { alignItems: 'center', gap: 4 },
  eyebrow: { color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  pageTitle: { color: NAVY, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  pageSub: { color: NAVY_SOFT, fontSize: 12, textAlign: 'center' },

  iconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  // Filter chips — horizontal, non-wrapping
  filterRowScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
  },
  chipActive: { backgroundColor: BRAND_BLUE, borderColor: BRAND_BLUE },
  chipIdle: { backgroundColor: SURFACE, borderColor: CARD_BORDER },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  chipTextActive: { color: '#FFFFFF' },
  chipTextIdle: { color: NAVY_SOFT },
  chipCount: {
    minWidth: 20, height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.20)' },
  chipCountIdle: { backgroundColor: '#F1F5F9' },
  chipCountText: { fontSize: 10, fontWeight: '800' },

  // Filter empty state
  emptyFilter: {
    alignItems: 'center',
    gap: 6,
    padding: 24,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
  },
  emptyFilterTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  emptyFilterBody: { color: NAVY_SOFT, fontSize: 13, textAlign: 'center' },

  // Section
  section: { gap: 6, marginTop: 4 },
  sectionLabel: {
    color: NAVY_SOFT, fontSize: 11, fontWeight: '800', letterSpacing: 1,
    textTransform: 'uppercase', marginLeft: 4,
  },

  // Trip row
  row: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  dotCol: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: CARD_BORDER, marginTop: 4 },

  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 16,
    padding: 12,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  rowRange: { color: NAVY_SOFT, fontSize: 12 },
  rowMeta: { color: MUTED, fontSize: 12 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  scorePill: {
    minWidth: 52,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  scoreValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, lineHeight: 20 },
  scoreLabel: { fontSize: 8, fontWeight: '800', color: MUTED, letterSpacing: 0.6 },

  // Detail
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTopTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },

  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 14,
  },
  detailEyebrow: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  detailTitle: { color: NAVY, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  detailSub: { color: NAVY_SOFT, fontSize: 12, marginTop: 2 },
  reportPill: { alignSelf: 'flex-start', marginTop: 6 },

  metricsRow: { flexDirection: 'row', gap: 10 },
  miniMetric: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 10,
    alignItems: 'flex-start', gap: 2,
  },
  miniMetricValue: { color: NAVY, fontSize: 16, fontWeight: '800', marginTop: 2 },
  miniMetricLabel: { color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  sectionHeader: {
    color: NAVY_SOFT, fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    marginTop: 6, marginLeft: 4,
  },

  // Overview
  overviewCard: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 18,
    overflow: 'hidden',
  },
  overviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  overviewIcon: {
    width: 28, height: 28,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center',
  },
  overviewLabel: { flex: 1, color: NAVY, fontSize: 13, fontWeight: '600' },
  overviewValue: { color: NAVY, fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  // Event timeline
  timelineCard: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 14,
  },
  timelineEmpty: { color: NAVY_SOFT, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  evtRow: { flexDirection: 'row', gap: 12 },
  evtHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  evtTime: { color: NAVY, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  evtLabel: { color: NAVY_SOFT, fontSize: 13, marginTop: 2 },
});
