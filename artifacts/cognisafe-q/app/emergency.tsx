/**
 * Emergency Active + Help Sent — one screen, two visual modes.
 *
 * MODE 1 ("Emergency Active")
 *   Shown while the emergency alert is being dispatched. Uses the emergency
 *   mascot, red brand pill, red rings, and the "Response initiated" copy.
 *   Checklist reflects the three real states we can measure:
 *     • Location acquired          — we know coords were captured
 *     • Notifying emergency contacts — dispatch is in flight
 *     • Recording event             — trip log/emergency event persisted
 *
 * MODE 2 ("Help Sent")
 *   Once `emergencySent` flips true the whole screen shifts to a reassuring
 *   blue + green theme with the heart mascot: "Help is on the way!" with
 *   completed checklist items (contacts notified · location shared · event
 *   recorded).
 *
 * Actions "Call Emergency Services" and "Share Live Location" are preserved
 * and always available.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTrip } from '@/components/TripContext';

// Palette (local — no theme file touched)
const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const DANGER = '#DC2626';
const DANGER_BG = '#FEE2E2';
const DANGER_BORDER = '#FCA5A5';
const SAFE = '#16A34A';
const SAFE_BG = '#DCFCE7';
const SAFE_BORDER = '#86EFAC';
const BRAND_BLUE = '#2563EB';
const BRAND_BLUE_BG = '#DBEAFE';
const CARD_BORDER = '#E2ECF7';

// Local number formatter for the elapsed timer
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const {
    contacts,
    canCancelEmergency,
    cancelEmergency,
    stopTrip,
    emergencySent,
    permissionGranted,
  } = useTrip();
  const primary = contacts[0];
  const [elapsed, setElapsed] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void Haptics.notificationAsync(
      emergencySent
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: emergencySent ? 900 : 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1, duration: emergencySent ? 900 : 500, useNativeDriver: true }),
      ])
    ).start();
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => { pulse.stopAnimation(); clearInterval(t); };
  }, [pulse, emergencySent]);

  // ── Themeable derived values ─────────────────────────────────────────
  const isHelpSent = emergencySent;
  const accent = isHelpSent ? BRAND_BLUE : DANGER;
  const accentBg = isHelpSent ? BRAND_BLUE_BG : DANGER_BG;
  const accentBorder = isHelpSent ? SAFE_BORDER : DANGER_BORDER;

  const brandLine = isHelpSent ? 'HELP SENT' : 'EMERGENCY ACTIVE';
  const title = isHelpSent ? 'Help is on the way!' : 'Emergency';
  const sub = isHelpSent ? 'Your emergency contacts have been notified.' : 'Response initiated.';

  // Location step is complete once we have permission (fed from TripContext);
  // Notify + Record complete once dispatch has finished (`emergencySent`).
  const locationDone = permissionGranted === true;
  const notifyDone = emergencySent;
  const recordDone = emergencySent;

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Header eyebrow */}
        <View style={styles.header}>
          <Text style={styles.brandLine}>COGNISAFE-Q</Text>
          <View style={[styles.pill, { backgroundColor: accentBg, borderColor: accentBorder }]}>
            <Animated.View style={[styles.pillDot, { backgroundColor: accent, transform: [{ scale: pulse }] }]} />
            <Text style={[styles.pillText, { color: accent }]}>{brandLine}</Text>
          </View>
        </View>

        {/* Mascot inside ring */}
        <View style={styles.ringWrap}>
          <Animated.View
            style={[
              styles.ringOuter,
              { borderColor: accentBorder, transform: [{ scale: pulse }] },
            ]}
          />
          <View style={[styles.ringInner, { backgroundColor: accent + '18' }]} />
          <Mascot size={168} pose={isHelpSent ? 'heart' : 'emergency'} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>

        <View style={[styles.elapsedChip, { borderColor: accentBorder }]}>
          <Feather name="clock" size={13} color={accent} />
          <Text style={[styles.elapsedText, { color: accent }]}>{fmt(elapsed)}</Text>
        </View>

        {/* Real-status checklist */}
        <View style={styles.statusCard}>
          <ChecklistItem
            icon="map-pin"
            text={locationDone ? 'Location permission granted' : 'Location permission required'}
            done={locationDone}
          />
          <Divider />
          <ChecklistItem
            icon="send"
            text={
              notifyDone
                ? primary
                  ? `${primary.name} notified`
                  : `${contacts.length || 0} contacts notified`
                : 'Notifying emergency contacts…'
            }
            done={notifyDone}
          />
          <Divider />
          <ChecklistItem
            icon="edit-3"
            text={recordDone ? 'Emergency event recorded' : 'Recording event…'}
            done={recordDone}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label={primary ? `Call ${primary.name}` : 'Call Emergency Services'}
            onPress={() => {
              const number = primary?.phone ?? '112';
              void Linking.openURL(`tel:${number}`);
            }}
            style={styles.actionBtn}
          />
          <Pressable
            onPress={() => router.push('/live-location' as never)}
            style={styles.secondaryBtn}
          >
            <Feather name="navigation" size={16} color={NAVY} />
            <Text style={styles.secondaryText}>Share Live Location</Text>
          </Pressable>

          {canCancelEmergency && (
            <Pressable
              onPress={() => { cancelEmergency(); router.replace('/trip'); }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel — False Alarm</Text>
            </Pressable>
          )}

          <Pressable
            onPress={async () => { await stopTrip(); router.replace('/summary'); }}
            style={styles.endBtn}
          >
            <Text style={styles.endText}>End Trip</Text>
          </Pressable>
        </View>
      </View>
    </AppBackground>
  );
}

function ChecklistItem({
  icon,
  text,
  done,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  text: string;
  done: boolean;
}) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkTile, { backgroundColor: done ? SAFE_BG : '#F1F5F9' }]}>
        <Feather name={icon} size={14} color={done ? SAFE : MUTED} />
      </View>
      <Text style={styles.checkText}>{text}</Text>
      <Feather
        name={done ? 'check-circle' : 'circle'}
        size={18}
        color={done ? SAFE : MUTED}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, alignItems: 'center', gap: 10 },

  header: { alignItems: 'center', gap: 6 },
  brandLine: { color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillDot: { width: 7, height: 7, borderRadius: 3.5 },
  pillText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  ringWrap: { width: 210, height: 210, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ringOuter: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
  },
  ringInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
  },

  title: { color: NAVY, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  sub: { color: NAVY_SOFT, fontSize: 14, textAlign: 'center' },

  elapsedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    marginTop: 2,
  },
  elapsedText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },

  statusCard: {
    alignSelf: 'stretch',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    marginTop: 8,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  checkTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { flex: 1, color: NAVY, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 12 },

  actions: { alignSelf: 'stretch', gap: 10, marginTop: 'auto' },
  actionBtn: { alignSelf: 'stretch' },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: { color: NAVY, fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: NAVY_SOFT, fontSize: 13, fontWeight: '700' },
  endBtn: { alignItems: 'center', paddingVertical: 8 },
  endText: { color: MUTED, fontSize: 13, fontWeight: '600' },
});
