import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Metric, PrimaryButton, StatusPill } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function TripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    tripActive,
    status,
    elapsedSeconds,
    distanceKm,
    speedKmh,
    confidence,
    alertSecondsLeft,
    emergencySent,
    canCancelEmergency,
    stopTrip,
    acknowledgeOk,
    cancelEmergency,
    triggerManualSos,
  } = useTrip();

  if (!tripActive) {
    router.replace('/');
    return null;
  }

  const statusColor = status === 'SAFE' ? colors.primary : status === 'ALERT' ? colors.warning : colors.destructive;
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Live trip</Text>
        <Pressable
          onPress={() =>
            Alert.alert('End this trip?', 'Your trip will be saved to history.', [
              { text: 'Keep driving', style: 'cancel' },
              { text: 'End trip', style: 'destructive', onPress: async () => { await stopTrip(); router.replace('/summary'); } },
            ])
          }
          style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.main}>
        <View style={[styles.statusHeader, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}44` }]}>
          <StatusPill status={status} />
          <Text style={[styles.statusMessage, { color: colors.foreground }]}>
            {status === 'SAFE' ? 'You’re covered' : status === 'ALERT' ? 'Please check in' : 'Emergency alert sent'}
          </Text>
          {confidence ? <Text style={[styles.confidence, { color: colors.mutedForeground }]}>{Math.round(confidence * 100)}% confidence</Text> : null}
        </View>

        <View style={styles.gaugeArea}>
          <Text style={[styles.speed, { color: statusColor }]}>{Math.round(speedKmh)}</Text>
          <Text style={[styles.speedUnit, { color: colors.mutedForeground }]}>km/h</Text>
          <View style={[styles.gaugeTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.gaugeFill, { width: `${Math.min(100, Math.max(7, speedKmh / 1.4))}%`, backgroundColor: statusColor }]} />
          </View>
          <Text style={[styles.gaugeHint, { color: colors.mutedForeground }]}>CURRENT SPEED</Text>
        </View>

        <View style={[styles.metrics, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Metric label="Elapsed" value={formatTime(elapsedSeconds)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Metric label="Distance" value={distanceKm.toFixed(1)} unit=" km" />
        </View>

        <View style={styles.footer}>
          {emergencySent ? (
            <View style={[styles.emergencyNote, { backgroundColor: `${colors.destructive}12`, borderColor: `${colors.destructive}44` }]}>
              <Feather name="radio" color={colors.destructive} size={19} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.emergencyTitle, { color: colors.destructive }]}>Emergency alert sent</Text>
                <Text style={[styles.emergencyBody, { color: colors.mutedForeground }]}>Your location was shared with your response circle.</Text>
              </View>
            </View>
          ) : null}
          {status === 'ALERT' ? (
            <View style={[styles.alertOverlay, { backgroundColor: colors.card, borderColor: colors.warning }]}>
              <Text style={[styles.countdown, { color: colors.warning }]}>{alertSecondsLeft}</Text>
              <Text style={[styles.countdownLabel, { color: colors.foreground }]}>seconds to check in</Text>
              <PrimaryButton icon="check" onPress={acknowledgeOk} testID="im-ok">I’m OK</PrimaryButton>
            </View>
          ) : (
            <>
              <PrimaryButton
                icon="shield"
                variant="danger"
                onPress={() => Alert.alert('Trigger emergency alert?', 'This will notify your response circle now.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send SOS', style: 'destructive', onPress: () => void triggerManualSos() },
                ])}
                testID="manual-sos"
              >
                SOS — I need help
              </PrimaryButton>
              <Pressable
                onPress={() => Alert.alert('End this trip?', 'Your trip will be saved to history.', [
                  { text: 'Keep driving', style: 'cancel' },
                  { text: 'End trip', style: 'destructive', onPress: async () => { await stopTrip(); router.replace('/summary'); } },
                ])}
                style={styles.endButton}
              >
                <Text style={[styles.endButtonText, { color: colors.mutedForeground }]}>End trip</Text>
              </Pressable>
            </>
          )}
          {canCancelEmergency ? (
            <Pressable onPress={cancelEmergency} style={[styles.cancelButton, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel false alert</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontSize: 16, fontWeight: '700' },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, justifyContent: 'space-between', paddingTop: 26 },
  statusHeader: { borderRadius: 19, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusMessage: { flex: 1, fontSize: 15, fontWeight: '700' },
  confidence: { fontSize: 11 },
  gaugeArea: { alignItems: 'center', paddingVertical: 30 },
  speed: { fontSize: 76, lineHeight: 82, fontWeight: '700', letterSpacing: -4 },
  speedUnit: { fontSize: 15, fontWeight: '600', marginBottom: 24 },
  gaugeTrack: { width: '86%', height: 7, borderRadius: 10, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 10 },
  gaugeHint: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700', marginTop: 12 },
  metrics: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, padding: 18 },
  divider: { width: 1, marginHorizontal: 18 },
  footer: { gap: 14 },
  emergencyNote: { borderRadius: 17, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  emergencyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  emergencyBody: { fontSize: 12, lineHeight: 17 },
  alertOverlay: { borderRadius: 22, borderWidth: 1, padding: 18, alignItems: 'center', gap: 10 },
  countdown: { fontSize: 58, lineHeight: 62, fontWeight: '700', letterSpacing: -2 },
  countdownLabel: { fontSize: 14, marginBottom: 6 },
  endButton: { alignItems: 'center', paddingVertical: 8 },
  endButtonText: { fontSize: 14, fontWeight: '600' },
  cancelButton: { alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14 },
  cancelText: { fontSize: 14, fontWeight: '700' },
});