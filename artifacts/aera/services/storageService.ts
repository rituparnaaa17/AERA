import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Contact, Trip } from '@/components/TripContext';

const getKeys = (userId?: string | null) => {
  const ns = userId ? `@aera/${userId}` : '@aera/guest';
  return {
    trips: `${ns}/trips`,
    contacts: `${ns}/contacts`,
    settings: `${ns}/settings`,
  };
};

export async function loadStoredState(userId?: string | null) {
  const keys = getKeys(userId);
  const [trips, contacts, settings] = await Promise.all([
    AsyncStorage.getItem(keys.trips),
    AsyncStorage.getItem(keys.contacts),
    AsyncStorage.getItem(keys.settings),
  ]);
  return {
    trips: trips ? (JSON.parse(trips) as Trip[]) : [],
    contacts: contacts ? (JSON.parse(contacts) as Contact[]) : [],
    settings: settings ? (JSON.parse(settings) as Record<string, unknown>) : {},
  };
}

export async function saveStoredState(
  userId: string | null | undefined,
  data: { trips: Trip[]; contacts: Contact[]; settings: object },
) {
  const keys = getKeys(userId);
  await Promise.all([
    AsyncStorage.setItem(keys.trips, JSON.stringify(data.trips)),
    AsyncStorage.setItem(keys.contacts, JSON.stringify(data.contacts)),
    AsyncStorage.setItem(keys.settings, JSON.stringify(data.settings)),
  ]);
}

export async function clearUserStorage(userId?: string | null) {
  const keys = getKeys(userId);
  await AsyncStorage.multiRemove([keys.trips, keys.contacts, keys.settings]);
}