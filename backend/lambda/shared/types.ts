/**
 * Shared TypeScript types used across all Lambda handlers.
 * These mirror the mobile app's data structures from TripContext.tsx.
 */

// ─── DynamoDB Table Item Types ───────────────────────────────────────────────

export interface UserItem {
  userId: string;        // Cognito sub (canonical user ID)
  email: string;
  name?: string;
  phone?: string;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}

export interface ContactItem {
  contactId: string;     // uuid generated server-side
  userId: string;        // Cognito sub — ownership key
  name: string;
  phone: string;
  email?: string;        // optional — matches mobile Contact.email
  relationship?: string;
  priority: number;      // 1 = primary, 2 = secondary, etc.
  enabled: boolean;      // false = won't receive SNS notifications
  createdAt: string;
  updatedAt: string;
}

export interface TripItem {
  tripId: string;        // mobile sessionId (client-generated)
  userId: string;
  startTime: string;     // ISO 8601
  endTime?: string;      // set on PUT /trips/{tripId}
  duration?: number;     // seconds
  distance?: number;     // km
  alertCount?: number;
  emergencyTriggered?: boolean;
  safeWindows?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentItem {
  incidentId: string;    // uuid generated server-side
  clientIncidentId?: string; // idempotency key from mobile
  userId: string;
  tripId?: string;
  status: 'EMERGENCY' | 'ALERT' | 'RESOLVED';
  confidence: number;    // 0.0–1.0
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  detectedAt: string;    // ISO 8601 — when mobile detected the incident
  createdAt: string;     // ISO 8601 — when backend received it
  resolvedAt?: string;
  notificationStatus: 'PROCESSING' | 'SENT' | 'FAILED' | 'NO_CONTACTS' | 'DEMO';
  notificationTimestamp?: string;
  notifiedContacts?: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Notification Status ──────────────────────────────────────────────────────

export type NotificationStatus = IncidentItem['notificationStatus'];

// ─── Lambda Event Context ─────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  email?: string;
}
