/**
 * TripRouteMap — OpenStreetMap Leaflet Map Renderer.
 *
 * Uses `react-native-webview` + OpenStreetMap (Leaflet.js) to render
 * real interactive basemaps on Android, iOS, and Web.
 *
 * Zero API keys required (no Google Maps API key dependency). Eliminates
 * black placeholders on physical Android phones.
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
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
  const html = useMemo(() => {
    if (!samples || samples.length === 0) return '';
    const coords = JSON.stringify(samples.map((s) => [s.lat, s.lng]));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #EEF4FE; }
    .leaflet-control-attribution { display: none !important; }
    .pulse-dot {
      width: 20px; height: 20px; background: #2563EB; border: 3px solid #FFFFFF; border-radius: 50%;
      box-shadow: 0 0 12px rgba(37,99,235,0.7); animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.8); }
      70% { box-shadow: 0 0 0 14px rgba(37,99,235,0); }
      100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
    }
    .start-dot {
      width: 14px; height: 14px; background: #22C55E; border: 2.5px solid #FFFFFF; border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const coords = ${coords};
    if (coords && coords.length > 0) {
      const last = coords[coords.length - 1];
      const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(last, 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      if (coords.length === 1) {
        const pulseIcon = L.divIcon({ className: 'pulse-dot', iconSize: [20, 20], iconAnchor: [10, 10] });
        L.marker(last, { icon: pulseIcon }).addTo(map);
      } else {
        const polyline = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.85 }).addTo(map);
        const startDot = L.divIcon({ className: 'start-dot', iconSize: [14, 14], iconAnchor: [7, 7] });
        const endDot = L.divIcon({ className: 'pulse-dot', iconSize: [20, 20], iconAnchor: [10, 10] });
        L.marker(coords[0], { icon: startDot }).addTo(map);
        L.marker(last, { icon: endDot }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [25, 25] });
      }
    }
  </script>
</body>
</html>
`;
  }, [samples]);

  if (!samples || samples.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.emptyWrap}>
          <Feather name="map" size={22} color={MUTED} />
          <Text style={styles.emptyTitle}>Route unavailable for this trip</Text>
          <Text style={styles.emptySub}>No GPS samples were recorded during the drive.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="OpenStreetMap"
        />
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1, backgroundColor: '#EEF4FE' }}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      )}

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
    gap: 4,
    padding: 16,
  },
  emptyTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  emptySub: { color: MUTED, fontSize: 12, textAlign: 'center' },
});

export default TripRouteMap;

