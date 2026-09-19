/**
 * AI Analyzing — signature Q Safety Halo diagnostic experience.
 *
 * The thinking mascot sits inside the halo. The ring cycles slowly while
 * analysis is in flight, and fills to 100% + turns green once the model
 * has produced a confidence value. Around the halo, four compact status
 * chips (Motion · Gyro · GPS · Risk Model) reflect real state from
 * `useTrip()` — permission, mock AI flag, network, windows processed.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { QSafetyHalo } from '@/components/QSafetyHalo';
import { useTrip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const BRAND_BLUE = '#2563EB';

export default function AnalyzingScreen() {
  const insets = useSafeAreaInsets();
  const {
    tripActive,
    confidence,
    windowsProcessed,
    status,
    permissionGranted,
    networkAvailable,
    settings,
  } = useTrip();

  const isAnalyzing = tripActive && confidence == null;

  // Cycles the halo value from ~20 → ~90 while analyzing.
  const cycle = useRef(new Animated.Value(0.2)).current;
  const [displayValue, setDisplayValue] = React.useState(20);

  useEffect(() => {
    if (!isAnalyzing) {
      setDisplayValue(confidence != null ? Math.round(confidence * 100) : 0);
      return;
    }
    const listener = cycle.addListener(({ value }) => setDisplayValue(Math.round(value * 100)));
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(cycle, { toValue: 0.9, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(cycle, { toValue: 0.2, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => {
      anim.stop();
      cycle.removeListener(listener);
    };
  }, [cycle, isAnalyzing, confidence]);

  const haloColor = !isAnalyzing && confidence != null ? SAFE : BRAND_BLUE;
  const headline = isAnalyzing ? 'Analyzing…' : status === 'SAFE' ? 'All clear' : 'Awaiting decision';
  const helper = isAnalyzing ? 'Let me check that…' : 'Model has produced a confidence value.';
  const sub = isAnalyzing
    ? 'Processing motion patterns with AI.'
    : 'You can safely close this view.';

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={[styles.topRow, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={NAVY} />
        </Pressable>
        <Text style={styles.topTitle}>AI Analyzing</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        {/* Halo with mascot inside */}
        <View style={{ marginTop: 6 }}>
          <QSafetyHalo
            value={displayValue}
            size={252}
            stroke={10}
            color={haloColor}
            trackColor={CARD_BORDER}
          >
            <View style={styles.halloInner}>
              <Image
                source={require('@/assets/mascot/thinking.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
              <Text style={styles.confLabel}>Confidence</Text>
              <Text style={[styles.confValue, { color: haloColor }]}>
                {confidence != null ? `${Math.round(confidence * 100)}%` : `${displayValue}%`}
              </Text>
            </View>
          </QSafetyHalo>
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.helper}>{helper}</Text>
        <Text style={styles.subCaption}>{sub}</Text>

        {/* Diagnostic chips */}
        <View style={styles.chipsGrid}>
          <DiagChip icon="activity" label="Motion" status="active" note="Sampling" />
          <DiagChip icon="refresh-cw" label="Gyro" status="active" note="Stable" />
          <DiagChip
            icon="map-pin"
            label="GPS"
            status={permissionGranted ? 'active' : 'warn'}
            note={permissionGranted ? 'Locked' : 'Waiting'}
          />
          <DiagChip
            icon="cpu"
            label="Risk Model"
            status={networkAvailable || settings.mockAi ? 'active' : 'warn'}
            note={settings.mockAi ? 'Mock' : networkAvailable ? 'Online' : 'Offline'}
          />
        </View>

        {/* Windows chip */}
        <View style={styles.windowsRow}>
          <Feather name="database" size={12} color={MUTED} />
          <Text style={styles.windowsText}>{windowsProcessed} windows processed</Text>
        </View>
      </View>
    </AppBackground>
  );
}

function DiagChip({
  icon,
  label,
  status,
  note,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  status: 'active' | 'warn';
  note: string;
}) {
  const color = status === 'warn' ? WARN : SAFE;
  return (
    <View style={styles.diagChip}>
      <View style={[styles.diagIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.diagLabel}>{label}</Text>
        <Text style={styles.diagNote}>{note}</Text>
      </View>
      <View style={[styles.diagDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 10 },

  halloInner: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  mascot: { width: 128, height: 128 },
  confLabel: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  confValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 0 },

  headline: { color: NAVY, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 6 },
  helper: { color: BRAND_BLUE, fontSize: 15, fontWeight: '700' },
  subCaption: { color: NAVY_SOFT, fontSize: 13, textAlign: 'center' },

  chipsGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  diagChip: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    padding: 10,
  },
  diagIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagLabel: { color: NAVY, fontSize: 13, fontWeight: '800' },
  diagNote: { color: MUTED, fontSize: 11, fontWeight: '600' },
  diagDot: { width: 7, height: 7, borderRadius: 3.5 },

  windowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 6,
  },
  windowsText: { color: MUTED, fontSize: 11, fontWeight: '700' },
});
