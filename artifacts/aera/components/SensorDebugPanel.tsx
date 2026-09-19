/**
 * SensorDebugPanel.tsx — AERA
 *
 * Development-only real-time sensor diagnostic panel.
 * Shows REAL data from physical device sensors via TripContext.
 *
 * Rendered in the Live Trip screen to allow manual verification
 * that Expo Go on a physical phone is actually reading sensors and GPS.
 *
 * ALL values come from real Expo API callbacks — nothing is faked.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTrip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const MUTED = '#64748B';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';
const BLUE = '#2563EB';
const BORDER = '#E2ECF7';
const SURFACE = '#FFFFFF';

function StatusDot({ active, error }: { active: boolean; error?: string | null }) {
  const color = error ? DANGER : active ? SAFE : WARN;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function StatusLabel({ active, error }: { active: boolean; error?: string | null }) {
  if (error) return <Text style={[styles.statusText, { color: DANGER }]}>ERROR</Text>;
  return (
    <Text style={[styles.statusText, { color: active ? SAFE : WARN }]}>
      {active ? 'ACTIVE' : 'INACTIVE'}
    </Text>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function SensorDebugPanel() {
  const { diagnostics, tripActive } = useTrip();
  const d = diagnostics;

  const timeSinceUpdate = d.lastSensorUpdate
    ? `${Math.round((Date.now() - d.lastSensorUpdate) / 1000)}s ago`
    : 'Never';

  const timeSinceGps = d.gpsLastUpdate
    ? `${Math.round((Date.now() - d.gpsLastUpdate) / 1000)}s ago`
    : 'Never';

  const speedDisplay = d.gpsSpeed !== null
    ? `${d.gpsSpeed.toFixed(1)} km/h`
    : 'Unknown';

  const headingDisplay = d.gpsHeading !== null
    ? `${d.gpsHeading.toFixed(1)}°`
    : 'Unknown';

  const accuracyDisplay = d.gpsAccuracy !== null
    ? `±${d.gpsAccuracy.toFixed(1)} m`
    : 'Unknown';

  const confidenceDisplay = d.crashConfidence !== null
    ? `${Math.round(d.crashConfidence * 100)}%`
    : 'N/A';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerDot} />
        <Text style={styles.headerTitle}>AERA SENSOR DIAGNOSTICS</Text>
      </View>

      <Section title="SYSTEM">
        <Row
          label="Trip"
          value={tripActive ? 'ACTIVE' : 'INACTIVE'}
          valueColor={tripActive ? SAFE : MUTED}
        />
        <Row
          label="Detection State"
          value={d.detectionState}
          valueColor={
            d.detectionState === 'MONITORING' ? SAFE
            : d.detectionState === 'CALIBRATING' ? BLUE
            : d.detectionState === 'VERIFYING' ? WARN
            : d.detectionState === 'EMERGENCY' ? DANGER
            : MUTED
          }
        />
        {d.calibrating && (
          <Row label="Calibration" value="IN PROGRESS…" valueColor={BLUE} />
        )}
        <Row label="Crash Confidence" value={confidenceDisplay} />
        <Row label="Last Sensor Update" value={timeSinceUpdate} />
      </Section>

      <Section title="ACCELEROMETER">
        <View style={styles.statusRow}>
          <StatusDot active={d.accelActive} error={d.accelError} />
          <StatusLabel active={d.accelActive} error={d.accelError} />
        </View>
        {d.accelError && (
          <Text style={styles.errorText}>{d.accelError}</Text>
        )}
        <Row label="X" value={d.accelX.toFixed(4) + ' g'} />
        <Row label="Y" value={d.accelY.toFixed(4) + ' g'} />
        <Row label="Z" value={d.accelZ.toFixed(4) + ' g'} />
        <Row
          label="Magnitude"
          value={d.accelMagnitude.toFixed(4) + ' g'}
          valueColor={d.accelMagnitude > 2.5 ? WARN : undefined}
        />
      </Section>

      <Section title="GYROSCOPE">
        <View style={styles.statusRow}>
          <StatusDot active={d.gyroActive} error={d.gyroError} />
          <StatusLabel active={d.gyroActive} error={d.gyroError} />
        </View>
        {d.gyroError && (
          <Text style={styles.errorText}>{d.gyroError}</Text>
        )}
        <Row label="X" value={d.gyroX.toFixed(4) + ' rad/s'} />
        <Row label="Y" value={d.gyroY.toFixed(4) + ' rad/s'} />
        <Row label="Z" value={d.gyroZ.toFixed(4) + ' rad/s'} />
        <Row
          label="Magnitude"
          value={d.gyroMagnitude.toFixed(4) + ' rad/s'}
          valueColor={d.gyroMagnitude > 1.5 ? WARN : undefined}
        />
      </Section>

      <Section title="GPS / LOCATION">
        <View style={styles.statusRow}>
          <StatusDot active={d.gpsActive} />
          <StatusLabel active={d.gpsActive} />
        </View>
        <Row
          label="Permission"
          value={d.gpsPermission.toUpperCase()}
          valueColor={
            d.gpsPermission === 'granted' ? SAFE
            : d.gpsPermission === 'denied' ? DANGER
            : MUTED
          }
        />
        <Row
          label="Latitude"
          value={d.gpsLat !== null ? d.gpsLat.toFixed(7) : 'Unavailable'}
          valueColor={d.gpsLat !== null ? NAVY : MUTED}
        />
        <Row
          label="Longitude"
          value={d.gpsLng !== null ? d.gpsLng.toFixed(7) : 'Unavailable'}
          valueColor={d.gpsLng !== null ? NAVY : MUTED}
        />
        <Row label="Accuracy" value={accuracyDisplay} />
        <Row label="Speed" value={speedDisplay} />
        <Row label="Heading" value={headingDisplay} />
        <Row label="Last Update" value={timeSinceGps} />
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dev panel — not visible in production builds
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A1628',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0D1F3C',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SAFE,
  },
  headerTitle: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  sectionTitle: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorText: {
    color: DANGER,
    fontSize: 10,
    marginBottom: 4,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rowLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  rowValue: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  footer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 9,
    fontStyle: 'italic',
  },
});
