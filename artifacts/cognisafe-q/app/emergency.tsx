import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function EmergencyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, canCancelEmergency, cancelEmergency, stopTrip } = useTrip();
  const primary = contacts[0];
  return (
    <View style={[styles.container, { backgroundColor: colors.destructive, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <View style={styles.iconCircle}><Feather name="radio" size={35} color={colors.destructive} /></View>
        <Text style={[styles.eyebrow, { color: colors.destructiveForeground }]}>COGNISAFE-Q</Text>
        <Text style={[styles.title, { color: colors.destructiveForeground }]}>Emergency alert</Text>
        <Text style={[styles.subtitle, { color: colors.destructiveForeground }]}>Emergency response has been activated.</Text>
      </View>
      <View style={[styles.statusCard, { backgroundColor: `${colors.destructiveForeground}14` }]}>
        <StatusLine icon="map-pin" text="Location captured" colors={colors} />
        <StatusLine icon="send" text="Alert sent" colors={colors} />
        <StatusLine icon="users" text={primary ? `${primary.name} notified` : 'Response circle notified'} colors={colors} />
      </View>
      <View style={styles.actions}>
        {primary ? <PrimaryButton icon="phone" variant="secondary" onPress={() => void Linking.openURL(`tel:${primary.phone}`)}>Call {primary.name}</PrimaryButton> : null}
        <Pressable onPress={() => Alert.alert('Location captured', 'Your current location was included with the emergency event.')} style={styles.locationButton}>
          <Feather name="navigation" size={18} color={colors.destructiveForeground} />
          <Text style={[styles.locationText, { color: colors.destructiveForeground }]}>View location details</Text>
        </Pressable>
        {canCancelEmergency ? <PrimaryButton onPress={() => { cancelEmergency(); router.replace('/trip'); }} variant="ghost" style={styles.cancelButton}>Cancel false alert</PrimaryButton> : null}
        <Pressable onPress={async () => { await stopTrip(); router.replace('/summary'); }} style={styles.endButton}>
          <Text style={[styles.endText, { color: colors.destructiveForeground }]}>End trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusLine({ icon, text, colors }: { icon: React.ComponentProps<typeof Feather>['name']; text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.statusLine}>
      <Feather name={icon} size={17} color={colors.destructiveForeground} />
      <Text style={[styles.statusText, { color: colors.destructiveForeground }]}>{text}</Text>
      <Feather name="check" size={17} color={colors.destructiveForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  top: { alignItems: 'center' },
  iconCircle: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 15 },
  title: { fontSize: 36, lineHeight: 42, letterSpacing: -1.3, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  statusCard: { borderRadius: 20, padding: 16, gap: 17 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { flex: 1, fontSize: 14, fontWeight: '600' },
  actions: { gap: 12 },
  locationButton: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF66', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  locationText: { fontSize: 15, fontWeight: '700' },
  cancelButton: { borderColor: '#FFFFFF66' },
  endButton: { alignItems: 'center', paddingVertical: 8 },
  endText: { fontSize: 14, fontWeight: '700' },
});