import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  EmptyState,
  PrimaryButton,
  SectionHeader,
  GlassCard,
  IconButton,
} from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}



// ─── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    status,
    tripActive,
    trips,
    contacts,
    startTrip,
    permissionGranted,
    hydrated,
    settings,
    lastEventLabel,
  } = useTrip();

  const [placementConfirmed, setPlacementConfirmed] = useState(false);
  const recentTrip = trips[0];
  const safeTrips = trips.filter((t) => !t.hadAlert).length;
  const score = trips.length ? Math.max(72, Math.round((safeTrips / trips.length) * 100)) : 96;

  const statusColor =
    status === 'SAFE' ? colors.safe : status === 'ALERT' ? colors.warning : colors.destructive;
  const statusBg =
    status === 'SAFE' ? colors.safeBackground : status === 'ALERT' ? colors.warningBackground : '#FFF0F0';

  // Pulse animation for the hero dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const speed = status === 'EMERGENCY' ? 400 : status === 'ALERT' ? 700 : 2000;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [status, pulseAnim]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Image
            source={require('@/assets/images/cognisafe-icon.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.appName, { color: colors.text1 }]}>Cognisafe-Q</Text>
            <Text style={[styles.appTagline, { color: colors.text3 }]}>Vehicle Safety Monitor</Text>
          </View>
        </View>
        <IconButton
          icon="settings"
          onPress={() => router.push('/settings')}
        />>
      </View>

      {/* ── Greeting ── */}
      <Text style={[styles.greeting, { color: colors.text1 }]}>
        {getGreeting()}, Driver 👋
      </Text>
      <Text style={[styles.greetingSub, { color: colors.text3 }]}>
        {tripActive
          ? 'Your journey is being monitored'
          : 'Your vehicle safety monitor is ready'}
      </Text>

      {/* ── Hero Safety Card ── */}
      <GlassCard style={[styles.heroCard, { backgroundColor: statusBg, borderColor: statusColor + '44' }]}>
        {/* Status indicator row */}
        <View style={styles.heroTop}>
          <View style={styles.heroStatusRow}>
            <Animated.View style={[styles.heroDot, { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.heroStatusText, { color: statusColor }]}>
              {status === 'SAFE' ? 'SAFE' : status === 'ALERT' ? 'ALERT' : 'EMERGENCY'}
            </Text>
          </View>
          {settings.demoMode && (
            <View style={[styles.demoBadge, { backgroundColor: colors.accent, borderColor: colors.border }]}>
              <Text style={[styles.demoText, { color: colors.brandBlue }]}>DEMO</Text>
            </View>
          )}
        </View>

        {/* Large status label */}
        <Text style={[styles.heroTitle, { color: statusColor }]}>
          {status === 'SAFE' ? "You're Protected" : status === 'ALERT' ? 'Check In Required' : 'Emergency Active'}
        </Text>
        <Text style={[styles.heroSub, { color: colors.text3 }]}>
          {tripActive
            ? lastEventLabel
            : 'Start a trip to activate safety monitoring'}
        </Text>

        {/* Phone placement tip */}
        {!tripActive && !placementConfirmed && (
          <GlassCard style={styles.placementCard}>
            <View style={styles.placementHeader}>
              <View style={[styles.placementIcon, { backgroundColor: '#FFF0F0' }]}>
                <Feather name="smartphone" size={15} color={colors.brandBlue} />
              </View>
              <Text style={[styles.placementTitle, { color: colors.text1 }]}>Phone Placement</Text>
            </View>
            {['Mount your phone securely', 'Keep screen visible', 'Use a stable position'].map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Feather name="check-circle" size={13} color={colors.safe} />
                <Text style={[styles.tipText, { color: colors.text2 }]}>{tip}</Text>
              </View>
            ))}
            <Pressable onPress={() => setPlacementConfirmed(true)} style={styles.gotItBtn}>
              <Text style={[styles.gotItText, { color: colors.brandBlue }]}>Got it →</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* CTA Button */}
        <PrimaryButton
          icon={tripActive ? 'activity' : 'play'}
          testID="trip-toggle"
          onPress={async () => {
            if (tripActive) { router.push('/trip'); return; }
            const started = await startTrip();
            if (started) router.push('/trip');
          }}
          disabled={!hydrated || (!tripActive && !placementConfirmed)}
          variant={tripActive ? 'secondary' : 'primary'}
          style={styles.heroBtn}
        >
          {tripActive ? 'Open Live Trip' : 'Start Safe Trip'}
        </PrimaryButton>

        {permissionGranted === false && (
          <View style={[styles.permissionWarn, { backgroundColor: '#FFF8E6', borderColor: colors.warningBorder }]}>
            <Feather name="map-pin" size={14} color={colors.warning} />
            <Text style={[styles.permissionText, { color: colors.warning }]}>
              Location access required — enable in Settings
            </Text>
          </View>
        )}
      </GlassCard>

      {/* ── Quick Metrics ── */}
      <View style={styles.metricsRow}>
        <MetricCard
          icon="shield"
          label="Safety Score"
          value={`${score}`}
          suffix="/100"
          color={score >= 90 ? colors.safe : colors.warning}
          bg={colors.card}
          border={colors.border}
        />
        <MetricCard
          icon="navigation"
          label="Trips Protected"
          value={`${trips.length}`}
          color={colors.brandBlue}
          bg={colors.card}
          border={colors.border}
        />
        <MetricCard
          icon="users"
          label="Contacts"
          value={`${contacts.length}`}
          color={colors.safe}
          bg={colors.card}
          border={colors.border}
        />
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Access" />
        <View style={styles.quickGrid}>
          <QuickAction
            icon="users"
            title="Contacts"
            caption={contacts.length ? `${contacts.length} trusted people` : 'Add a contact'}
            onPress={() => router.push('/contacts')}
            accent="#FFF0F0"
            iconColor={colors.brandBlue}
            colors={colors}
          />
          <QuickAction
            icon="clock"
            title="Trip History"
            caption={recentTrip ? formatDuration(recentTrip.duration) + ' last trip' : 'No trips yet'}
            onPress={() => router.push('/history')}
            accent="#F0FBF5"
            iconColor={colors.safe}
            colors={colors}
          />
        </View>
      </View>

      {/* ── How It Works ── */}
      <View style={styles.section}>
        <SectionHeader title="How It Works" />
        <GlassCard style={styles.stepsCard} noPadding>
          {[
            { n: '01', t: 'Sensors Watch', b: 'Accelerometer, gyroscope and GPS monitor your journey in real-time.' },
            { n: '02', t: 'AI Analyzes', b: 'A 150-sample sliding window detects abnormal motion patterns instantly.' },
            { n: '03', t: 'You Confirm', b: 'If something looks off, you get 30 seconds to confirm you\'re safe.' },
            { n: '04', t: 'Contacts Notified', b: 'If you can\'t respond, your emergency circle is alerted with your GPS location.' },
          ].map(({ n, t, b }, idx, arr) => (
            <View key={n}>
              <View style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: '#FFF0F0' }]}>
                  <Text style={[styles.stepNumText, { color: colors.brandBlue }]}>{n}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <Text style={[styles.stepTitle, { color: colors.text1 }]}>{t}</Text>
                  <Text style={[styles.stepBody, { color: colors.text3 }]}>{b}</Text>
                </View>
              </View>
              {idx < arr.length - 1 && <View style={[styles.stepDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </GlassCard>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, suffix, color, bg, border,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  suffix?: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <GlassCard style={[styles.metricCard, { backgroundColor: bg, borderColor: border }]} noPadding>
      <View style={[styles.metricIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.metricValue, { color }]}>
        {value}
        {suffix ? <Text style={{ fontSize: 11 }}>{suffix}</Text> : null}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassCard>
  );
}

function QuickAction({
  icon, title, caption, onPress, accent, iconColor, colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  caption: string;
  onPress: () => void;
  accent: string;
  iconColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
        style={[styles.quickCard]}
      >
        <GlassCard style={styles.quickCardInner}>
        <View style={[styles.quickIcon, { backgroundColor: accent }]}>
          <Feather name={icon} size={22} color={iconColor} />
        </View>
        <Text style={[styles.quickTitle, { color: colors.text1 }]}>{title}</Text>
        <Text style={[styles.quickCaption, { color: colors.text3 }]}>{caption}</Text>
        <Feather name="arrow-up-right" size={15} color={colors.text4} style={styles.quickArrow} />
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImg: { width: 46, height: 46 },
  appName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  appTagline: { fontSize: 11, fontWeight: '500' },
  headerIconBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Greeting
  greeting: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  greetingSub: { fontSize: 14, marginBottom: 20 },

  // Hero card
  heroCard: { padding: 22, marginBottom: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { width: 10, height: 10, borderRadius: 5 },
  heroStatusText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  demoBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  demoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, lineHeight: 32 },
  heroSub: { fontSize: 13, lineHeight: 19 },
  heroBtn: { marginTop: 4 },

  // Placement card
  placementCard: { padding: 14, gap: 8 },
  placementHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  placementIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  placementTitle: { fontSize: 14, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText: { fontSize: 13 },
  gotItBtn: { marginTop: 4, alignSelf: 'flex-end' },
  gotItText: { fontSize: 13, fontWeight: '700' },

  // Permission warning
  permissionWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 11 },
  permissionText: { fontSize: 12, flex: 1, fontWeight: '500' },

  // Metrics row
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  metricCard: { flex: 1, padding: 14, gap: 4 },
  metricIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel: { fontSize: 10, color: '#737373', fontWeight: '500' },

  // Sections
  section: { marginBottom: 24 },

  // Quick actions
  quickGrid: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1 },
  quickCardInner: { padding: 18, minHeight: 150 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  quickTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  quickCaption: { fontSize: 12, lineHeight: 17 },
  quickArrow: { position: 'absolute', top: 18, right: 18 },

  // Steps
  stepsCard: { },
  step: { flexDirection: 'row', gap: 14, padding: 18 },
  stepNum: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 11, fontWeight: '800' },
  stepCopy: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stepBody: { fontSize: 12, lineHeight: 18 },
  stepDivider: { height: 1, marginHorizontal: 18 },
});