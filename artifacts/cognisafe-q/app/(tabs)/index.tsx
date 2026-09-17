import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Metric, PrimaryButton, ScreenHeader, SectionLabel, StatusPill } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { status, tripActive, trips, contacts, startTrip, permissionGranted, hydrated, settings, lastEventLabel } = useTrip();
  const [placementConfirmed, setPlacementConfirmed] = useState(false);
  const recentTrip = trips[0];
  const safeWindows = trips.reduce((total, trip) => total + (trip.hadAlert ? 0 : 1), 0);
  const score = trips.length ? Math.max(72, Math.round((safeWindows / trips.length) * 100)) : 96;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Cognisafe-Q"
        title={tripActive ? 'Trip in progress' : 'Drive with backup.'}
        action={
          <Pressable
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="sliders" size={19} color={colors.foreground} />
          </Pressable>
        }
      />
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your intelligent driving safety companion</Text>

      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>CURRENT STATUS</Text>
            <Text style={[styles.heroStatus, { color: status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive }]}>
              {status === 'SAFE' ? 'SAFE' : status === 'ALERT' ? 'ALERT' : 'EMERGENCY'}
            </Text>
          </View>
          <StatusPill status={status} />
        </View>
        <View style={[styles.signal, { borderColor: status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive }]}>
          <View style={[styles.signalCore, { backgroundColor: status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive }]} />
          <View style={[styles.signalRing, { borderColor: status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive }]} />
        </View>
        {settings.demoMode ? (
          <View style={[styles.demoPill, { backgroundColor: colors.accent }]}>
            <View style={[styles.demoDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.demoText, { color: colors.primary }]}>DEMO MODE</Text>
          </View>
        ) : null}
        <Text style={[styles.heroDescription, { color: colors.mutedForeground }]}>
          {tripActive ? 'Sensors are watching for sudden motion and changes in your drive.' : 'Monitoring ready. Start a trip when you’re ready.'}
        </Text>
        <Text style={[styles.lastEvent, { color: colors.mutedForeground }]}>Last event · {lastEventLabel}</Text>
        {!tripActive && !placementConfirmed ? (
          <View style={[styles.placement, { backgroundColor: colors.accent }]}>
            <View style={styles.placementHeader}><Feather name="smartphone" size={17} color={colors.primary} /><Text style={[styles.placementTitle, { color: colors.foreground }]}>Phone placement</Text></View>
            <Text style={[styles.placementBody, { color: colors.mutedForeground }]}>For better detection:</Text>
            {['Secure your phone', 'Keep it stable', 'Avoid holding it while driving', 'Use a consistent position'].map((tip) => <Text key={tip} style={[styles.placementTip, { color: colors.foreground }]}><Text style={{ color: colors.primary }}>✓ </Text>{tip}</Text>)}
            <Pressable onPress={() => setPlacementConfirmed(true)} style={[styles.gotIt, { borderColor: colors.border }]}><Text style={[styles.gotItText, { color: colors.primary }]}>Got it</Text></Pressable>
          </View>
        ) : null}
        <PrimaryButton
          icon={tripActive ? 'activity' : 'play'}
          testID="trip-toggle"
          onPress={async () => {
            if (tripActive) {
              router.push('/trip');
              return;
            }
            const started = await startTrip();
            if (started) router.push('/trip');
          }}
          disabled={!hydrated || (!tripActive && !placementConfirmed)}
        >
          {tripActive ? 'Open live trip' : 'Start trip'}
        </PrimaryButton>
        {permissionGranted === false ? (
          <Text style={[styles.permission, { color: colors.warning }]}>Location access is needed to start monitoring. Enable it in your device settings.</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionLabel>At a glance</SectionLabel>
        <View style={[styles.metricsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Metric label="Safety score" value={`${score}`} unit="/100" />
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <Metric label="Trips protected" value={`${trips.length}`} />
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <Metric label="Trusted contacts" value={`${contacts.length}`} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>Quick access</SectionLabel>
        <View style={styles.quickGrid}>
          <QuickAction icon="users" title="Contacts" caption={`${contacts.length} trusted`} onPress={() => router.push('/contacts')} colors={colors} />
          <QuickAction icon="clock" title="Trip history" caption={recentTrip ? formatDuration(recentTrip.duration) : 'Nothing yet'} onPress={() => router.push('/history')} colors={colors} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>How it works</SectionLabel>
        <View style={styles.steps}>
          {[
            ['01', 'We watch quietly', 'Motion and location stay focused on the trip.'],
            ['02', 'You get a moment', 'If something looks wrong, you have 30 seconds to check in.'],
            ['03', 'Your people know', 'If you can’t respond, your alert reaches your trusted contacts.'],
          ].map(([number, title, body]) => (
            <View key={number} style={styles.step}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>{number}</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
                <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  title,
  caption,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  caption: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={[styles.quickTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.quickCaption, { color: colors.mutedForeground }]}>{caption}</Text>
      <Feather name="arrow-up-right" size={17} color={colors.mutedForeground} style={styles.quickArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, marginTop: -16, marginBottom: 22 },
  heroCard: { borderRadius: 26, borderWidth: 1, padding: 20, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { fontSize: 11, letterSpacing: 1.2, fontWeight: '700', marginBottom: 8 },
  heroStatus: { fontSize: 25, fontWeight: '700', letterSpacing: -0.7 },
  signal: { width: 122, height: 122, borderRadius: 61, borderWidth: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 23 },
  signalRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 1, opacity: 0.35 },
  signalCore: { width: 34, height: 34, borderRadius: 17 },
  heroDescription: { textAlign: 'center', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  demoPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginTop: 20, marginBottom: 2 },
  demoDot: { width: 6, height: 6, borderRadius: 3 },
  demoText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  lastEvent: { textAlign: 'center', fontSize: 11, marginTop: -7, marginBottom: 15 },
  placement: { borderRadius: 16, padding: 13, marginBottom: 14 },
  placementHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  placementTitle: { fontSize: 13, fontWeight: '700' },
  placementBody: { fontSize: 12, marginBottom: 6 },
  placementTip: { fontSize: 12, lineHeight: 20 },
  gotIt: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, marginTop: 9 },
  gotItText: { fontSize: 12, fontWeight: '700' },
  permission: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 12 },
  section: { marginTop: 28 },
  metricsCard: { borderRadius: 20, borderWidth: 1, flexDirection: 'row', padding: 18 },
  metricDivider: { width: 1, marginHorizontal: 12 },
  quickGrid: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, minHeight: 142, borderRadius: 20, borderWidth: 1, padding: 15 },
  quickIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  quickTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  quickCaption: { fontSize: 12 },
  quickArrow: { position: 'absolute', top: 16, right: 16 },
  pressed: { opacity: 0.77, transform: [{ scale: 0.985 }] },
  steps: { gap: 20 },
  step: { flexDirection: 'row', gap: 15, alignItems: 'flex-start' },
  stepNumber: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingTop: 2 },
  stepCopy: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stepBody: { fontSize: 13, lineHeight: 19 },
});