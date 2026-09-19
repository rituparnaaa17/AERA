/**
 * ScoreRing — circular safety-score ring used in Trip Complete and analytics.
 * Renders a fixed background arc and a coloured foreground arc up to `value / 100`.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export function ScoreRing({
  value,
  size = 160,
  stroke = 12,
  color,
  trackColor = 'rgba(148, 163, 184, 0.20)',
  label,
  caption,
  captionColor,
  valueColor,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor?: string;
  label?: string;
  caption?: string;
  captionColor?: string;
  valueColor?: string;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const dashOffset = circ * (1 - pct);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={[styles.value, { color: valueColor ?? color }]}>{Math.round(value)}</Text>
          {label ? <Text style={[styles.label, { color: captionColor ?? '#6B7280' }]}>{label}</Text> : null}
          {caption ? <Text style={[styles.caption, { color: captionColor ?? '#6B7280' }]}>{caption}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  caption: { fontSize: 11, fontWeight: '600', marginTop: 1 },
});

export default ScoreRing;
