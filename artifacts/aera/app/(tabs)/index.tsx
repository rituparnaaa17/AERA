/**
 * Home / Dashboard — "Soft mobility-tech + safety instrumentation" pass.
 *
 * • Left-aligned greeting header.
 * • Hero safe state: a compact rounded card with the mascot bleeding out of
 *   the right edge, big status headline, Q Safety Halo showing safety score.
 * • Stat chip row: Trips · Alerts · Last Trip (real state — no fabricated
 *   fallbacks; "—" when unavailable).
 * • Sticky Start-Trip CTA at the bottom of the scroll.
 * • Everything on the shared `main_theme` background.
 */

import React from 'react';
import {
  Image,
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
import { MascotPose } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QSafetyHalo } from '@/components/QSafetyHalo';
import { useTrip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';
const BRAND_BLUE = '#2563EB';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

// Route mascot pose (require map = pnpm-safe static resolution)
const POSE_TO_ASSET: Record<MascotPose, unknown> = {
  neutral: require('@/assets/mascot/neutral.png'),
  wave: require('@/assets/mascot/wave.png'),
  wink: require('@/assets/mascot/wink.png'),
  shield: require('@/assets/mascot/shield.png'),
  driving: require('@/assets/mascot/driving.png'),
  thinking: require('@/assets/mascot/thinking.png'),
  alert: require('@/assets/mascot/alert.png'),
  emergency: require('@/assets/mascot/emergency.png'),
  sos: require('@/assets/mascot/sos.png'),
  heart: require('@/assets/mascot/heart.png'),
  celebrate: require('@/assets/mascot/celebrate.png'),
  offline: require('@/assets/mascot/offline.png'),
  sunglasses: require('@/assets/mascot/sunglases.png'),
};

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const {
    status,
    tripActive,
    trips,
    startTrip,
    hydrated,
    lastEventLabel,
  } = useTrip();

  const isEmergency = status === 'EMERGENCY';
  const isAlert = status === 'ALERT';

  // Real derived metrics
  const safeTrips = trips.filter((t) => !t.hadAlert).length;
  const totalAlerts = trips.reduce((s, t) => s + (t.alertCount ?? 0), 0);
  const safetyScore = trips.length
    ? Math.max(60, Math.round((safeTrips / trips.length) * 100))
    : 100;
  const lastTrip = trips[0];

  const stateColor = isEmergency ? DANGER : isAlert ? WARN : SAFE;
  const stateHeadline = isEmergency ? 'Emergency active' : isAlert ? 'Check in required' : "You're safe";
  const stateNote = tripActive
    ? lastEventLabel || 'Monitoring your journey'
    : isEmergency || isAlert
    ? lastEventLabel || 'Awaiting your response'
    : 'All systems active';

  const mascotPose: MascotPose = isEmergency
    ? 'emergency'
    : isAlert
    ? 'alert'
    : tripActive
    ? 'driving'
    : 'wave';

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header row ── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>DASHBOARD</Text>
            <Text style={styles.greeting}>
              {getGreeting()}, Driver <Text style={styles.wave}>👋</Text>
            </Text>
            <Text style={styles.greetingSub}>
              <Text style={styles.qMark}>AERA</Text> is keeping an eye on your journey.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityLabel="Settings"
          >
            <Feather name="settings" size={18} color={NAVY} />
          </Pressable>
        </View>

        {/* ── Hero: safe state + halo + mascot ── */}
        <View
          style={[
            styles.hero,
            { borderColor: stateColor + '55' },
          ]}
        >
          {/* Left side: state badge + headline + Q Safety Halo */}
          <View style={styles.heroLeft}>
            <View style={[styles.stateBadge, { backgroundColor: stateColor + '18', borderColor: stateColor + '55' }]}>
              <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
              <Text style={[styles.stateBadgeText, { color: stateColor }]}>
                {isEmergency ? 'EMERGENCY' : isAlert ? 'ALERT' : 'SAFE'}
              </Text>
            </View>
            <Text style={styles.stateHeadline}>{stateHeadline}</Text>
            <Text style={styles.stateNote}>{stateNote}</Text>

            <View style={{ marginTop: 8 }}>
              <QSafetyHalo
                value={safetyScore}
                size={110}
                stroke={6}
                color={stateColor}
                centerLabel={`${safetyScore}`}
                centerCaption="SAFETY"
                centerColor={NAVY}
                captionColor={MUTED}
              />
            </View>
          </View>

          {/* Right side: mascot bleeding off the edge */}
          <View style={styles.heroMascotWrap} pointerEvents="none">
            <Image
              source={POSE_TO_ASSET[mascotPose] as never}
              style={styles.heroMascot}
              resizeMode="contain"
              accessible={false}
            />
          </View>
        </View>

        {/* ── Stat chip row ── */}
        <View style={styles.chipRow}>
          <StatChip icon="navigation" value={`${trips.length}`} label="Trips" tone="brand" />
          <StatChip
            icon="alert-triangle"
            value={`${totalAlerts}`}
            label="Alerts"
            tone={totalAlerts > 0 ? 'warn' : 'muted'}
          />
          <StatChip
            icon="clock"
            value={lastTrip ? formatDuration(lastTrip.duration) : '—'}
            label="Last Trip"
            tone="muted"
          />
        </View>

        {/* ── Last Trip summary (only when we have one) ── */}
        {lastTrip && (
          <Pressable
            onPress={() => router.push(`/(tabs)/history?open=${encodeURIComponent(lastTrip.id)}`)}
            style={styles.lastTripRow}
            accessibilityLabel="Open last trip details"
          >
            <View style={styles.lastTripLeft}>
              <Text style={styles.lastTripEyebrow}>LAST TRIP</Text>
              <Text style={styles.lastTripTitle}>
                {lastTrip.emergencyTriggered ? 'Emergency' : lastTrip.hadAlert ? 'Alerted' : 'Safe'}{' '}
                · {lastTrip.distance.toFixed(1)} km
              </Text>
              <Text style={styles.lastTripMeta}>
                {new Date(lastTrip.endedAt).toLocaleString([], {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={MUTED} />
          </Pressable>
        )}

        {/* ── Primary CTA ── */}
        <PrimaryButton
          label={tripActive ? 'Open Live Trip' : 'Start a Trip'}
          onPress={async () => {
            if (tripActive) { router.push('/trip'); return; }
            const started = await startTrip();
            if (started) router.push('/trip');
          }}
          disabled={!hydrated}
          style={styles.ctaBtn}
          testID="trip-toggle"
        />
      </ScrollView>
    </AppBackground>
  );
}

// ─── Chip ──────────────────────────────────────────────────────────────

function StatChip({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  label: string;
  tone: 'brand' | 'warn' | 'muted';
}) {
  const color = tone === 'brand' ? BRAND_BLUE : tone === 'warn' ? WARN : MUTED;
  return (
    <View style={styles.chip}>
      <View style={[styles.chipIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={13} color={color} />
      </View>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 14 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  greeting: { color: NAVY, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  wave: { fontSize: 20 },
  greetingSub: { color: NAVY_SOFT, fontSize: 13, marginTop: 2 },
  qMark: { color: BRAND_BLUE, fontWeight: '800' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero card
  hero: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderRadius: 26,
    paddingLeft: 18,
    paddingVertical: 18,
    paddingRight: 0,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    minHeight: 200,
  },
  heroLeft: { flex: 1.15, gap: 4, justifyContent: 'flex-start' },
  stateBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  stateHeadline: { color: NAVY, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  stateNote: { color: NAVY_SOFT, fontSize: 12 },

  heroMascotWrap: {
    width: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: -6,
  },
  heroMascot: { width: 160, height: 190, marginRight: -6, marginBottom: -8 },

  // Chip row
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    gap: 4,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipValue: { color: NAVY, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  chipLabel: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

  // Last trip row
  lastTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lastTripLeft: { flex: 1, gap: 2 },
  lastTripEyebrow: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  lastTripTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  lastTripMeta: { color: MUTED, fontSize: 12 },

  ctaBtn: { alignSelf: 'stretch', marginTop: 4 },
});
