import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metric, PrimaryButton, ScreenHeader, SectionLabel, StatusPill } from '@/components/AppPrimitives';
import { SensorStatusCard } from '@/components/SensorStatusCard';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function LiveTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tripActive, status, speedKmh, elapsedSeconds, distanceKm, permissionGranted, startTrip, windowsProcessed, settings, networkAvailable, triggerManualSos } = useTrip();
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="Active protection" title="Live trip" action={<StatusPill status={status} />} />
      {!tripActive ? (
        <View style={[styles.startCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.startIcon, { backgroundColor: colors.accent }]}><Feather name="shield" size={25} color={colors.primary} /></View>
          <Text style={[styles.startTitle, { color: colors.foreground }]}>Nothing is being monitored</Text>
          <Text style={[styles.startBody, { color: colors.mutedForeground }]}>Start a trip to activate your phone’s safety sensors and GPS.</Text>
          <PrimaryButton icon="play" onPress={async () => { const started = await startTrip(); if (started) router.push('/trip'); }} disabled={permissionGranted === null}>Start trip</PrimaryButton>
        </View>
      ) : (
        <>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statusRow}><View><Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>SAFETY STATUS</Text><Text style={[styles.statusTitle, { color: status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive }]}>{status === 'SAFE' ? 'Driving monitored' : status === 'ALERT' ? 'Check in now' : 'Emergency active'}</Text></View><Feather name={status === 'SAFE' ? 'check-circle' : 'alert-triangle'} size={28} color={status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive} /></View>
            <Text style={[styles.speed, { color: colors.foreground }]}>{Math.round(speedKmh)}<Text style={[styles.speedUnit, { color: colors.mutedForeground }]}> km/h</Text></Text>
            <View style={styles.metrics}><Metric label="Trip duration" value={formatTime(elapsedSeconds)} /><Metric label="Distance" value={distanceKm.toFixed(1)} unit=" km" /></View>
            <PrimaryButton icon="maximize-2" onPress={() => router.push('/trip')}>Open glance view</PrimaryButton>
          </View>
          <SectionLabel>Sensor status</SectionLabel>
          <SensorStatusCard locationReady={permissionGranted === true} isMockAi={settings.mockAi} isOffline={!networkAvailable} windowsProcessed={windowsProcessed} />
          <PrimaryButton icon="shield" variant="danger" onPress={() => Alert.alert('Trigger emergency alert?', 'This will notify your response circle now.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Send SOS', style: 'destructive', onPress: () => void triggerManualSos() }])} style={styles.sos}>SOS — I need help</PrimaryButton>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  startCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 13 },
  startIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  startTitle: { fontSize: 20, fontWeight: '700' },
  startBody: { fontSize: 14, lineHeight: 21, marginBottom: 5 },
  statusCard: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 18 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 6 },
  statusTitle: { fontSize: 22, fontWeight: '700' },
  speed: { fontSize: 61, fontWeight: '700', letterSpacing: -3 },
  speedUnit: { fontSize: 16, letterSpacing: 0 },
  metrics: { flexDirection: 'row', gap: 28 },
  sos: { marginTop: 4 },
});