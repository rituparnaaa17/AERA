/**
 * alertService.ts — AERA
 *
 * Handles escalation of confirmed emergencies to the AWS backend.
 *
 * IMPORTANT: This service is called AFTER the mobile decision engine has already:
 *   - run inference on sensor windows
 *   - run the DETECT → VERIFY → PROTECT flow
 *   - completed the countdown
 *
 * The backend receives only the final escalation signal — never raw sensor data.
 *
 * OFFLINE BEHAVIOUR:
 *   If the network is unavailable, the incident is queued in AsyncStorage
 *   and retried automatically when the network returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type CreateIncidentPayload } from './apiService';

const PENDING_INCIDENTS_KEY = '@aera/pending_incidents';

export interface EmergencyAlertParams {
  sessionId: string;
  location: { lat: number; lng: number } | null;
  timestamp: string;
  notifyEmergencyServices: boolean;
  confidence?: number;
}

interface PendingIncident {
  payload: CreateIncidentPayload;
  queuedAt: string;
}

/**
 * Sends an emergency escalation to POST /incidents.
 * Falls back to local queue if network unavailable.
 *
 * REPLACES the old POST /alert endpoint.
 */
export async function sendEmergencyAlert(params: EmergencyAlertParams): Promise<boolean> {
  const clientIncidentId = `${params.sessionId}-${Date.now()}`;

  const payload: CreateIncidentPayload = {
    tripId: params.sessionId,
    clientIncidentId,
    status: 'EMERGENCY',
    confidence: params.confidence ?? 0.91,
    location: params.location
      ? {
          latitude: params.location.lat,
          longitude: params.location.lng,
        }
      : undefined,
    detectedAt: params.timestamp,
  };

  // Try to send to backend
  const result = await api.incidents.create(payload);

  if (result === null) {
    // Network unavailable — queue for retry
    await queuePendingIncident(payload);
    console.warn('[alertService] Backend unavailable. Incident queued for retry.');
    return false;
  }

  if (!result.success) {
    console.error('[alertService] Backend rejected incident:', result.error);
    return false;
  }

  // Success — try to flush any previously queued incidents
  void flushPendingIncidents();

  console.log('[alertService] Emergency incident created:', result.data.incidentId);
  return true;
}

// ─── Offline queue ────────────────────────────────────────────────────────────

async function queuePendingIncident(payload: CreateIncidentPayload): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_INCIDENTS_KEY);
    const queue: PendingIncident[] = existing ? (JSON.parse(existing) as PendingIncident[]) : [];

    // Avoid duplicates via clientIncidentId
    if (payload.clientIncidentId && queue.some((i) => i.payload.clientIncidentId === payload.clientIncidentId)) {
      return;
    }

    queue.push({ payload, queuedAt: new Date().toISOString() });
    // Keep max 10 pending incidents
    const trimmed = queue.slice(-10);
    await AsyncStorage.setItem(PENDING_INCIDENTS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('[alertService] Failed to queue incident:', err);
  }
}

/**
 * Retry sending any pending incidents that failed due to network issues.
 * Call this when network connectivity is restored.
 */
export async function flushPendingIncidents(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_INCIDENTS_KEY);
    if (!existing) return;

    const queue: PendingIncident[] = JSON.parse(existing) as PendingIncident[];
    if (queue.length === 0) return;

    const remaining: PendingIncident[] = [];

    for (const item of queue) {
      const result = await api.incidents.create(item.payload);
      if (result === null || !result.success) {
        remaining.push(item);
      } else {
        console.log('[alertService] Flushed queued incident:', result.data.incidentId);
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(PENDING_INCIDENTS_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(PENDING_INCIDENTS_KEY);
    }
  } catch (err) {
    console.error('[alertService] Failed to flush pending incidents:', err);
  }
}