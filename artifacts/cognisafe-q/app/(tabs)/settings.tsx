/**
 * Settings Screen — Organized, grouped settings with premium layout
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    settings,
    setNotifyEmergencyServices,
    setCountdownSeconds,
    setDemoMode,
    setMockAi,
    permissionGranted,
    refreshPermission,
    tripActive,
    simulateStatus,
  } = useTrip();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.text1 }]}>Settings</Text>
      <Text style={[styles.screenSub, { color: colors.text3 }]}>Configure your safety preferences</Text>

      {/* ── Safety Settings ── */}
      <SettingGroup title="Safety" icon="shield" iconBg="#F0FBF5" iconColor={colors.safe} colors={colors}>
        <SettingRow
          icon="phone-call"
          iconBg="#F0FBF5"
          iconColor={colors.safe}
          title="Notify Emergency Services"
          body="Include emergency services in the alert."
          value={settings.notifyEmergencyServices}
          onValueChange={setNotifyEmergencyServices}
          colors={colors}
        />
        <SettingDivider colors={colors} />
        {/* Countdown */}
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: '#FFF0F0' }]}>
            <Feather name="clock" size={17} color={colors.primary} />
          </View>
          <View style={styles.settingCopy}>
            <Text style={[styles.settingTitle, { color: colors.text1 }]}>Alert Countdown</Text>
            <Text style={[styles.settingBody, { color: colors.text3 }]}>Seconds to confirm before escalation</Text>
          </View>
          <View style={styles.countdownPills}>
            {[15, 30, 45].map((s) => (
              <Pressable
                key={s}
                onPress={() => void setCountdownSeconds(s)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: settings.countdownSeconds === s ? colors.primary : colors.muted,
                    borderColor: settings.countdownSeconds === s ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: settings.countdownSeconds === s ? '#FFFFFF' : colors.text3 }]}>
                  {s}s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SettingGroup>

      {/* ── Demo / Developer ── */}
      <SettingGroup title="Demo & Developer" icon="cpu" iconBg="#FFF0F0" iconColor={colors.primary} colors={colors}>
        <SettingRow
          icon="play-circle"
          iconBg="#FFF0F0"
          iconColor={colors.primary}
          title="Demo Mode"
          body="Show simulation controls for presentations."
          value={settings.demoMode}
          onValueChange={setDemoMode}
          colors={colors}
        />
        <SettingDivider colors={colors} />
        <SettingRow
          icon="cpu"
          iconBg="#FFF0F0"
          iconColor={colors.primary}
          title="Mock AI"
          body="Use simulated inference instead of AWS."
          value={settings.mockAi}
          onValueChange={setMockAi}
          colors={colors}
        />
        {settings.demoMode && (
          <View style={[styles.demoSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.demoLabel, { color: colors.text3 }]}>
              SIMULATE STATUS {!tripActive ? '— start a trip first' : ''}
            </Text>
            <View style={styles.demoButtons}>
              {(['SAFE', 'ALERT', 'EMERGENCY'] as const).map((st) => {
                const sc = st === 'SAFE' ? colors.safe : st === 'ALERT' ? colors.warning : colors.destructive;
                return (
                  <Pressable
                    key={st}
                    disabled={!tripActive}
                    onPress={() => void simulateStatus(st)}
                    style={[
                      styles.demoBtn,
                      { backgroundColor: sc + '18', borderColor: sc + '44' },
                      !tripActive && styles.disabled,
                    ]}
                  >
                    <View style={[styles.demoDot, { backgroundColor: sc }]} />
                    <Text style={[styles.demoBtnText, { color: sc }]}>{st}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </SettingGroup>

      {/* ── Connection ── */}
      <SettingGroup title="Connection" icon="wifi" iconBg="#F5F0FF" iconColor="#7C3AED" colors={colors}>
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: '#F5F0FF' }]}>
            <Feather name="link" size={17} color="#7C3AED" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={[styles.settingTitle, { color: colors.text1 }]}>API Endpoint</Text>
            <Text style={[styles.settingBody, { color: colors.text3 }]}>Configured via environment variables</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: settings.mockAi ? colors.muted : '#F0FBF5', borderColor: settings.mockAi ? colors.border : colors.safeBorder }]}>
            <Text style={[styles.badgeText, { color: settings.mockAi ? colors.text3 : colors.safe }]}>
              {settings.mockAi ? 'MOCK' : 'LIVE'}
            </Text>
          </View>
        </View>
      </SettingGroup>

      {/* ── Device Access ── */}
      <SettingGroup title="Device Access" icon="smartphone" iconBg="#F0F5FF" iconColor="#2563EB" colors={colors}>
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: '#F0F5FF' }]}>
            <Feather name="map-pin" size={17} color="#2563EB" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={[styles.settingTitle, { color: colors.text1 }]}>Location Access</Text>
            <Text style={[styles.settingBody, { color: colors.text3 }]}>
              {permissionGranted ? 'Ready for trip monitoring' : 'Required for GPS tracking'}
            </Text>
          </View>
          <View style={styles.accessRight}>
            <View style={[styles.accessDot, { backgroundColor: permissionGranted ? colors.safe : colors.warning }]} />
            <Pressable onPress={() => void refreshPermission()}>
              <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
            </Pressable>
          </View>
        </View>
        <SettingDivider colors={colors} />
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: '#F0F5FF' }]}>
            <Feather name="activity" size={17} color="#2563EB" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={[styles.settingTitle, { color: colors.text1 }]}>Motion Sensors</Text>
            <Text style={[styles.settingBody, { color: colors.text3 }]}>Accelerometer + gyroscope active</Text>
          </View>
          <Feather name="check-circle" size={20} color={colors.safe} />
        </View>
      </SettingGroup>

      {/* ── About ── */}
      <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.aboutLogo}
          resizeMode="contain"
        />
        <Text style={[styles.aboutName, { color: colors.text1 }]}>Cognisafe-Q</Text>
        <Text style={[styles.aboutTagline, { color: colors.text3 }]}>
          Safety intelligence for every journey.
        </Text>
        <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.aboutVersion, { color: colors.text4 }]}>Hackathon MVP · v1.0 · React Native + Expo</Text>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingGroup({
  title, icon, iconBg, iconColor, children, colors,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={[styles.groupIcon, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={14} color={iconColor} />
        </View>
        <Text style={[styles.groupTitle, { color: colors.text2 }]}>{title}</Text>
      </View>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon, iconBg, iconColor, title, body, value, onValueChange, colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: colors.text1 }]}>{title}</Text>
        <Text style={[styles.settingBody, { color: colors.text3 }]}>{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.muted}
      />
    </View>
  );
}

