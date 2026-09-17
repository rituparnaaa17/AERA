/**
 * Emergency Screen — Full red emergency response screen
 * Activated after countdown expires or manual SOS triggered.
 */

import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

export default function EmergencyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, canCancelEmergency, cancelEmergency, stopTrip } = useTrip();
  const primary = contacts[0];

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0.8)).current;
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);

    return () => {
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      clearInterval(timer);
    };
  }, [pulseAnim, ringAnim]);

  const formatElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: '#FFF0F0', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
      ]}
    >
      {/* ── Top indicator ── */}
      <View style={styles.topLabel}>
        <Text style={[styles.topEyebrow, { color: colors.destructive }]}>COGNISAFE-Q</Text>
        <Text style={[styles.topSub, { color: colors.text3 }]}>EMERGENCY RESPONSE ACTIVE</Text>
      </View>

      {/* ── Central emergency indicator ── */}
      <View style={styles.centerSection}>
        <View style={styles.ringWrap}>
          <Animated.View style={[styles.outerRing, { borderColor: colors.destructive, opacity: ringAnim }]} />
          <Animated.View style={[styles.innerRing, { borderColor: colors.destructive, transform: [{ scale: pulseAnim }] }]} />
          <View style={[styles.emergencyCore, { backgroundColor: colors.destructive }]}>
            <Feather name="alert-octagon" size={38} color="#FFFFFF" />
          </View>
        </View>
        <Text style={[styles.emergencyLabel, { color: colors.destructive }]}>EMERGENCY</Text>
        <Text style={[styles.emergencySub, { color: colors.text2 }]}>Response initiated</Text>
        <View style={[styles.elapsedBadge, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '44' }]}>
          <Feather name="clock" size={13} color={colors.destructive} />
          <Text style={[styles.elapsedText, { color: colors.destructive }]}>{formatElapsed(elapsed)}</Text>
        </View>
      </View>

      {/* ── Status card ── */}
      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: '#FFCCCC' }]}>
        <StatusLine icon="map-pin" label="Location" text="GPS location captured" active colors={colors} />
        <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
        <StatusLine icon="send" label="Alert" text="Emergency alert sent" active colors={colors} />
        <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
        <StatusLine
          icon="users"
          label="Contacts"
          text={primary ? `${primary.name} notified` : `${contacts.length || 0} contacts notified`}
          active={contacts.length > 0}
          colors={colors}
        />
      </View>

      {/* ── Info message ── */}
      <View style={[styles.infoBox, { backgroundColor: '#FFF8F8', borderColor: '#FFCCCC' }]}>
        <Feather name="info" size={14} color={colors.destructive} />
        <Text style={[styles.infoText, { color: colors.text2 }]}>
          Your emergency contacts have been notified with your GPS location.
        </Text>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        {primary ? (
          <PrimaryButton
            icon="phone"
            variant="danger"
            onPress={() => void Linking.openURL(`tel:${primary.phone}`)}
          >
            Call {primary.name}
          </PrimaryButton>
        ) : null}

        <PrimaryButton
          icon="navigation"
          variant="secondary"
          onPress={() =>
            Alert.alert('Location Shared', 'Your GPS coordinates were included in the emergency notification.')
          }
        >
          View Location Details
        </PrimaryButton>

        {canCancelEmergency && (
          <Pressable
            onPress={() => { cancelEmergency(); router.replace('/trip'); }}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelText, { color: colors.text3 }]}>Cancel — False Alarm</Text>
          </Pressable>
        )}

        <Pressable
          onPress={async () => { await stopTrip(); router.replace('/summary'); }}
          style={styles.endTripBtn}
        >
          <Text style={[styles.endTripText, { color: colors.text4 }]}>End Trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusLine({
  icon, label, text, active, colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  text: string;
  active: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.statusLine}>
      <View style={[styles.statusIconWrap, { backgroundColor: active ? '#F0FBF5' : '#F5F5F5' }]}>
        <Feather name={icon} size={15} color={active ? colors.safe : colors.text4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusLineLabel, { color: colors.text3 }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.statusLineText, { color: colors.text1 }]}>{text}</Text>
      </View>
      <Feather name="check-circle" size={18} color={active ? colors.safe : colors.text4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  topLabel: { alignItems: 'center', marginBottom: 20 },
  topEyebrow: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  topSub: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },

  centerSection: { alignItems: 'center', marginBottom: 24 },
  ringWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  outerRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1.5 },
  innerRing: { position: 'absolute', width: 152, height: 152, borderRadius: 76, borderWidth: 2 },
  emergencyCore: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', shadowColor: '#E53935', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  emergencyLabel: { fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  emergencySub: { fontSize: 15, marginTop: 4 },
  elapsedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  elapsedText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  statusCard: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', marginBottom: 14 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  statusIconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statusLineLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  statusLineText: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  statusDivider: { height: 1 },

  infoBox: { borderRadius: 14, borderWidth: 1.5, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },

  actions: { gap: 11 },
  cancelBtn: { height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  endTripBtn: { alignItems: 'center', paddingVertical: 8 },
  endTripText: { fontSize: 13, fontWeight: '500' },
});