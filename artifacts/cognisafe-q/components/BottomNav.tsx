/**
 * BottomNav — rebuilt from scratch to match `ui-reference/nav_bar`.
 *
 * White floating pill with:
 *   • 4 flat tabs — Home · History · Contacts · Settings
 *   • Centered SOS in an elevated solid-blue circle with a white border,
 *     containing a white gear icon; the label "SOS" sits below it in blue.
 *
 * The bar is a slim, well-shadowed pill; icons are Feather outline glyphs
 * (Home / clock / users / sliders) with blue for active and cool gray for
 * inactive. Routing behavior is preserved: taps emit `tabPress` and navigate
 * to the corresponding tab route, so the SOS tab still opens the existing
 * manual SOS surface (`live` route).
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Feather>['name'];

const TABS: { route: string; label: string; icon: IconName; sos?: boolean }[] = [
  { route: 'index', label: 'Home', icon: 'home' },
  { route: 'history', label: 'History', icon: 'clock' },
  { route: 'live', label: 'SOS', icon: 'settings', sos: true },
  { route: 'contacts', label: 'Contacts', icon: 'users' },
  { route: 'settings', label: 'Settings', icon: 'sliders' },
];

type TabRoute = { key: string; name: string };
type BottomTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
};

const ACTIVE = '#2563EB';
const INACTIVE = '#9AA6B7';
const LABEL_INACTIVE = '#9AA6B7';
const BAR_BG = '#FFFFFF';
const BAR_BORDER = '#E6EEF7';

const BAR_HEIGHT = 58;
const SOS_SIZE = 56;
const SOS_LIFT = 20; // how far the SOS circle floats above the bar's top edge

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const routesByName = new Map(state.routes.map((r) => [r.name, r]));
  const currentName = state.routes[state.index]?.name;

  const onSelect = (routeName: string) => {
    const route = routesByName.get(routeName);
    if (!route) return;
    const focused = route.name === currentName;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      {/* Slot that reserves space for the elevated SOS badge */}
      <View pointerEvents="box-none" style={styles.overlayRow}>
        {TABS.map((tab, i) => {
          if (!tab.sos) return <View key={i} style={styles.overlayFiller} />;
          return (
            <View key={i} style={styles.sosSlot} pointerEvents="box-none">
              <Pressable
                onPress={() => onSelect(tab.route)}
                accessibilityRole="button"
                accessibilityLabel="SOS"
                style={({ pressed }) => [styles.sosBtn, pressed && styles.sosBtnPressed]}
                hitSlop={8}
              >
                <Feather name={tab.icon} size={26} color="#FFFFFF" />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* White pill bar — extends into safe area, icons stay above it */}
      <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
        {TABS.map((tab) => {
          const focused = tab.route === currentName;

          if (tab.sos) {
            // Reserve the same footprint below the floating circle so labels
            // stay in one row.
            return (
              <View key={tab.route} style={styles.item}>
                <View style={styles.sosSpacer} />
                <Text style={[styles.label, styles.sosLabel]}>SOS</Text>
              </View>
            );
          }

          return (
            <Pressable
              key={tab.route}
              onPress={() => onSelect(tab.route)}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              style={styles.item}
              hitSlop={4}
            >
              <Feather
                name={tab.icon}
                size={22}
                color={focused ? ACTIVE : INACTIVE}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? ACTIVE : LABEL_INACTIVE, fontWeight: focused ? '800' : '600' },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    paddingHorizontal: 18,
  },

  // Row that overlays the bar top; only the SOS slot uses it visibly.
  overlayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    // Overlap so the SOS circle floats above the pill
    marginBottom: -(SOS_LIFT + SOS_SIZE / 2 - BAR_HEIGHT / 2 + 4),
    zIndex: 2,
  },
  overlayFiller: { flex: 1 },
  sosSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sosBtn: {
    width: SOS_SIZE,
    height: SOS_SIZE,
    borderRadius: SOS_SIZE / 2,
    backgroundColor: ACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: ACTIVE,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  sosBtnPressed: { opacity: 0.9 },

  // The white floating pill itself — fully rounded top, extends down into
  // the safe-area so its background fills where the system nav symbols sit.
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: BAR_HEIGHT,
    // Top corners keep the pill silhouette; bottom is flat so the fill flows
    // cleanly into the phone's system-nav strip.
    borderTopLeftRadius: BAR_HEIGHT / 2,
    borderTopRightRadius: BAR_HEIGHT / 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: BAR_BG,
    borderWidth: 1,
    borderColor: BAR_BORDER,
    // Border on the bottom would look odd once flush; hide it.
    borderBottomWidth: 0,
    paddingHorizontal: 6,
    paddingTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#0F1E4A',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.10,
        shadowRadius: 22,
      },
      android: { elevation: 10 },
    }),
  },
  item: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Vertical spacer inside the SOS column so its label sits at the same
  // baseline as the other labels while the circle floats above.
  sosSpacer: { height: 22 },
  sosLabel: {
    color: ACTIVE,
    fontWeight: '800',
    marginTop: 2,
  },
});

export default BottomNav;
