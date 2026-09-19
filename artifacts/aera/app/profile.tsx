/**
 * Profile — Batch 5.
 *
 * The current build has no real backend/session store, so we render the
 * best we can from what's actually persisted (contact count from
 * TripContext) and expose the standard entry points around it.
 *
 * Logout flow:
 *   • Confirmation dialog before firing.
 *   • Clears the AsyncStorage keys we own for session-related preferences
 *     (`@aera/authed` if you later add real auth). Trip history,
 *     contacts, and safety settings are LEFT ALONE because they aren't
 *     coupled to a specific user in this architecture.
 *   • `router.replace('/(auth)/login')` prevents back-nav into the app.
 */

import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { useTrip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const BRAND_BLUE = '#2563EB';
const DANGER = '#DC2626';
const SAFE = '#22C55E';
const WARN = '#F59E0B';

// Session-related AsyncStorage keys we own. Add more here if the auth
// flow starts storing real tokens.
const SESSION_KEYS = [
  '@aera/authed',
  '@aera/session',
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, trips } = useTrip();

  const logout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(SESSION_KEYS);
            } catch {
              // Session keys may not exist yet — safe to ignore.
            }
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <AppBackground fadeStrength="default">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={NAVY} />
          </Pressable>
          <Text style={styles.topTitle}>Profile</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* Identity card */}
        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <Image
              source={require('@/assets/mascot/neutral.png')}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.name}>AERA Driver</Text>
          <Text style={styles.subtle}>Signed in on this device</Text>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Feather name="users" size={11} color={SAFE} />
              <Text style={styles.chipText}>{contacts.length} contacts</Text>
            </View>
            <View style={styles.chip}>
              <Feather name="clock" size={11} color={BRAND_BLUE} />
              <Text style={styles.chipText}>{trips.length} trips</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.group}>
          <RowLink
            icon="edit-3"
            iconBg="#DBEAFE"
            iconColor={BRAND_BLUE}
            title="Edit Profile"
            body="Update how the app addresses you."
            onPress={() =>
              Alert.alert(
                'Coming soon',
                'Editable profile fields will arrive with the account backend.',
              )
            }
          />
          <Divider />
          <RowLink
            icon="users"
            iconBg="#DCFCE7"
            iconColor={SAFE}
            title="Emergency Contacts"
            body="Manage your response circle."
            onPress={() => router.push('/(tabs)/contacts')}
          />
          <Divider />
          <RowLink
            icon="sliders"
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            title="App Preferences"
            body="Alert timing, notifications, more."
            onPress={() => router.push('/(tabs)/settings')}
          />
        </View>

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.group}>
          <RowLink
            icon="shield"
            iconBg="#DBEAFE"
            iconColor={BRAND_BLUE}
            title="Privacy & Security"
            body="How your safety data is handled."
            onPress={() => router.push('/about' as never)}
          />
          <Divider />
          <RowLink
            icon="help-circle"
            iconBg="#FEF3C7"
            iconColor={WARN}
            title="Help & Support"
            body="FAQ and how to reach us."
            onPress={() => router.push('/about' as never)}
          />
          <Divider />
          <RowLink
            icon="info"
            iconBg="#E2ECF7"
            iconColor={NAVY_SOFT}
            title="About"
            body="Version, licenses and more."
            onPress={() => router.push('/about' as never)}
          />
        </View>

        {/* Logout */}
        <Pressable onPress={logout} style={styles.logout} accessibilityRole="button">
          <Feather name="log-out" size={16} color={DANGER} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </AppBackground>
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

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 12 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },

  // Identity
  identity: {
    alignItems: 'center',
    padding: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 24,
    gap: 6,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: 100, height: 100 },
  name: { color: NAVY, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtle: { color: NAVY_SOFT, fontSize: 12 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: CARD_BORDER,
  },
  chipText: { color: NAVY, fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    color: NAVY_SOFT, fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    marginTop: 6, marginLeft: 4,
  },
  group: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  rowBody: { color: NAVY_SOFT, fontSize: 12 },

  logout: {
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5',
  },
  logoutText: { color: DANGER, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
});
