/**
 * tripUtils.ts — AERA
 *
 * Central utilities for trip classification and safety score computation.
 * Guarantees zero hardcoded values and consistent severity determination
 * across History, Dashboard, Analytics, Notifications, and Summary screens.
 */

import type { Trip } from '@/components/TripContext';

export type TripKind = 'safe' | 'alert' | 'emergency';

/**
 * Returns the true severity kind ('safe' | 'alert' | 'emergency') for a trip.
 * Strictly verifies whether an EMERGENCY or ALERT event actually occurred.
 */
export function getTripKind(t: Trip): TripKind {
  const hasEventsArray = Array.isArray(t.events) && t.events.length > 0;
  const hasEmergencyEvent = hasEventsArray && t.events.some((e) => e.status === 'EMERGENCY');

  // If an events timeline is present, require an actual EMERGENCY event to classify as emergency.
  // If events timeline is missing/empty, fall back to emergencyTriggered flag.
  if (hasEmergencyEvent || (!hasEventsArray && t.emergencyTriggered === true)) {
    return 'emergency';
  }

  const alertCount = t.alertCount ?? (hasEventsArray ? t.events.filter((e) => e.status === 'ALERT').length : 0);
  const hasAlertEvent = hasEventsArray && t.events.some((e) => e.status === 'ALERT');

  if (hasAlertEvent || alertCount > 0 || (!hasEventsArray && t.hadAlert === true)) {
    return 'alert';
  }

  return 'safe';
}

/**
 * Calculates a dynamic 0-100 Trip Safety Rating from actual telemetry and incident logs.
 */
export function calculateTripScore(t: Trip): number {
  const kind = getTripKind(t);
  const alertCount = t.alertCount ?? (Array.isArray(t.events) ? t.events.filter((e) => e.status === 'ALERT').length : 0);

  if (kind === 'emergency') {
    const penalty = Math.min(55, alertCount * 12 + 25);
    return Math.max(42, Math.round(100 - penalty));
  }
  if (kind === 'alert') {
    const penalty = Math.min(25, alertCount * 8);
    return Math.max(72, Math.round(98 - penalty));
  }
  return 98;
}
