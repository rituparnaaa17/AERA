/**
 * About — Batch 5.
 *
 * Uses the approved brand logo + mascot from `assets/`. Real app metadata
 * comes from `expo-constants` (name + version from app.json). No broken
 * external links — the sub-sections read as anchors into the About page
 * itself rather than shipping unimplemented URLs.
 */

import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '@/components/AppBackground';
import { BrandLogo } from '@/components/Mascot';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const BRAND_BLUE = '#2563EB';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  // Real metadata from app.json
  const appName = (Constants.expoConfig?.name as string | undefined) ?? 'AERA';
  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

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
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={NAVY} />
          </Pressable>
          <Text style={styles.topTitle}>About</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* Brand card */}
        <View style={styles.brandCard}>
          <BrandLogo size={68} />
          <Text style={styles.brand}>{appName}</Text>
          <Text style={styles.tagline}>People Safe. Journeys Brighter.</Text>
          <View style={styles.versionChip}>
            <Text style={styles.versionText}>v{version}</Text>
          </View>
        </View>

        {/* Mascot + description */}
        <View style={styles.descCard}>
          <Image
            source={require('@/assets/mascot/neutral.png')}
            style={styles.descMascot}
            resizeMode="contain"
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.descTitle}>An AI safety companion</Text>
            <Text style={styles.descBody}>
              AERA monitors driving behaviour, detects potential risks
              and notifies emergency contacts if things go wrong. It runs on
              your device with a small cloud footprint for alerts.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>DOCUMENTS</Text>
        <View style={styles.group}>
          <RowLink
            icon="shield"
            iconBg="#DBEAFE"
            iconColor={BRAND_BLUE}
            title="Privacy Policy"
            body="How safety data is handled and stored."
          />
          <Divider />
          <RowLink
            icon="file-text"
            iconBg="#E2ECF7"
            iconColor={NAVY_SOFT}
            title="Terms of Service"
            body="What you agree to by using the app."
          />
          <Divider />
          <RowLink
            icon="award"
            iconBg="#DCFCE7"
            iconColor="#16A34A"
            title="Open Source Licenses"
            body="Third-party libraries and credits."
          />
        </View>

        <Text style={styles.footer}>© AERA · Built with Expo & React Native.</Text>
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
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
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
      <Text style={styles.rowMuted}>Coming soon</Text>
    </View>
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

  brandCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 24, gap: 6,
  },
  brand: { color: NAVY, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  brandAccent: { color: BRAND_BLUE },
  tagline: { color: NAVY_SOFT, fontSize: 13 },
  versionChip: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  versionText: { color: NAVY, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  descCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20,
    alignItems: 'center',
  },
  descMascot: { width: 84, height: 84 },
  descTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  descBody: { color: NAVY_SOFT, fontSize: 12, lineHeight: 18 },

  sectionLabel: {
    color: NAVY_SOFT, fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    marginTop: 6, marginLeft: 4,
  },
  group: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20, overflow: 'hidden',
  },
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
  rowMuted: { color: MUTED, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginHorizontal: 14 },

  footer: {
    color: MUTED, fontSize: 11, fontWeight: '600',
    textAlign: 'center', marginTop: 4,
  },
});
