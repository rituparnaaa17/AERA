import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Metric, PrimaryButton, SectionLabel } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lastCompletedTrip, dismissCompletedTrip } = useTrip();
  if (!lastCompletedTrip) {
    router.replace('/');
    return null;
  }
  const alerts = lastCompletedTrip.alertCount ?? lastCompletedTrip.events.filter((event) => event.status === 'ALERT').length;
  const score = lastCompletedTrip.emergencyTriggered ? 52 : alerts ? 82 : 96;
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 26 }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}><Feather name="check" size={29} color={colors.primary} /></View>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>TRIP COMPLETE</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>You’re safely there.</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>Your monitored drive has been saved to trip history.</Text>
      <View style={[styles.metrics, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Metric label="Duration" value={`${Math.floor(lastCompletedTrip.duration / 60)}`} unit=" min" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Metric label="Distance" value={lastCompletedTrip.distance.toFixed(1)} unit=" km" />
      </View>
      <SectionLabel>Safety summary</SectionLabel>
      <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View><Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>SAFETY SCORE</Text><Text style={[styles.score, { color: colors.primary }]}>{score}<Text style={[styles.scoreUnit, { color: colors.mutedForeground }]}> / 100</Text></Text></View>
        <View style={styles.scoreIcon}><Feather name={lastCompletedTrip.emergencyTriggered ? 'alert-triangle' : 'shield'} size={24} color={lastCompletedTrip.emergencyTriggered ? colors.warning : colors.primary} /></View>
      </View>
      <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SummaryLine label="Safe windows" value={`${lastCompletedTrip.safeWindows ?? 0}`} colors={colors} />
        <SummaryLine label="Alerts" value={`${alerts}`} colors={colors} />
        <SummaryLine label="Emergencies" value={lastCompletedTrip.emergencyTriggered ? '1' : '0'} colors={colors} />
      </View>
      <PrimaryButton icon="arrow-right" onPress={() => { dismissCompletedTrip(); router.replace('/history'); }}>View trip details</PrimaryButton>
      <PrimaryButton variant="ghost" onPress={() => { dismissCompletedTrip(); router.replace('/'); }}>Back to home</PrimaryButton>
    </ScrollView>
  );
}

function SummaryLine({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.summaryLine}><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 16 },
  iconCircle: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  title: { fontSize: 35, lineHeight: 42, letterSpacing: -1.3, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21, marginTop: -7, marginBottom: 14 },
  metrics: { borderRadius: 20, borderWidth: 1, padding: 18, flexDirection: 'row', marginBottom: 8 },
  divider: { width: 1, marginHorizontal: 18 },
  scoreCard: { borderWidth: 1, borderRadius: 20, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 6 },
  score: { fontSize: 40, fontWeight: '700', letterSpacing: -1.5 },
  scoreUnit: { fontSize: 15, letterSpacing: 0 },
  scoreIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 7, marginBottom: 6 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
});