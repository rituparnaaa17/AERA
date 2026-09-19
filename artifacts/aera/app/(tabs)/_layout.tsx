/**
 * (tabs) group layout — uses the custom floating BottomNav from Batch 3A.
 * All header chrome is off; each tab screen owns its own top bar.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '@/components/BottomNav';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="live" options={{ title: 'SOS' }} />
      <Tabs.Screen name="contacts" options={{ title: 'Contacts' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
