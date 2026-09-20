/**
 * Landing / Welcome Screen — AERA
 *
 * Overlay on top of the approved `assets/backgrounds/landing.png` photo.
 *
 * Routes:
 *   • Slide-to-activate "Get Started" → (auth)/login
 *   • "Sign Up" footer link            → (auth)/signup
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReAnimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BrandLogo, Mascot } from '@/components/Mascot';

const { height: SCREEN_H } = Dimensions.get('window');

// Slide handle geometry
const HANDLE_SIZE = 54;
const TRACK_PADDING = 4;

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  // Entrance + gentle mascot float (uses core Animated, unrelated to slide)
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(20)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(float, { toValue: 0, duration: 2600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    return () => float.stopAnimation();
  }, [fade, rise, float]);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  const mascotSize = Math.min(240, SCREEN_H * 0.32);
  const mascotTop = SCREEN_H * 0.44;

  // ── Slide-to-activate ────────────────────────────────────────────────────
  const [trackWidth, setTrackWidth] = useState(0);
  const [activated, setActivated] = useState(false);

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const maxSlide = Math.max(0, trackWidth - HANDLE_SIZE - TRACK_PADDING * 2);

  const goToLogin = () => {
    if (activated) return;
    setActivated(true);
    // Swipe now takes users into onboarding, which walks them into Sign In.
    router.push('/onboarding/1');
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = Math.max(0, Math.min(next, maxSlide));
    })
    .onEnd(() => {
      if (translateX.value >= maxSlide - 8 && maxSlide > 0) {
        translateX.value = withTiming(maxSlide, { duration: 120 });
        runOnJS(goToLogin)();
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + HANDLE_SIZE + TRACK_PADDING,
  }));

  const labelStyle = useAnimatedStyle(() => {
    const progress = maxSlide > 0 ? translateX.value / maxSlide : 0;
    return { opacity: 1 - progress * 0.9 };
  });

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Approved deep-navy road photo */}
      <ImageBackground
        source={require('@/assets/backgrounds/landing.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['rgba(4,13,36,0)', 'rgba(4,13,36,0.35)', 'rgba(4,13,36,0.85)']}
          locations={[0.55, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* Brand block */}
      <Animated.View
        style={[
          styles.brandBlock,
          { top: insets.top + 40, opacity: fade, transform: [{ translateY: rise }] },
        ]}
      >
        <BrandLogo size={78} />
        <Text style={styles.brand}>
          AERA
        </Text>
        <Text style={styles.tagline}>Accident & Emergency Response Assistant</Text>
      </Animated.View>

      {/* Mascot */}
      <Animated.View
        style={[
          styles.mascotWrap,
          { top: mascotTop, opacity: fade, transform: [{ translateY: floatY }] },
        ]}
      >
        <View style={[styles.mascotHalo, { width: mascotSize * 1.15, height: mascotSize * 0.22 }]} />
        <Mascot size={mascotSize} pose="neutral" />
      </Animated.View>

      {/* Bottom overlay */}
      <Animated.View
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + 20, opacity: fade, transform: [{ translateY: rise }] },
        ]}
      >
        <Text style={styles.headline}>A safer tomorrow,{'\n'}with you.</Text>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Slide-to-activate CTA */}
        <View
          style={styles.slideTrack}
          onLayout={onTrackLayout}
          accessibilityRole="adjustable"
          accessibilityLabel="Slide to get started"
        >
          {/* Track background */}
          <View style={styles.slideTrackBg} />

          {/* Filled portion behind the handle */}
          <ReAnimated.View style={[styles.slideFill, fillStyle]}>
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </ReAnimated.View>

          {/* Label */}
          <ReAnimated.Text style={[styles.slideLabel, labelStyle]}>
            Slide to Get Started
          </ReAnimated.Text>

          {/* Handle (drag) */}
          <GestureDetector gesture={pan}>
            <ReAnimated.View style={[styles.slideHandle, handleStyle]}>
              <Feather name="chevrons-right" size={22} color="#1D4ED8" />
            </ReAnimated.View>
          </GestureDetector>
        </View>

        {/* Footer: sign up */}
        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040D24' },

  brandBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  brand: {
    color: '#F8FAFC',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandAccent: { color: '#60A5FA' },
  tagline: {
    color: '#DBEAFE',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  mascotWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  mascotHalo: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    transform: [{ scaleY: 0.4 }],
  },

  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
    zIndex: 3,
  },
  headline: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(147, 197, 253, 0.35)',
  },
  dotActive: { width: 24, backgroundColor: '#60A5FA' },

  // ── Slide-to-activate track ────────────────────────────────────────────
  slideTrack: {
    alignSelf: 'stretch',
    height: HANDLE_SIZE + TRACK_PADDING * 2,
    borderRadius: (HANDLE_SIZE + TRACK_PADDING * 2) / 2,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  slideTrackBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 30, 75, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    borderRadius: (HANDLE_SIZE + TRACK_PADDING * 2) / 2,
  },
  slideFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (HANDLE_SIZE + TRACK_PADDING * 2) / 2,
    overflow: 'hidden',
  },
  slideLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginLeft: HANDLE_SIZE / 2,
  },
  slideHandle: {
    position: 'absolute',
    left: TRACK_PADDING,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerMuted: { color: '#93C5FD', fontSize: 14 },
  footerLink: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
});
