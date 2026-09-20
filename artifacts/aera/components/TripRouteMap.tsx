/**
 * TripRouteMap — real geographic map for trip route + Live Location.
 *
 * Uses `react-native-maps` with an OpenStreetMap `UrlTile` overlay so we
 * never depend on Google Maps API keys. The map's native basemap is left
 * on the platform default (Apple Maps on iOS, Google Maps SDK on Android)
 * but is fully covered by the OSM raster tiles, which is why we don't
 * need `provider={PROVIDER_GOOGLE}` and don't need `googleMaps.apiKey`
 * configured in app.json.
 *
 * States handled:
 *   • 0 samples             → clean "Route unavailable" card.
 *   • 1 sample (stationary) → real OSM map centred on that coordinate with a
 *                             single blue marker.
 *   • 2+ samples            → polyline + green start + blue end markers,
 *                             viewport fit to bounds.
 *
 * On web (react-native-maps has no web renderer) the component falls back
 * to the "unavailable" card so the app still builds and runs on Metro web.
 *
 * OpenStreetMap tiles are attributed inline per the OSM Tile Usage Policy.
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
let UrlTile: any = View;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    UrlTile = Maps.UrlTile;
  } catch (e) {
    console.warn('react-native-maps failed to load:', e);
  }
}

type Sample = { lat: number; lng: number };

const NAVY = '#0F1E4A';
const MUTED = '#64748B';
const BRAND = '#2563EB';
const SAFE = '#22C55E';
const CARD_BORDER = '#E2ECF7';

export function TripRouteMap({
  samples,
  height = 220,
  currentIndicator,
  distanceKm,
}: {
  samples: Sample[];
  height?: number;
  /** Highlight the last sample as a live position dot. */
  currentIndicator?: boolean;
  /** Overlay the distance chip in the top-right corner. */
  distanceKm?: number;
}) {
  // Hooks BEFORE any conditional return
  const region = useMemo(() => {
    if (samples.length === 0) return null;
    const lats = samples.map((s) => s.lat);
    const lngs = samples.map((s) => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    // Pad the deltas so we don't sit tight on markers.
    const latDelta = Math.max(0.003, (maxLat - minLat) * 1.6);
    const lngDelta = Math.max(0.003, (maxLng - minLng) * 1.6);
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [samples]);

  // Web fallback — react-native-maps has no web renderer here
  if (Platform.OS === 'web' || samples.length === 0 || !region) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.emptyWrap}>
          <Feather name="map" size={22} color={MUTED} />
          <Text style={styles.emptyTitle}>
            {samples.length === 0
              ? 'Route unavailable for this trip'
              : 'Map preview unavailable on web'}
          </Text>
          <Text style={styles.emptySub}>
            {samples.length === 0
              ? 'No GPS samples were recorded during the drive.'
              : 'Open on iOS or Android to see the route.'}
          </Text>
        </View>
      </View>
    );
  }

  const start = samples[0];
  const end = samples[samples.length - 1];
  const isSingle = samples.length === 1;

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        region={region}
        showsCompass={false}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsIndoors={false}
        pitchEnabled={false}
        rotateEnabled={false}
        // Explicitly avoid forcing `provider={PROVIDER_GOOGLE}` — we rely on
        // the platform default (Apple Maps / Google Maps SDK) and cover it
        // completely with OSM raster tiles below.
        toolbarEnabled={false}
      >
        {/*
          OpenStreetMap raster tiles — free, no API key required. Painted on
          top of the platform basemap so users see real OSM roads/streets
          regardless of whether a Google Maps API key is configured.
        */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          zIndex={-1}
          flipY={false}
        />

        {!isSingle && (
          <Polyline
            coordinates={samples.map((s) => ({ latitude: s.lat, longitude: s.lng }))}
            strokeWidth={5}
            strokeColor={BRAND}
          />
        )}

        {/* Start marker (green) — omit for single-sample stationary trips */}
        {!isSingle && (
          <Marker
            coordinate={{ latitude: start.lat, longitude: start.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.markerRing, { borderColor: SAFE }]}>
              <View style={[styles.markerCore, { backgroundColor: SAFE }]} />
            </View>
          </Marker>
        )}

        {/* End / current marker (blue). For 1-sample: this IS the only marker. */}
        <Marker
          coordinate={{ latitude: end.lat, longitude: end.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.markerRing, { borderColor: BRAND }, currentIndicator && styles.markerLive]}>
            <View style={[styles.markerCore, { backgroundColor: BRAND }]} />
          </View>
        </Marker>
      </MapView>

      {distanceKm != null && (
        <View style={styles.distChip}>
          <Feather name="navigation" size={11} color={NAVY} />
          <Text style={styles.distText}>{distanceKm.toFixed(1)} km</Text>
        </View>
      )}

      {/* OpenStreetMap attribution — required by the OSM Tile Usage Policy. */}
      <View style={styles.attrib} pointerEvents="none">
        <Text style={styles.attribText}>© OpenStreetMap contributors</Text>
      </View>
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
    gap: 4,
    padding: 16,
  },
  emptyTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  emptySub: { color: MUTED, fontSize: 12, textAlign: 'center' },

  markerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F1E4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  markerCore: { width: 10, height: 10, borderRadius: 5 },
  markerLive: {
    shadowColor: BRAND,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  // OSM attribution — small chip anchored bottom-right of the map.
  attrib: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  attribText: { color: NAVY, fontSize: 9, fontWeight: '600' },
});

export default TripRouteMap;
