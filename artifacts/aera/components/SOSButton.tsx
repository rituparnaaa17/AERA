/**
 * SOSButton — Hold-to-activate emergency button
 * Displays a circular progress animation while holding.
 */

import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const HOLD_DURATION = 1800; // ms to hold

interface SOSButtonProps {
  onActivate: () => void;
  disabled?: boolean;
}

export function SOSButton({ onActivate, disabled = false }: SOSButtonProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const holdAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const startHold = useCallback(() => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, speed: 20 }).start();
    holdAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    holdAnimation.current.start(({ finished }) => {
      if (finished) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        onActivate();
        progressAnim.setValue(0);
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }
    });
  }, [disabled, onActivate, progressAnim, scaleAnim]);

  const cancelHold = useCallback(() => {
    holdAnimation.current?.stop();
    Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  }, [progressAnim, scaleAnim]);

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Pressable
      onPressIn={startHold}
      onPressOut={cancelHold}
      disabled={disabled}
      style={({ pressed }) => [styles.wrapper, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
        {/* SVG-like circular progress using border trick */}
        <View style={styles.progressRing}>
          <Animated.View
            style={[
              styles.progressArc,
              {
                borderColor: '#E53935',
                opacity: progressAnim,
              },
            ]}
          />
        </View>
        {/* Inner button */}
        <View style={styles.inner}>
          <Feather name="shield" size={28} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.holdText}>Hold to activate</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  disabled: { opacity: 0.45 },
  container: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  progressRing: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: '#FFCCCC',
  },
  progressArc: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
  },
  inner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sosText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  holdText: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 0.5 },
});
