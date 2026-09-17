import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function SensorStatusCard({
  locationReady,
  isMockAi,
  isOffline,
  windowsProcessed,
}: {
  locationReady: boolean;
  isMockAi: boolean;
  isOffline: boolean;
  windowsProcessed: number;
}) {
  const colors = useColors();
  const rows = [
    ['activity', 'Accelerometer', true],
    ['rotate-cw', 'Gyroscope', true],
    ['map-pin', 'GPS', locationReady],
    ['cpu', isMockAi ? 'Mock AI' : 'AI Detection', true],
    ['wifi-off', 'Network', !isOffline],
  ] as const;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.foreground }]}>System status</Text>
        <Text style={[styles.windows, { color: colors.mutedForeground }]}>{windowsProcessed} windows</Text>
      </View>
      <View style={styles.grid}>
        {rows.map(([icon, label, active]) => (
          <View key={label} style={styles.row}>
            <Feather name={icon} size={15} color={active ? colors.primary : colors.warning} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
            <View style={[styles.dot, { backgroundColor: active ? colors.primary : colors.warning }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 14, fontWeight: '700' },
  windows: { fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  row: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontSize: 12, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 3 },
});