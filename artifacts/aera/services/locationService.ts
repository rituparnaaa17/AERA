/**
 * locationService.ts — AERA
 *
 * Location utilities for emergency incident creation.
 * Always uses real Expo Location API — never fabricates coordinates.
 */

import * as Location from 'expo-location';

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy?: number;   // meters
  speed?: number;      // m/s
  heading?: number;    // degrees (0-360)
  timestamp: number;   // epoch ms
}

/**
 * Gets the freshest high-accuracy location fix for emergency use.
 * Resolves within ~5 seconds. Returns null if GPS unavailable.
 *
 * IMPORTANT: Never returns fabricated coordinates.
 */
export async function getEmergencyLocationFix(): Promise<LocationFix | null> {
  try {
    // Check permission first
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      speed: loc.coords.speed !== null && loc.coords.speed >= 0
        ? loc.coords.speed
        : undefined,
      heading: loc.coords.heading !== null && loc.coords.heading >= 0
        ? loc.coords.heading
        : undefined,
      timestamp: loc.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Legacy compat — returns simplified {lat, lng} pair.
 * Prefer getEmergencyLocationFix() for full data.
 */
export async function getEmergencyLocation(): Promise<{ lat: number; lng: number } | null> {
  const fix = await getEmergencyLocationFix();
  return fix ? { lat: fix.lat, lng: fix.lng } : null;
}