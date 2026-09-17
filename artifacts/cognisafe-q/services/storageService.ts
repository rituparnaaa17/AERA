import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Contact, Trip } from '@/components/TripContext';

const KEYS = {
  trips: '@cognisafe/trips',
  contacts: '@cognisafe/contacts',
  settings: '@cognisafe/settings',
};

export async function loadStoredState() {
  const [trips, contacts, settings] = await Promise.all([
    AsyncStorage.getItem(KEYS.trips),
    AsyncStorage.getItem(KEYS.contacts),
    AsyncStorage.getItem(KEYS.settings),
  ]);
  return {
    trips: trips ? (JSON.parse(trips) as Trip[]) : [],
    contacts: contacts ? (JSON.parse(contacts) as Contact[]) : [],
    settings: settings ? (JSON.parse(settings) as Record<string, unknown>) : {},
  };
}

export async function saveStoredState(data: { trips: Trip[]; contacts: Contact[]; settings: object }) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.trips, JSON.stringify(data.trips)),
    AsyncStorage.setItem(KEYS.contacts, JSON.stringify(data.contacts)),
    AsyncStorage.setItem(KEYS.settings, JSON.stringify(data.settings)),
  ]);
}