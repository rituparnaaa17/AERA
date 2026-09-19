/**
 * TripRouteMap.web.tsx — Web fallback for TripRouteMap.
 *
 * Avoids importing `react-native-maps` on Web (which throws `codegenNativeComponent is not a function`
 * on react-native-web). Renders an interactive or clean visual placeholder card.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Sample = { lat: number; lng: number };

const NAVY = '#0F1E4A';
const MUTED = '#64748B';
const CARD_BORDER = '#E2ECF7';

export function TripRouteMap({
  samples,
  height = 220,
  distanceKm,
}: {
  samples: Sample[];
  height?: number;
  currentIndicator?: boolean;
  distanceKm?: number;
}) {
  const hasRoute = samples.length > 0;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.emptyWrap}>
        <Feather name={hasRoute ? "map-pin" : "map"} size={28} color={hasRoute ? '#2563EB' : MUTED} />
        <Text style={styles.emptyTitle}>
          {hasRoute ? `Route Recorded (${samples.length} GPS Points)` : 'Route unavailable for this trip'}
        </Text>
        <Text style={styles.emptySub}>
          {hasRoute
            ? 'Open on iOS or Android using Expo Go to view interactive map tiles.'
            : 'No GPS samples were recorded during the drive.'}
        </Text>
      </View>

      {distanceKm != null && (
        <View style={styles.distChip}>
          <Feather name="navigation" size={11} color={NAVY} />
          <Text style={styles.distText}>{distanceKm.toFixed(1)} km</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#EEF4FE',
    position: 'relative',
  },
  distChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  distText: { color: NAVY, fontSize: 11, fontWeight: '800' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  emptyTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  emptySub: { color: MUTED, fontSize: 12, textAlign: 'center', maxWidth: 280 },
});

export default TripRouteMap;
