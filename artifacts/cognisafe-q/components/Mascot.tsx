/**
 * Cognisafe-Q Owl Mascot — approved PNG assets
 *
 * Thin wrapper around the approved mascot artwork in `assets/mascot/`.
 * Each pose is a transparent PNG — rendered directly with `resizeMode="contain"`
 * so it always sits over the UI as a cutout, never inside a rectangle.
 *
 * Semantic pose map (filename → suggested screens):
 *   neutral     → splash / about / generic
 *   wave        → login / welcome / onboarding 1
 *   wink        → onboarding / signup
 *   shield      → onboarding safety story
 *   driving     → dashboard / live trip
 *   thinking    → AI analyzing
 *   alert       → risk alert
 *   emergency   → emergency response
 *   sos         → manual SOS
 *   heart       → help sent
 *   celebrate   → trip complete
 *   offline     → offline state
 *   sunglases   → demo mode  (filename has a single 's' — original spelling preserved)
 */

import React from 'react';
import { Image, ImageResizeMode, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type MascotPose =
  | 'neutral'
  | 'wave'
  | 'wink'
  | 'shield'
  | 'driving'
  | 'thinking'
  | 'alert'
  | 'emergency'
  | 'sos'
  | 'heart'
  | 'celebrate'
  | 'offline'
  | 'sunglasses';

const POSES = {
  neutral: require('@/assets/mascot/neutral.png'),
  wave: require('@/assets/mascot/wave.png'),
  wink: require('@/assets/mascot/wink.png'),
  shield: require('@/assets/mascot/shield.png'),
  driving: require('@/assets/mascot/driving.png'),
  thinking: require('@/assets/mascot/thinking.png'),
  alert: require('@/assets/mascot/alert.png'),
  emergency: require('@/assets/mascot/emergency.png'),
  sos: require('@/assets/mascot/sos.png'),
  heart: require('@/assets/mascot/heart.png'),
  celebrate: require('@/assets/mascot/celebrate.png'),
  offline: require('@/assets/mascot/offline.png'),
  // filename preserved as originally shipped (single 's')
  sunglasses: require('@/assets/mascot/sunglases.png'),
} as const;

export function Mascot({
  size = 160,
  pose = 'neutral',
  resizeMode = 'contain',
  style,
}: {
  size?: number;
  pose?: MascotPose;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ width: size, height: size }, styles.wrap, style]} pointerEvents="none">
      <Image
        source={POSES[pose]}
        resizeMode={resizeMode}
        style={styles.img}
        accessible={false}
      />
    </View>
  );
}

// ─── Approved brand logo (shield + road) ────────────────────────────────────
export function BrandLogo({
  size = 72,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ width: size, height: size }, styles.wrap, style]} pointerEvents="none">
      <Image
        source={require('@/assets/brand/logo.png')}
        resizeMode="contain"
        style={styles.img}
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%', backgroundColor: 'transparent' },
});

export default Mascot;
