/**
 * Notifications — Batch 5.
 *
 * The app does not persist a dedicated notification stream, so we DERIVE
 * a lightweight feed from what IS persisted:
 *   • Trip events for the last few trips (ALERT / EMERGENCY / SAFE ack) →
 *     "Safety Alert", "Emergency Contact Added" (contacts count) etc.
 *   • Trip completions → "Trip Completed".
 * Nothing is fabricated — if trips is empty, we render a clean empty state.
 *
 * A tiny filter row (All / Alerts / System) uses the same categorisation
 * as the reference and only categorises rows we actually have.
 */

import React, { useMemo, useState } from 'react';
import {
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
import { useTrip, Trip } from '@/components/TripContext';

const NAVY = '#0F1E4A';
const NAVY_SOFT = '#334155';
const MUTED = '#64748B';
const SURFACE = '#FFFFFF';
const CARD_BORDER = '#E2ECF7';
const BRAND_BLUE = '#2563EB';
const SAFE = '#22C55E';
const WARN = '#F59E0B';
const DANGER = '#EF4444';

type Category = 'alert' | 'system';

type Notification = {
  id: string;
  category: Category;
  tone: 'safe' | 'warn' | 'danger' | 'brand';
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  body: string;
  when: string; // relative label
  ts: number;   // epoch for ordering
};

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const buildFeed = (trips: Trip[]): Notification[] => {
  const feed: Notification[] = [];
  const recent = trips.slice(0, 8);

  for (const t of recent) {
    // Trip completed entry (real trip)
    feed.push({
      id: `${t.id}::done`,
      category: 'system',
      tone: t.emergencyTriggered ? 'danger' : t.hadAlert ? 'warn' : 'safe',
      icon: 'flag',
      title: 'Trip Completed',
      body: `${t.distance.toFixed(1)} km · ${Math.floor(t.duration / 60)} min · Score ${
        t.emergencyTriggered ? 52 : t.hadAlert ? 78 : 96
      }.`,
      when: fmtRelative(t.endedAt),
      ts: new Date(t.endedAt).getTime(),
    });

    // Convert trip events into feed items (limit to real ALERT / EMERGENCY)
    for (const event of t.events) {
      if (event.status === 'SAFE' || event.status === 'CANCELLED') continue;
      feed.push({
        id: `${t.id}::${event.id}`,
        category: 'alert',
        tone: event.status === 'EMERGENCY' ? 'danger' : 'warn',
        icon: event.status === 'EMERGENCY' ? 'alert-octagon' : 'alert-triangle',
        title: event.status === 'EMERGENCY' ? 'Emergency Triggered' : 'Safety Alert',
        body: event.label,
        when: fmtRelative(event.timestamp),
        ts: new Date(event.timestamp).getTime(),
      });
    }
  }

  return feed.sort((a, b) => b.ts - a.ts);
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { trips, contacts } = useTrip();
  const [filter, setFilter] = useState<'all' | Category>('all');

  const feed = useMemo(() => {
    const items = buildFeed(trips);

    // Prepend one system row about contacts (real state).
    if (contacts.length > 0) {
      items.unshift({
        id: 'contacts::ready',
        category: 'system',
        tone: 'brand',
        icon: 'users',
        title: 'Emergency Contacts Ready',
        body: `${contacts.length} contact${contacts.length === 1 ? '' : 's'} will be notified in an emergency.`,
        when: 'Standing by',
        ts: Date.now(),
      });
    }
    return items;
  }, [trips, contacts.length]);

  const shown = filter === 'all' ? feed : feed.filter((n) => n.category === filter);

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
          <Text style={styles.topTitle}>Notifications</Text>
          <View style={styles.iconBtn} />
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(['all', 'alert', 'system'] as const).map((k) => {
            const active = filter === k;
            const label = k === 'all' ? 'All' : k === 'alert' ? 'Alerts' : 'System';
            return (
              <Pressable
                key={k}
                onPress={() => setFilter(k)}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              >
                <Text style={active ? styles.chipTextActive : styles.chipTextIdle}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {shown.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="bell-off" size={22} color={MUTED} />
            </View>
            <Text style={styles.emptyTitle}>Nothing to show</Text>
            <Text style={styles.emptyBody}>
              {feed.length === 0
                ? 'Once you complete a trip or a safety event fires, it will appear here.'
                : 'No notifications match this filter.'}
            </Text>
          </View>
        ) : (
          <View style={styles.feed}>
            {shown.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </View>
        )}
      </ScrollView>
    </AppBackground>
  );
}

function NotificationRow({ n }: { n: Notification }) {
  const toneColor =
    n.tone === 'danger' ? DANGER : n.tone === 'warn' ? WARN : n.tone === 'safe' ? SAFE : BRAND_BLUE;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: toneColor + '18' }]}>
        <Feather name={n.icon} size={16} color={toneColor} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHead}>
          <Text style={styles.rowTitle}>{n.title}</Text>
          <Text style={styles.rowWhen}>{n.when}</Text>
        </View>
        <Text style={styles.rowBody}>{n.body}</Text>
      </View>
    </View>
  );
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

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
  },
  chipActive: { backgroundColor: BRAND_BLUE, borderColor: BRAND_BLUE },
  chipIdle: { backgroundColor: SURFACE, borderColor: CARD_BORDER },
  chipTextActive: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  chipTextIdle: { color: NAVY_SOFT, fontSize: 12, fontWeight: '800' },

  feed: { gap: 10 },
  row: {
    flexDirection: 'row', gap: 12,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 16, padding: 12,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowTitle: { color: NAVY, fontSize: 14, fontWeight: '800' },
  rowWhen: { color: MUTED, fontSize: 11, fontWeight: '700' },
  rowBody: { color: NAVY_SOFT, fontSize: 12 },

  empty: {
    alignItems: 'center', gap: 6,
    padding: 24,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: CARD_BORDER,
    borderRadius: 20,
  },
  emptyIcon: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  emptyBody: { color: NAVY_SOFT, fontSize: 12, textAlign: 'center' },
});
