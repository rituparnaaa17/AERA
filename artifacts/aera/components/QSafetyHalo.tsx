/**
 * QSafetyHalo — AERA's signature circular ring.
 *
 * A segmented safety ring used across the product for:
 *   • Safety score (Trip Complete, Dashboard hero)
 *   • Live monitoring health (Live Trip)
 *   • AI confidence (AI Analyzing)
 *
 * Renders `segments` discrete arcs (default 24) with a small gap between
 * them. The proportion of segments that light up matches `value / 100`.
 * Optional inner content (value, label, mascot) sits in the middle.
 *
 * SVG-only, no theming file dependency — colours come in via props so the
 * halo can turn green/amber/red or brand-blue depending on state.
 */

import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

const DEFAULT_SEGMENTS = 24;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const a = polarToCartesian(cx, cy, r, end);
  const b = polarToCartesian(cx, cy, r, start);
  const largeArc = end - start <= 180 ? '0' : '1';
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${largeArc} 0 ${b.x} ${b.y}`;
}

export function QSafetyHalo({
  value = 0,
  size = 200,
  stroke = 10,
  color = '#22C55E',
  trackColor = '#E2ECF7',
  segments = DEFAULT_SEGMENTS,
  gap = 3,
  centerLabel,
  centerCaption,
  centerColor,
  captionColor = '#64748B',
  children,
}: PropsWithChildren<{
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  segments?: number;
  gap?: number;
  centerLabel?: string;
  centerCaption?: string;
  centerColor?: string;
  captionColor?: string;
}>) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;
  const segArc = 360 / segments;
  const activeSegments = Math.round(
    (Math.max(0, Math.min(100, value)) / 100) * segments
  );

  const paths = [];
  for (let i = 0; i < segments; i += 1) {
    const start = i * segArc + gap / 2;
    const end = (i + 1) * segArc - gap / 2;
    const active = i < activeSegments;
    paths.push(
      <Path
        key={i}
        d={arcPath(cx, cy, r, start, end)}
        stroke={active ? color : trackColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>{paths}</G>
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          {children ??
            (centerLabel ? (
              <>
                <Text style={[styles.value, { color: centerColor ?? color }]}>{centerLabel}</Text>
                {centerCaption ? (
                  <Text style={[styles.caption, { color: captionColor }]}>{centerCaption}</Text>
                ) : null}
              </>
            ) : null)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  caption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

export default QSafetyHalo;
