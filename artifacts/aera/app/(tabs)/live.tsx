/**
 * Live Trip Tab — Premium safety monitoring overview with sensor health
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SectionHeader, StatusPill, GlassCard } from '@/components/AppPrimitives';
import { Mascot } from '@/components/Mascot';
import { SensorGrid } from '@/components/SensorTiles';
import { SOSButton } from '@/components/SOSButton';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

const formatTime = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function LiveTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    tripActive,
    status,
    speedKmh,
    elapsedSeconds,
    distanceKm,
    permissionGranted,
    startTrip,
    windowsProcessed,
    settings,
    networkAvailable,
    triggerManualSos,
  } = useTrip();

  const statusColor =
    status === 'SAFE' ? colors.safe : status === 'ALERT' ? colors.warning : colors.destructive;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!tripActive) return;
    const speed = status === 'EMERGENCY' ? 400 : status === 'ALERT' ? 700 : 2000;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: speed, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [status, tripActive, pulseAnim]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text1 }]}>Live Trip</Text>
          <Text style={[styles.screenSub, { color: colors.text3 }]}>
            {tripActive ? 'Active monitoring' : 'No trip in progress'}
          </Text>
        </View>
        {tripActive && <StatusPill status={status} />}
      </View>

      {!tripActive ? (
        /* ── No trip state ── */
        <View>
          <GlassCard style={styles.startCard}>
            <View style={styles.startMascotWrap}>
              <Mascot size={120} pose="sos" />
            </View>
            <Text style={[styles.startTitle, { color: colors.text1 }]}>Nothing being monitored</Text>
            <Text style={[styles.startBody, { color: colors.text3 }]}>
              Start a trip to activate accelerometer, gyroscope, GPS and AI safety monitoring.
            </Text>
            <PrimaryButton
              icon="play"
              onPress={async () => {
                const started = await startTrip();
                if (started) router.push('/trip');
              }}
              disabled={permissionGranted === null}
            >
              Start Monitoring
            </PrimaryButton>
          </GlassCard>

          {/* How it works mini */}
          <View style={styles.miniSteps}>
            {[
              ['activity', 'Sensors', '150-sample AI windows'],
              ['cpu', 'AI Engine', 'SAFE / ALERT / EMERGENCY'],
              ['users', 'Response', 'Auto-notifies contacts'],
            ].map(([icon, title, sub]) => (
              <GlassCard key={title} style={styles.miniStep} noPadding>
                <View style={[styles.miniStepIcon, { backgroundColor: colors.brandBlueSubtle }]}>
                  <Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={18} color={colors.brandBlue} />
                </View>
                <Text style={[styles.miniStepTitle, { color: colors.text1 }]}>{title}</Text>
                <Text style={[styles.miniStepSub, { color: colors.text3 }]}>{sub}</Text>
              </GlassCard>
            ))}
          </View>
        </View>
      ) : (
        /* ── Active trip state ── */
        <>
          {/* Status overview card */}
          <GlassCard style={styles.statusCard}>
            <View style={styles.statusTop}>
              <View>
                <Text style={[styles.statusLabel, { color: colors.text3 }]}>SAFETY STATUS</Text>
                <Text style={[styles.statusValue, { color: statusColor }]}>
                  {status === 'SAFE' ? 'Driving Monitored' : status === 'ALERT' ? 'Check In Now' : 'Emergency Active'}
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.statusDotLarge,
                  { backgroundColor: statusColor + '25', transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={[styles.statusDotCore, { backgroundColor: statusColor }]} />
              </Animated.View>
            </View>

            {/* Speed + distance + time */}
            <View style={styles.metricsRow}>
              <View style={styles.speedSection}>
                <Text style={[styles.speedBig, { color: colors.text1 }]}>{Math.round(speedKmh)}</Text>
                <Text style={[styles.speedUnit, { color: colors.text3 }]}>km/h</Text>
              </View>
              <View style={[styles.metricsDivider, { backgroundColor: colors.border }]} />
              <View style={styles.twoMetrics}>
                <View style={styles.smallMetric}>
                  <Text style={[styles.smallMetricVal, { color: colors.text1 }]}>{distanceKm.toFixed(1)}</Text>
                  <Text style={[styles.smallMetricLabel, { color: colors.text3 }]}>km</Text>
                </View>
                <View style={[styles.smallMetric, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                  <Text style={[styles.smallMetricVal, { color: colors.text1 }]}>{formatTime(elapsedSeconds)}</Text>
                  <Text style={[styles.smallMetricLabel, { color: colors.text3 }]}>elapsed</Text>
                </View>
              </View>
            </View>

            {/* Open full view button */}
            <PrimaryButton
              icon="maximize-2"
              onPress={() => router.push('/trip')}
              variant="secondary"
            >
              Open Full Monitoring View
            </PrimaryButton>
          </GlassCard>

          {/* Sensor health */}
          <View style={styles.section}>
            <SectionHeader title="Sensor Health" />
            <SensorGrid
              locationReady={permissionGranted === true}
              isMockAi={settings.mockAi}
              isOffline={!networkAvailable}
              windowsProcessed={windowsProcessed}
            />
          </View>

          {/* SOS */}
          <View style={styles.section}>
            <SectionHeader title="Emergency" />
            <GlassCard style={[styles.sosCard, { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' }]}>
              <Text style={[styles.sosTip, { color: colors.text3 }]}>
                Hold the SOS button to trigger an emergency alert to your contacts.
              </Text>
              <View style={styles.sosCenter}>
                <SOSButton onActivate={() => void triggerManualSos()} />
              </View>
            </GlassCard>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  screenSub: { fontSize: 13, marginTop: 2 },

  // No trip
  startCard: { padding: 24, gap: 14, marginBottom: 16, alignItems: 'center' },
  startMascotWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  startIconWrap: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  startTitle: { fontSize: 20, fontWeight: '700' },
  startBody: { fontSize: 14, lineHeight: 21 },
  miniSteps: { flexDirection: 'row', gap: 10 },
  miniStep: { flex: 1, padding: 14, gap: 6 },
  miniStepIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  miniStepTitle: { fontSize: 13, fontWeight: '700' },
  miniStepSub: { fontSize: 11, lineHeight: 15 },

  // Active trip
  statusCard: { padding: 20, gap: 20 },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  statusValue: { fontSize: 20, fontWeight: '800' },
  statusDotLarge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  statusDotCore: { width: 24, height: 24, borderRadius: 12 },

  metricsRow: { flexDirection: 'row', gap: 0 },
  speedSection: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  speedBig: { fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56 },
  speedUnit: { fontSize: 15, fontWeight: '600', paddingBottom: 6 },
  metricsDivider: { width: 1, marginHorizontal: 16, alignSelf: 'stretch' },
  twoMetrics: { flex: 1 },
  smallMetric: { paddingVertical: 6 },
  smallMetricVal: { fontSize: 18, fontWeight: '700' },
  smallMetricLabel: { fontSize: 11, marginTop: 2 },

  section: { gap: 12 },
  sosCard: { padding: 20, gap: 16 },
  sosTip: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  sosCenter: { alignItems: 'center' },
});