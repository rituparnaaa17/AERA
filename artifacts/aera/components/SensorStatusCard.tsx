/**
 * SensorStatusCard — Premium redesign
 * Shows sensor health with colored status dots and compact layout.
 */

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
  const rows: [React.ComponentProps<typeof Feather>['name'], string, boolean][] = [
    ['activity', 'Accelerometer', true],
    ['refresh-cw', 'Gyroscope', true],
    ['map-pin', 'GPS', locationReady],
    ['cpu', isMockAi ? 'Mock AI' : 'AI Engine', true],
    ['wifi', 'Cloud', !isOffline],
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <View>
          <Text style={[styles.title, { color: colors.text1 }]}>System Status</Text>
          <Text style={[styles.sub, { color: colors.text3 }]}>All sensors monitored</Text>
        </View>
        <View style={[styles.windowsBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.windowsText, { color: colors.text3 }]}>{windowsProcessed} windows</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {rows.map(([icon, label, active]) => (
          <View key={label} style={[styles.row, { borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: active ? '#F0FBF5' : '#FFF8F0' }]}>
              <Feather name={icon} size={15} color={active ? colors.safe : colors.warning} />
            </View>
            <Text style={[styles.label, { color: colors.text2 }]}>{label}</Text>
            <View style={[styles.dot, { backgroundColor: active ? colors.safe : colors.warning }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  windowsBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  windowsText: { fontSize: 11, fontWeight: '600' },
  grid: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, flex: 1, fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});