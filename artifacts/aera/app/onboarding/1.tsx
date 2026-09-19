/**
 * Onboarding — single paged screen with 3 horizontal slides.
 *
 * • Horizontal `FlatList` with `pagingEnabled` — swipe right to advance 1 → 2 → 3.
 * • "Skip" (top-right) is visible on pages 1 and 2 only; it is completely
 *   removed from the tree on page 3.
 * • Pages 1 and 2 render just the mascot + copy + pagination dots (no button).
 * • Page 3 renders the same layout plus the reusable `SlideToConfirm` swipe
 *   CTA — the exact component the landing screen uses. On confirm it routes
 *   to Sign In.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ImageBackground,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot, MascotPose } from '@/components/Mascot';
import { SlideToConfirm } from '@/components/SlideToConfirm';

const { width: SCREEN_W } = Dimensions.get('window');

type Slide = {
  pose: MascotPose;
  headline: string;
  sub: string;
};

const SLIDES: Slide[] = [
  {
    pose: 'wink',
    headline: 'A smarter way\nto stay safe.',
    sub: 'Q monitors your journey and is always by your side.',
  },
  {
    pose: 'thinking',
    headline: 'Detects unusual\nmovement.',
    sub: 'AI analyzes motion patterns in real time.',
  },
  {
    pose: 'shield',
    headline: 'Get help when\nit matters.',
    sub: 'Instant alerts to your emergency contacts.',
  },
];

const TOTAL = SLIDES.length;

export default function OnboardingPager() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const goToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, []);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== index) setIndex(next);
  }, [index]);

  const renderItem: ListRenderItem<Slide> = ({ item, index: i }) => {
    const isLast = i === TOTAL - 1;
    return (
      <View style={[styles.page, { width: SCREEN_W, paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
        {/* Mascot */}
        <View style={styles.mascotBlock}>
          <View style={styles.mascotHalo} />
          <Mascot size={220} pose={item.pose} />
        </View>

        {/* Copy */}
        <View style={styles.copy}>
          <Text style={styles.headline}>{item.headline}</Text>
          <Text style={styles.sub}>{item.sub}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, di) => (
            <View key={di} style={[styles.dot, di === i && styles.dotActive]} />
          ))}
        </View>

        {/* Final-page CTA — reuses the landing swipe component verbatim */}
        <View style={styles.actionsSlot}>
          {isLast ? (
            <SlideToConfirm label="Slide to Get Started" onConfirm={goToLogin} />
          ) : (
            <Text style={styles.swipeHint}>Swipe →</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('@/assets/backgrounds/main_theme.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['rgba(4,13,36,0.45)', 'rgba(4,13,36,0.75)', 'rgba(4,13,36,0.9)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* Skip — visible ONLY on pages 1 & 2 (index < TOTAL - 1) */}
      {index < TOTAL - 1 && (
        <Pressable
          onPress={goToLogin}
          hitSlop={12}
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => `slide-${i}`}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        initialNumToRender={TOTAL}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040D24' },

  page: {
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 5,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  skipText: { color: '#DBEAFE', fontSize: 15, fontWeight: '600' },

  mascotBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  mascotHalo: {
    position: 'absolute',
    width: 280,
    height: 60,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.30)',
    transform: [{ scaleY: 0.6 }],
    bottom: 4,
  },

  copy: { alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  headline: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  sub: {
    color: '#DBEAFE',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(147, 197, 253, 0.35)',
  },
  dotActive: { width: 24, backgroundColor: '#60A5FA' },

  actionsSlot: {
    minHeight: 62,
    justifyContent: 'center',
  },
  swipeHint: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    opacity: 0.85,
  },
});
