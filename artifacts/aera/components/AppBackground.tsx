/**
 * AppBackground — global `main_theme` background wrapper.
 *
 * Renders the approved `assets/backgrounds/main_theme.png` full-bleed with an
 * optional white/light fade so cards and text stay readable. Every screen that
 * should sit on the shared theme should wrap its content in <AppBackground>.
 *
 * NOT to be used on the Landing or SOS screens — those keep their dedicated
 * treatments (nightly road on landing, high-contrast red on SOS).
 */

import React, { PropsWithChildren } from 'react';
import { ImageBackground, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function AppBackground({
  children,
  fadeStrength = 'default',
  style,
}: PropsWithChildren<{
  /**
   * How aggressively the white/light gradient fades the photo.
   * "none" shows the photo as-is (best for hero screens).
   * "default" adds a soft top→bottom fade for card-heavy screens.
   * "strong" almost hides the photo, leaving only a coloured tint.
   */
  fadeStrength?: 'none' | 'default' | 'strong';
  style?: StyleProp<ViewStyle>;
}>) {
  const stops: readonly [string, string, string] =
    fadeStrength === 'none'
      ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)']
      : fadeStrength === 'strong'
      ? ['rgba(226,236,247,0.85)', 'rgba(244,248,254,0.92)', 'rgba(255,255,255,0.96)']
      : ['rgba(255,255,255,0)', 'rgba(244,248,254,0.55)', 'rgba(244,248,254,0.92)'];

  return (
    <View style={[styles.root, style]}>
      <ImageBackground
        source={require('@/assets/backgrounds/main_theme.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={stops}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F8FE' },
});

export default AppBackground;
