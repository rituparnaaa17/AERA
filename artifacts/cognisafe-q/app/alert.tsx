import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function AlertScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { confidence, alertSecondsLeft, acknowledgeOk, triggerManualSos } = useTrip();
  return (
    <View style={[styles.container, { backgroundColor: colors.warning, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.iconCircle}>
        <Feather name="alert-triangle" size={42} color={colors.warning} />
      </View>
      <Text style={[styles.eyebrow, { color: colors.background }]}>COGNISAFE-Q</Text>
      <Text style={[styles.title, { color: colors.background }]}>Unusual motion detected</Text>
      <Text style={[styles.question, { color: colors.background }]}>Are you okay?</Text>
      <View style={[styles.confidenceCard, { backgroundColor: `${colors.background}14` }]}>
        <Text style={[styles.confidenceLabel, { color: colors.background }]}>AI CONFIDENCE</Text>
        <Text style={[styles.confidenceValue, { color: colors.background }]}>{Math.round((confidence ?? 0.89) * 100)}%</Text>
      </View>
      <View style={styles.countdownWrap}>
        <Text style={[styles.countdown, { color: colors.background }]}>{alertSecondsLeft}</Text>
        <Text style={[styles.seconds, { color: colors.background }]}>SECONDS</Text>
      </View>
      <Text style={[styles.body, { color: colors.background }]}>If you are safe, confirm below.</Text>
      <View style={styles.actions}>
        <PrimaryButton onPress={() => { acknowledgeOk(); router.replace('/trip'); }} icon="check" style={styles.okButton}>I’m OK</PrimaryButton>
        <Pressable onPress={() => void triggerManualSos()} style={styles.sosButton}>
          <Feather name="shield" size={18} color={colors.background} />
          <Text style={[styles.sosText, { color: colors.background }]}>Send SOS now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 16 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '700', textAlign: 'center', letterSpacing: -1 },
  question: { fontSize: 22, fontWeight: '500', marginTop: 12 },
  confidenceCard: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, marginTop: 28 },
  confidenceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  confidenceValue: { fontSize: 16, fontWeight: '700' },
  countdownWrap: { alignItems: 'center', marginTop: 36 },
  countdown: { fontSize: 82, lineHeight: 86, fontWeight: '700', letterSpacing: -4 },
  seconds: { fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  body: { fontSize: 14, marginTop: 20 },
  actions: { width: '100%', marginTop: 'auto', gap: 14 },
  okButton: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  sosButton: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF66', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  sosText: { fontSize: 16, fontWeight: '700' },
});