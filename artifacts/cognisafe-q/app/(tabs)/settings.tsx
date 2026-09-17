import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, SectionLabel } from '@/components/AppPrimitives';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setNotifyEmergencyServices, setCountdownSeconds, permissionGranted, refreshPermission } = useTrip();
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="Make it yours" title="Settings" />
      <SectionLabel>Emergency response</SectionLabel>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="phone-call" title="Notify emergency services" body="Include emergency services with your trusted contacts." value={settings.notifyEmergencyServices} onValueChange={setNotifyEmergencyServices} colors={colors} />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name="clock" size={17} color={colors.primary} /></View>
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Check-in countdown</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>Time to respond before an alert is sent.</Text></View>
          <View style={styles.countdownOptions}>
            {[15, 30, 45].map((seconds) => (
              <Pressable key={seconds} onPress={() => void setCountdownSeconds(seconds)} style={[styles.option, { borderColor: settings.countdownSeconds === seconds ? colors.primary : colors.border, backgroundColor: settings.countdownSeconds === seconds ? colors.accent : 'transparent' }]}>
                <Text style={[styles.optionText, { color: settings.countdownSeconds === seconds ? colors.primary : colors.mutedForeground }]}>{seconds}s</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <SectionLabel>Device access</SectionLabel>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name="map-pin" size={17} color={colors.primary} /></View>
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Location access</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{permissionGranted ? 'Ready for monitored trips' : 'Needed for trip monitoring'}</Text></View>
          <Pressable onPress={() => void refreshPermission()}><Text style={[styles.manage, { color: colors.primary }]}>Refresh</Text></Pressable>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name="activity" size={17} color={colors.primary} /></View>
          <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Motion sensors</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>Accelerometer and gyroscope monitor active trips.</Text></View>
          <Feather name="check" size={18} color={colors.primary} />
        </View>
      </View>

      <View style={[styles.about, { borderColor: colors.border }]}>
        <Text style={[styles.aboutName, { color: colors.foreground }]}>Cognisafe-Q</Text>
        <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>Safety intelligence for the moments you can’t predict.</Text>
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Hackathon MVP · v1.0</Text>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  title,
  body,
  value,
  onValueChange,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Feather name={icon} size={17} color={colors.primary} /></View>
      <View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.settingBody, { color: colors.mutedForeground }]}>{body}</Text></View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  group: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  settingIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  settingBody: { fontSize: 12, lineHeight: 17 },
  separator: { height: 1, marginLeft: 65 },
  countdownOptions: { flexDirection: 'row', gap: 5 },
  option: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 6 },
  optionText: { fontSize: 11, fontWeight: '700' },
  manage: { fontSize: 12, fontWeight: '700' },
  about: { borderTopWidth: 1, alignItems: 'center', paddingTop: 24, marginTop: 12 },
  aboutName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  aboutText: { textAlign: 'center', fontSize: 13, lineHeight: 19, maxWidth: 280 },
  version: { fontSize: 11, marginTop: 12 },
});