import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader, SectionLabel } from '@/components/AppPrimitives';
import { useTrip, Trip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

const formatDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(date));
const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trips } = useTrip();
  const [selected, setSelected] = useState<Trip | null>(null);
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader eyebrow="Your record" title="Trip history" />
      {selected ? (
        <View>
          <Pressable onPress={() => setSelected(null)} style={styles.back}>
            <Feather name="arrow-left" size={16} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>All trips</Text>
          </Pressable>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailDate, { color: colors.foreground }]}>{formatDate(selected.startedAt)}</Text>
            <Text style={[styles.detailSummary, { color: colors.mutedForeground }]}>{formatDuration(selected.duration)} · {selected.distance.toFixed(1)} km</Text>
            <SectionLabel>Timeline</SectionLabel>
            {selected.events.map((event) => (
              <View key={event.id} style={styles.event}>
                <View style={[styles.eventDot, { backgroundColor: event.status === 'EMERGENCY' ? colors.destructive : event.status === 'ALERT' ? colors.warning : colors.primary }]} />
                <View style={styles.eventCopy}>
                  <Text style={[styles.eventLabel, { color: colors.foreground }]}>{event.label}</Text>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>{new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : trips.length ? (
        <>
          <View style={[styles.summary, { backgroundColor: colors.accent }]}>
            <Feather name="trending-up" size={19} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.foreground }]}>Your recent drives are looking good.</Text>
          </View>
          <View style={styles.list}>
            {trips.map((trip) => (
              <Pressable key={trip.id} onPress={() => setSelected(trip)} style={({ pressed }) => [styles.tripRow, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
                <View style={[styles.rowIcon, { backgroundColor: trip.hadAlert ? `${colors.warning}1A` : colors.accent }]}>
                  <Feather name={trip.hadAlert ? 'alert-triangle' : 'check'} size={18} color={trip.hadAlert ? colors.warning : colors.primary} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{formatDate(trip.startedAt)}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{formatDuration(trip.duration)} · {trip.distance.toFixed(1)} km</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowState, { color: trip.hadAlert ? colors.warning : colors.primary }]}>{trip.hadAlert ? 'Reviewed' : 'Safe'}</Text>
                  <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <EmptyState icon="clock" title="No trips yet" body="Start your first monitored trip and your drive record will appear here." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  summary: { borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  summaryText: { fontSize: 13, fontWeight: '600', flex: 1 },
  list: { gap: 10 },
  tripRow: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  rowSub: { fontSize: 12 },
  rowRight: { alignItems: 'flex-end', gap: 7 },
  rowState: { fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.76 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '700' },
  detailCard: { borderRadius: 22, borderWidth: 1, padding: 18 },
  detailDate: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  detailSummary: { fontSize: 13, marginBottom: 28 },
  event: { flexDirection: 'row', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: 'rgba(145,169,171,0.14)' },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  eventCopy: { flex: 1 },
  eventLabel: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  eventTime: { fontSize: 12 },
});