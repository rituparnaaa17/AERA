/**
 * SensorTiles — instrumentation-style module for each sensor.
 *
 * Every sensor is a compact tile with:
 *   • a live micro-visual (sine wave, rotation, GPS signal bars, CPU pulse,
 *     or cloud bars)
 *   • label
 *   • status dot / caption
 *
 * IMPORTANT: Status (ACTIVE / INACTIVE / WARN) comes from REAL TripContext
 * diagnostics. Accelerometer and Gyroscope are only shown as ACTIVE when
 * the Expo Sensors callback is actually firing. GPS is only ACTIVE when a
 * real location fix has been received (not just permission granted).
 *
 * Visuals are decorative animations — they indicate activity but are not
 * real waveform renderings. The live numeric values are in SensorDebugPanel.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useTrip } from '@/components/TripContext';

const AnimatedSvgPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const NAVY = '#0F1E4A';
const MUTED = '#64748B';
const CARD_BORDER = '#E2ECF7';
const SURFACE = '#FFFFFF';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';
const BRAND = '#2563EB';

export function SensorGrid({
  isMockAi,
  isOffline,
  windowsProcessed,
}: {
  isMockAi: boolean;
  isOffline: boolean;
  windowsProcessed: number;
}) {
  // Read REAL sensor states from TripContext diagnostics
  const { diagnostics } = useTrip();

  const accelStatus: TileStatus = diagnostics.accelError
    ? 'error'
    : diagnostics.accelActive
    ? 'active'
    : 'warn';

  const gyroStatus: TileStatus = diagnostics.gyroError
    ? 'error'
    : diagnostics.gyroActive
    ? 'active'
    : 'warn';

  // GPS is ACTIVE only when we have received a real location fix
  // (not just when permission is granted)
  const gpsStatus: TileStatus = diagnostics.gpsPermission === 'denied'
    ? 'error'
    : diagnostics.gpsActive
    ? 'active'
    : 'warn';

  const gpsCaption = diagnostics.gpsPermission === 'denied'
    ? 'Denied'
    : diagnostics.gpsActive
    ? `±${diagnostics.gpsAccuracy !== null ? Math.round(diagnostics.gpsAccuracy) : '?'}m`
    : diagnostics.gpsPermission === 'granted'
    ? 'Acquiring…'
    : 'No Perm';

  const accelCaption = diagnostics.accelError
    ? 'Error'
    : diagnostics.accelActive
    ? `${diagnostics.accelMagnitude.toFixed(2)}g`
    : 'Inactive';

  const gyroCaption = diagnostics.gyroError
    ? 'Error'
    : diagnostics.gyroActive
    ? `${diagnostics.gyroMagnitude.toFixed(2)} r/s`
    : 'Inactive';

  return (
    <View style={styles.grid}>
      <SensorTile
        label="Accelerometer"
        status={accelStatus}
        visual={<AccelerometerViz active={diagnostics.accelActive} />}
        caption={accelCaption}
      />
      <SensorTile
        label="Gyroscope"
        status={gyroStatus}
        visual={<GyroViz active={diagnostics.gyroActive} />}
        caption={gyroCaption}
      />
      <SensorTile
        label="GPS"
        status={gpsStatus}
        visual={<GpsViz active={diagnostics.gpsActive} />}
        caption={gpsCaption}
      />
      <SensorTile
        label={isMockAi ? 'Mock AI' : 'AI Engine'}
        status="active"
        visual={<CpuViz />}
        caption={`${windowsProcessed} windows`}
      />
      <SensorTile
        label="Cloud"
        status={isOffline ? 'warn' : 'active'}
        visual={<CloudViz active={!isOffline} />}
        caption={isOffline ? 'Offline' : 'Sync'}
      />
    </View>
  );
}

// ── Tile shell ─────────────────────────────────────────────────────────

type TileStatus = 'active' | 'warn' | 'error';

function SensorTile({
  label,
  status,
  visual,
  caption,
}: {
  label: string;
  status: TileStatus;
  visual: React.ReactNode;
  caption: string;
}) {
  const dot =
    status === 'error' ? DANGER : status === 'warn' ? WARN : SAFE;
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel}>{label}</Text>
        <View style={[styles.tileDot, { backgroundColor: dot }]} />
      </View>
      <View style={styles.tileViz}>{visual}</View>
      <Text style={styles.tileCaption}>{caption}</Text>
    </View>
  );
}

// ── Individual visuals ────────────────────────────────────────────────

function AccelerometerViz({ active }: { active: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { t.stopAnimation(); return; }
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [active, t]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Svg width={120} height={36} viewBox="0 0 120 36">
          <Path
            d="M0 18 Q 5 6 10 18 T 20 18 T 30 18 T 40 18 T 50 18 T 60 18 T 70 18 T 80 18 T 90 18 T 100 18 T 110 18 T 120 18"
            stroke={active ? BRAND : CARD_BORDER}
            strokeWidth={2}
            fill="none"
          />
          <Line x1={0} y1={18} x2={120} y2={18} stroke={CARD_BORDER} strokeWidth={1} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function GyroViz({ active }: { active: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { t.stopAnimation(); return; }
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [active, t]);
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={12} stroke={CARD_BORDER} strokeWidth={1.5} fill="none" />
          <Path d="M16 4 A 12 12 0 0 1 28 16" stroke={active ? BRAND : MUTED} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Circle cx={16} cy={16} r={2.5} fill={active ? BRAND : MUTED} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function GpsViz({ active }: { active: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { t.stopAnimation(); return; }
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [active, t]);

  const r1 = t.interpolate({ inputRange: [0, 1], outputRange: [4, 14] });
  const o1 = t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const r2 = t.interpolate({ inputRange: [0, 1], outputRange: [4, 10] });
  const o2 = t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <Svg width="100%" height={36} viewBox="0 0 60 36">
      {active ? (
        <>
          <AnimatedCircle cx={30} cy={18} r={r1} stroke={BRAND} strokeWidth={1.5} fill="none" opacity={o1} />
          <AnimatedCircle cx={30} cy={18} r={r2} stroke={BRAND} strokeWidth={1.5} fill="none" opacity={o2} />
        </>
      ) : null}
      <Circle cx={30} cy={18} r={3} fill={active ? BRAND : WARN} />
    </Svg>
  );
}

function CpuViz() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(t, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const h = (offset: number) =>
    t.interpolate({
      inputRange: [0, 1],
      outputRange: [8 + offset * 3, 24 - offset * 3],
    });

  return (
    <Svg width="100%" height={36} viewBox="0 0 60 36">
      {[0, 1, 2, 3].map((i) => (
        <AnimatedRect
          key={i}
          x={12 + i * 10}
          width={5}
          rx={1.5}
          fill={BRAND}
          y={t.interpolate({ inputRange: [0, 1], outputRange: [28 - (8 + i * 3), 28 - (24 - i * 3)] })}
          height={h(i)}
        />
      ))}
    </Svg>
  );
}

function CloudViz({ active }: { active: boolean }) {
  const bars = [8, 14, 20];
  return (
    <Svg width="100%" height={36} viewBox="0 0 60 36">
      {bars.map((h, i) => (
        <Rect
          key={i}
          x={16 + i * 10}
          y={30 - h}
          width={6}
          rx={1.5}
          height={h}
          fill={active ? BRAND : CARD_BORDER}
          opacity={active ? 1 : 0.9}
        />
      ))}
    </Svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 4,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileLabel: { color: NAVY, fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  tileDot: { width: 7, height: 7, borderRadius: 3.5 },
  tileViz: { paddingVertical: 4 },
  tileCaption: { color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
});

export default SensorGrid;
