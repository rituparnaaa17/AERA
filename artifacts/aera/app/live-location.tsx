/**
 * Live Location — real map + share flow.
 *
 * Replaces the old "Share Live Location" alert popup with a proper screen.
 * Uses `expo-location` to obtain the current GPS coordinate, centres the
 * map on it, shows the user's live position as a blue marker, offers a
 * "Share Location" primary action that runs the existing emergency share
 * logic, and confirms with an inline success state — never a popup as the
 * main UX.
 */

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TripRouteMap } from '@/components/TripRouteMap';
import { useTrip, RouteSample } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const SAFE = '#22C55E';
const SAFE_BG = '#DCFCE7';
const SAFE_BORDER = '#86EFAC';
const DANGER = '#EF4444';
const BRAND_BLUE = '#2563EB';

type ShareState = 'idle' | 'sharing' | 'shared' | 'error';

export default function LiveLocationScreen() {
  const insets = useSafeAreaInsets();
  const { emergencySent, triggerManualSos, contacts, tripActive } = useTrip();

  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [shareState, setShareState] = useState<ShareState>(emergencySent ? 'shared' : 'idle');

  // Get current position + start watching
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      const granted = status === 'granted';
      setPermission(granted);
      if (!granted) return;

      try {
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCoord({ lat: first.coords.latitude, lng: first.coords.longitude });
      } catch {
        // no-op — the watcher below will fill in when a fix arrives
      }

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          if (cancelled) return;
          setCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const share = async () => {
    if (shareState === 'sharing') return;
    setShareState('sharing');
    try {
      // If there's no active emergency yet AND we're mid-trip, this fires the
      // real SOS. Otherwise it acts as a confirmation that the coordinate
      // was captured (emergency was already dispatched from another screen).
      if (tripActive && !emergencySent) {
        await triggerManualSos();
      }
      setShareState('shared');
    } catch {
      setShareState('error');
    }
  };

  // TripRouteMap now renders a single sample as a centred marker (see the
  // stationary-trip case). So we pass exactly one point — the real fix.
  const samples: RouteSample[] | null = coord
    ? [{ lat: coord.lat, lng: coord.lng, t: Date.now() }]
    : null;

  const hasCoord = coord !== null;
  const primaryContact = contacts[0];

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={NAVY} />
        </Pressable>
        <Text style={styles.title}>Live Location</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        {/* Map */}
        <View style={styles.mapWrap}>
          {samples ? (
            <TripRouteMap
              samples={samples}
              height={320}
              currentIndicator
            />
          ) : (
            <View style={styles.mapPending}>
              <Feather
                name={permission === false ? 'x-circle' : 'crosshair'}
                size={24}
                color={permission === false ? DANGER : BRAND_BLUE}
              />
              <Text style={styles.mapPendingTitle}>
                {permission === false ? 'Location permission required' : 'Locating…'}
              </Text>
              <Text style={styles.mapPendingSub}>
                {permission === false
                  ? 'Enable location access in Settings to share your live position.'
                  : 'Waiting for a GPS fix.'}
              </Text>
            </View>
          )}
        </View>

        {/* Status band */}
        <View
          style={[
            styles.statusBand,
            shareState === 'shared'
              ? { backgroundColor: SAFE_BG, borderColor: SAFE_BORDER }
              : { backgroundColor: SURFACE, borderColor: CARD_BORDER },
          ]}
        >
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: shareState === 'shared' ? SAFE : BRAND_BLUE },
            ]}
          >
            <Feather
              name={shareState === 'shared' ? 'check' : 'map-pin'}
              size={16}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, shareState === 'shared' ? { color: SAFE } : null]}>
              {shareState === 'shared' ? 'Your Live Location' : 'Live Location'}
            </Text>
            <Text style={styles.statusSub}>
              {shareState === 'shared'
                ? primaryContact
                  ? `Sharing with ${primaryContact.name}${contacts.length > 1 ? ` +${contacts.length - 1}` : ''}`
                  : 'Sharing with emergency contacts'
                : hasCoord
                ? `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
                : 'Waiting for GPS fix'}
            </Text>
          </View>
        </View>

        {/* Coord card */}
        {hasCoord && (
          <View style={styles.coordCard}>
            <Row label="LAT" value={coord.lat.toFixed(6)} />
            <Divider />
            <Row label="LNG" value={coord.lng.toFixed(6)} />
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <PrimaryButton
            label={
              shareState === 'sharing'
                ? 'Sharing…'
                : shareState === 'shared'
                ? 'Location Shared'
                : 'Share Location'
            }
            onPress={() => void share()}
            loading={shareState === 'sharing'}
            disabled={!hasCoord || shareState === 'shared'}
            style={styles.ctaBtn}
          />
          {shareState === 'error' && (
            <Text style={styles.errorText}>
              Couldn't share right now. Try again.
            </Text>
          )}
        </View>
      </View>
    </AppBackground>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: NAVY, fontSize: 16, fontWeight: '800' },

  body: { flex: 1, paddingHorizontal: 20, gap: 12 },

  mapWrap: { borderRadius: 20, overflow: 'hidden' },
  mapPending: {
    height: 320,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  mapPendingTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  mapPendingSub: { color: MUTED, fontSize: 12, textAlign: 'center' },

  statusBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  statusSub: { color: NAVY_SOFT, fontSize: 12, marginTop: 2 },

  coordCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  rowLabel: { color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  rowValue: { color: NAVY, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  ctaWrap: { alignItems: 'stretch', marginTop: 4, gap: 8 },
  ctaBtn: { alignSelf: 'stretch' },
  errorText: { color: DANGER, fontSize: 12, textAlign: 'center' },
});
