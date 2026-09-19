/**
 * SlideToConfirm — the exact swipe-to-activate CTA from the landing screen,
 * lifted into a shared component so onboarding's final slide can reuse it
 * verbatim.
 *
 * Behaviour:
 *   • Draggable white circular handle sits at the left of a rounded track.
 *   • Track fill grows behind the handle as the user drags right.
 *   • Label fades out as the handle approaches the end.
 *   • Releasing at the end fires `onConfirm` exactly once; releasing before
 *     the end springs the handle back to the start.
 */

import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const HANDLE_SIZE = 54;
const TRACK_PADDING = 4;

export function SlideToConfirm({
  label = 'Slide to Get Started',
  onConfirm,
  variant = 'blue',
}: {
  label?: string;
  onConfirm: () => void;
  /**
   * Colour theme for the track/fill/shadow. `blue` (default) matches the
   * landing/onboarding CTA; `red` is used for emergency actions like the
   * Live Trip swipe-SOS.
   */
  variant?: 'blue' | 'red';
}) {
  const theme =
    variant === 'red'
      ? {
          trackBg: 'rgba(69, 12, 12, 0.55)',
          trackBorder: 'rgba(248, 113, 113, 0.55)',
          fillFrom: '#F87171',
          fillTo: '#B91C1C',
          handleFg: '#B91C1C',
          shadow: '#DC2626',
          labelColor: '#FEE2E2',
        }
      : {
          trackBg: 'rgba(15, 30, 75, 0.85)',
          trackBorder: 'rgba(96, 165, 250, 0.35)',
          fillFrom: '#3B82F6',
          fillTo: '#1D4ED8',
          handleFg: '#1D4ED8',
          shadow: '#3B82F6',
          labelColor: '#F8FAFC',
        };

  const [trackWidth, setTrackWidth] = useState(0);
  const [activated, setActivated] = useState(false);

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const maxSlide = Math.max(0, trackWidth - HANDLE_SIZE - TRACK_PADDING * 2);

  const confirm = () => {
    if (activated) return;
    setActivated(true);
    onConfirm();
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
        runOnJS(confirm)();
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
    <View
      style={[styles.track, { shadowColor: theme.shadow }]}
      onLayout={onTrackLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
    >
      <View
        style={[styles.trackBg, { backgroundColor: theme.trackBg, borderColor: theme.trackBorder }]}
      />

      <Animated.View style={[styles.fill, fillStyle]}>
        <LinearGradient
          colors={[theme.fillFrom, theme.fillTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.Text style={[styles.label, { color: theme.labelColor }, labelStyle]}>
        {label}
      </Animated.Text>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.handle, handleStyle]}>
          <Feather name="chevrons-right" size={22} color={theme.handleFg} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    height: HANDLE_SIZE + TRACK_PADDING * 2,
    borderRadius: (HANDLE_SIZE + TRACK_PADDING * 2) / 2,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  trackBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: (HANDLE_SIZE + TRACK_PADDING * 2) / 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (HANDLE_SIZE + TRACK_PADDING * 2) / 2,
    overflow: 'hidden',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginLeft: HANDLE_SIZE / 2,
  },
  handle: {
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
});

export default SlideToConfirm;
