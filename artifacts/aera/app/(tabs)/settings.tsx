/**
 * Settings — AERA
 *
 * Grouped rows for safety, account, notifications, and developer preferences.
 * Includes user account details and Sign Out action.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { useTrip } from '@/components/TripContext';
import { getCurrentSession, signOut, type AuthSession } from '@/services/authService';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const BRAND_BLUE = '#2563EB';
const DANGER = '#DC2626';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    settings,
    setNotifyEmergencyServices,
    setCountdownSeconds,
    setDemoMode,
    setMockAi,
    permissionGranted,
    refreshPermission,
  } = useTrip();

  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    void getCurrentSession().then((sess) => setSession(sess));
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of AERA?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              // Safe to ignore
            }
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const userEmailOrPhone = session?.email || 'Authenticated User';

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>PREFERENCES</Text>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* ── User Account Card ── */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Feather name="user" size={20} color={BRAND_BLUE} />
          </View>
          <View style={styles.userCopy}>
            <Text style={styles.userName}>Logged In User</Text>
            <Text style={styles.userHandle}>{userEmailOrPhone}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile' as never)}
            style={styles.profileBtn}
            hitSlop={6}
          >
            <Text style={styles.profileBtnText}>Profile</Text>
            <Feather name="chevron-right" size={14} color={BRAND_BLUE} />
          </Pressable>
        </View>

        {/* ── Safety ── */}
        <SectionLabel>Safety</SectionLabel>
        <Group>
          <RowToggle
            icon="phone-call"
            iconBg="#DCFCE7"
            iconColor={SAFE}
            title="Notify Emergency Services"
            body="Include emergency services in the alert."
            value={settings.notifyEmergencyServices}
            onChange={setNotifyEmergencyServices}
          />
          <Divider />
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#DBEAFE' }]}>
              <Feather name="clock" size={16} color={BRAND_BLUE} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Alert Countdown</Text>
              <Text style={styles.rowBody}>Seconds to confirm before escalation.</Text>
            </View>
            <View style={styles.pillRow}>
              {[15, 30, 45].map((s) => {
                const active = settings.countdownSeconds === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => void setCountdownSeconds(s)}
                    style={[
                      styles.pill,
                      active ? styles.pillActive : styles.pillIdle,
                    ]}
                  >
                    <Text style={active ? styles.pillTextActive : styles.pillTextIdle}>
                      {s}s
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        {/* ── Account ── */}
        <SectionLabel>Account</SectionLabel>
        <Group>
          <RowLink
            icon="user"
            iconBg="#DBEAFE"
            iconColor={BRAND_BLUE}
            title="Profile & Account Details"
            body={userEmailOrPhone}
            onPress={() => router.push('/profile' as never)}
          />
          <Divider />
          <RowLink
            icon="users"
            iconBg="#DCFCE7"
            iconColor={SAFE}
            title="Emergency Contacts"
            body="Manage the circle notified during an alert."
            onPress={() => router.push('/(tabs)/contacts')}
          />
        </Group>

        {/* ── App ── */}
        <SectionLabel>App</SectionLabel>
        <Group>
          <RowLink
            icon="bell"
            iconBg="#FEF3C7"
            iconColor={WARN}
            title="Notifications"
            body="Alerts, weekly reports and system events."
            onPress={() => router.push('/notifications' as never)}
          />
          <Divider />
          {/* Location Services */}
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#DBEAFE' }]}>
              <Feather name="map-pin" size={16} color={BRAND_BLUE} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Location Services</Text>
              <Text style={styles.rowBody}>
                {permissionGranted === true
                  ? 'Ready for trip monitoring.'
                  : permissionGranted === false
                  ? 'Access denied — enable in system Settings.'
                  : 'Checking…'}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: permissionGranted ? SAFE : WARN },
                ]}
              />
              <Pressable onPress={() => void refreshPermission()} hitSlop={6}>
                <Text style={styles.refresh}>Refresh</Text>
              </Pressable>
            </View>
          </View>
          <Divider />
          <RowLink
            icon="info"
            iconBg="#E2ECF7"
            iconColor={NAVY_SOFT}
            title="About"
            body="Version, licenses and product info."
            onPress={() => router.push('/about' as never)}
          />
        </Group>

        {/* ── Developer ── */}
        <SectionLabel>Developer</SectionLabel>
        <Group>
          <RowToggle
            icon="play-circle"
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            title="Demo Mode"
            body="Show simulation controls for presentations."
            value={settings.demoMode}
            onChange={setDemoMode}
          />
          <Divider />
          <RowToggle
            icon="cpu"
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            title="Mock AI"
            body="Use simulated inference instead of the API."
            value={settings.mockAi}
            onChange={setMockAi}
          />
        </Group>

        {/* ── Sign Out ── */}
        <Pressable onPress={handleSignOut} style={styles.signOutBtn} accessibilityRole="button">
          <Feather name="log-out" size={16} color={DANGER} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Building blocks ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{String(children).toUpperCase()}</Text>;
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function RowToggle({
  icon,
  iconBg,
  iconColor,
  title,
  body,
  value,
  onChange,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E2ECF7', true: BRAND_BLUE }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function RowLink({
  icon,
  iconBg,
  iconColor,
  title,
  body,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={MUTED} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 12 },

  pageHeader: { gap: 2 },
  eyebrow: { color: MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  pageTitle: { color: NAVY, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    marginTop: 4,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCopy: { flex: 1, gap: 2 },
  userName: { color: NAVY, fontSize: 15, fontWeight: '800' },
  userHandle: { color: NAVY_SOFT, fontSize: 12 },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  profileBtnText: { color: BRAND_BLUE, fontSize: 12, fontWeight: '800' },

  sectionLabel: {
    color: NAVY_SOFT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 8,
    marginLeft: 4,
  },

  group: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  rowBody: { color: NAVY_SOFT, fontSize: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  refresh: { color: BRAND_BLUE, fontSize: 12, fontWeight: '800' },

  pillRow: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: BRAND_BLUE, borderColor: BRAND_BLUE },
  pillIdle: { backgroundColor: '#F1F5F9', borderColor: CARD_BORDER },
  pillTextActive: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  pillTextIdle: { color: NAVY_SOFT, fontSize: 11, fontWeight: '800' },

  signOutBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutText: { color: DANGER, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