function SettingDivider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 65 }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 10 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  screenSub: { fontSize: 13, marginBottom: 10 },

  // Groups
  group: { gap: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  groupIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  groupCard: { borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },

  // Rows
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  settingIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  settingBody: { fontSize: 12, lineHeight: 17 },
  divider: { height: 1 },

  // Countdown pills
  countdownPills: { flexDirection: 'row', gap: 5 },
  pill: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 9, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: '700' },

  // Demo
  demoSection: { borderTopWidth: 1, padding: 15, gap: 10 },
  demoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  demoButtons: { flexDirection: 'row', gap: 8 },
  demoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 11 },
  demoDot: { width: 7, height: 7, borderRadius: 3.5 },
  demoBtnText: { fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.4 },

  // Badge
  badge: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },

  // Access
  accessRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accessDot: { width: 8, height: 8, borderRadius: 4 },
  refreshText: { fontSize: 12, fontWeight: '700' },

  // About
  aboutCard: { borderRadius: 22, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 6, marginTop: 10 },
  aboutLogo: { width: 52, height: 52, marginBottom: 4 },
  aboutName: { fontSize: 18, fontWeight: '800' },
  aboutTagline: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  aboutDivider: { height: 1, width: '100%', marginVertical: 8 },
  aboutVersion: { fontSize: 11 },
});