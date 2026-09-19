/**
 * Offline — Batch 5.
 *
 * Reachable when the app detects `networkAvailable === false`. It doesn't
 * claim to sync when it can't; the copy is careful about what still works
 * offline (sensors keep running locally).
 *
 * "Try Again" is a soft retry hint — the actual network state comes back
 * on its own when connectivity returns; we simply pop the screen so the
 * user can rejoin the flow.
 */

import React from 'react';
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTrip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const SAFE = '#22C55E';
const WARN = '#F59E0B';

export default function OfflineScreen() {
  const insets = useSafeAreaInsets();
  const { networkAvailable, tripActive } = useTrip();

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={NAVY} />
        </Pressable>

        <View style={styles.body}>
          <Image
            source={require('@/assets/mascot/offline.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
          <Text style={styles.title}>You're Offline</Text>
          <Text style={styles.sub}>
            Cloud sync is paused. Local safety monitoring keeps running —
            sensors, alerts, and manual SOS all still work on this device.
          </Text>

          <View style={styles.statusCard}>
            <StatusLine
              icon="activity"
              label="Sensors"
              value="Running locally"
              color={SAFE}
            />
            <Divider />
            <StatusLine
              icon="wifi-off"
              label="Cloud"
              value={networkAvailable ? 'Reconnecting…' : 'Offline'}
              color={WARN}
            />
            <Divider />
            <StatusLine
              icon="navigation"
              label="Live Trip"
              value={tripActive ? 'Active' : 'Idle'}
              color={tripActive ? SAFE : MUTED}
            />
          </View>

          <PrimaryButton
            label="Try Again"
            onPress={() => router.back()}
            style={styles.ctaBtn}
          />
        </View>
      </View>
    </AppBackground>
  );
}

function StatusLine({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.line}>
      <View style={[styles.lineIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, { color }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },

  iconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  body: { flex: 1, alignItems: 'center', gap: 12, marginTop: 12 },
  mascot: { width: 160, height: 160 },
  title: { color: NAVY, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: NAVY_SOFT, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

  statusCard: {
    alignSelf: 'stretch',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  lineIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  lineLabel: { flex: 1, color: NAVY, fontSize: 13, fontWeight: '700' },
  lineValue: { fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  ctaBtn: { alignSelf: 'stretch', marginTop: 'auto' },
});
