/**
 * apiService.ts — AERA
 *
 * Central HTTP client for all backend API calls.
 * - Reads base URL from EXPO_PUBLIC_API_GATEWAY_URL
 * - Attaches Cognito JWT automatically
 * - Returns null on network failure (preserving offline-first behaviour)
 * - Never throws — callers check for null and use AsyncStorage fallback
 */

import { getIdToken } from './authService';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? ''
).replace(/\/$/, '');

/**
 * Public helper so callers can check whether the API layer is configured
 * before invoking it. When this returns `false` the app is in valid
 * offline-only mode and callers should skip network requests and fall
 * back to local state — no warning spam is emitted.
 */
export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

// ─── Response type ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ─── Internal fetch wrapper ────────────────────────────────────────────────────

async function apiFetch<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  skipAuth = false,
): Promise<ApiResult<T> | null> {
  if (!API_BASE_URL) {
    // Offline-first mode: no API gateway configured. Return null silently
    // so callers can fall back to AsyncStorage / local state. Warning spam
    // here is noise because "no gateway" is a valid, expected state on
    // dev machines and offline installs.
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const idToken = await getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return { success: true, data: undefined as unknown as T };
    }

    const json = (await response.json()) as ApiResult<T>;
    return json;
  } catch (err) {
    console.warn(`[apiService] ${method} ${path} failed:`, err instanceof Error ? err.message : err);
    return null; // Network failure → offline fallback
  }
}

// ─── Public API methods ────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<ApiResult<T> | null> {
  return apiFetch<T>('GET', path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T> | null> {
  return apiFetch<T>('POST', path, body);
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResult<T> | null> {
  return apiFetch<T>('PUT', path, body);
}

export async function apiDelete(path: string): Promise<ApiResult<void> | null> {
  return apiFetch<void>('DELETE', path);
}

// ─── Typed endpoint helpers ────────────────────────────────────────────────────

export const api = {
  health: () => apiFetch<{ status: string; service: string }>('GET', '/health', undefined, true),

  profile: {
    get: () => apiGet<{
      userId: string; email: string; name: string | null; phone: string | null;
    }>('/profile'),
    update: (data: { name?: string; phone?: string }) => apiPut<unknown>('/profile', data),
  },

  contacts: {
    list: () => apiGet<ContactResponse[]>('/contacts'),
    create: (data: CreateContactPayload) => apiPost<ContactResponse>('/contacts', data),
    update: (contactId: string, data: Partial<CreateContactPayload>) =>
      apiPut<ContactResponse>(`/contacts/${contactId}`, data),
    delete: (contactId: string) => apiDelete(`/contacts/${contactId}`),
  },

  trips: {
    list: () => apiGet<TripResponse[]>('/trips'),
    create: (data: CreateTripPayload) => apiPost<TripResponse>('/trips', data),
    update: (tripId: string, data: UpdateTripPayload) => apiPut<TripResponse>(`/trips/${tripId}`, data),
    get: (tripId: string) => apiGet<TripResponse>(`/trips/${tripId}`),
  },

  incidents: {
    list: () => apiGet<IncidentResponse[]>('/incidents'),
    create: (data: CreateIncidentPayload) => apiPost<IncidentResponse>('/incidents', data),
    get: (incidentId: string) => apiGet<IncidentResponse>(`/incidents/${incidentId}`),
  },
};

// ─── Payload + Response types (mirror backend types) ──────────────────────────

export interface ContactResponse {
  contactId: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactPayload {
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priority?: number;
  enabled?: boolean;
}

export interface TripResponse {
  tripId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  distance?: number;
  alertCount?: number;
  emergencyTriggered?: boolean;
  safeWindows?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  tripId: string;       // mobile sessionId
  startTime: string;    // ISO 8601
}

export interface UpdateTripPayload {
  endTime?: string;
  duration?: number;
  distance?: number;
  alertCount?: number;
  emergencyTriggered?: boolean;
  safeWindows?: number;
}

export interface IncidentResponse {
  incidentId: string;
  clientIncidentId?: string;
  userId: string;
  tripId?: string;
  status: 'EMERGENCY' | 'ALERT' | 'RESOLVED';
  confidence: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  detectedAt: string;
  createdAt: string;
  notificationStatus: string;
  notifiedContacts?: number;
}

export interface CreateIncidentPayload {
  tripId?: string;
  clientIncidentId?: string;
  status?: 'EMERGENCY' | 'ALERT';
  confidence: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  };
  detectedAt: string;
}
