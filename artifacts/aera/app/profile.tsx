/**
 * Profile — AERA
 *
 * Renders real authenticated user session details from authService / AsyncStorage,
 * contacts count, trip history count, and provides a full Sign Out action.
 */

import React, { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { useTrip } from '@/components/TripContext';
import { getCurrentSession, signOut, type AuthSession } from '@/services/authService';
import { api } from '@/services/apiService';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const BRAND_BLUE = '#2563EB';
const DANGER = '#DC2626';
const SAFE = '#22C55E';
const WARN = '#F59E0B';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, trips } = useTrip();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const sess = await getCurrentSession();
      setSession(sess);

      // Try fetching backend profile details
      try {
        const res = await api.profile.get();
        if (res && res.success && res.data.name) {
          setProfileName(res.data.name);
        }
      } catch {
        // Offline or backend unavailable
      }
    };
    void loadUser();
  }, []);

  const logout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of AERA?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              // Ignore cleanup error
            }
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const displayName = profileName || (session?.email ? session.email.split('@')[0] : 'AERA Driver');
  const userIdentifier = session?.email || 'Logged in user';
  const userIdSub = session?.userId ? `ID: ${session.userId.slice(0, 12)}…` : 'Device authenticated';

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
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.subtle}>{userIdentifier}</Text>
          <Text style={styles.subtleMeta}>{userIdSub}</Text>

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
        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
        <View style={styles.group}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>LOGIN IDENTIFIER</Text>
            <Text style={styles.infoValue}>{userIdentifier}</Text>
          </View>
          <Divider />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SECURITY STATE</Text>
            <Text style={[styles.infoValue, { color: SAFE }]}>Cognito Authenticated</Text>
          </View>
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
            body="Alert timing, notifications, settings."
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
            body="FAQ and product guidance."
            onPress={() => router.push('/about' as never)}
          />
          <Divider />
          <RowLink
            icon="info"
            iconBg="#E2ECF7"
            iconColor={NAVY_SOFT}
            title="About AERA"
            body="Version and platform info."
            onPress={() => router.push('/about' as never)}
          />
        </View>

        {/* Logout */}
        <Pressable onPress={logout} style={styles.logout} accessibilityRole="button">
          <Feather name="log-out" size={16} color={DANGER} />
          <Text style={styles.logoutText}>Sign Out</Text>
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
    gap: 4,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  avatar: { width: 100, height: 100 },
  name: { color: NAVY, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtle: { color: NAVY_SOFT, fontSize: 14, fontWeight: '600' },
  subtleMeta: { color: MUTED, fontSize: 11 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
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
  infoRow: {
    paddingVertical: 12, paddingHorizontal: 14, gap: 2,
  },
  infoLabel: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  infoValue: { color: NAVY, fontSize: 14, fontWeight: '700' },

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
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5',
  },
  logoutText: { color: DANGER, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
