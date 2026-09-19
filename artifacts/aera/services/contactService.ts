/**
 * contactService.ts — AERA
 *
 * Syncs emergency contacts with the AWS backend.
 * The app is offline-first — local AsyncStorage is the source of truth.
 * Backend sync is additive and gracefully degrades.
 */

import { api, type CreateContactPayload, type ContactResponse } from './apiService';
import type { Contact } from '@/components/TripContext';

// ─── Type converters ───────────────────────────────────────────────────────────

function backendToLocal(bc: ContactResponse): Contact {
  return {
    id: bc.contactId,      // backend contactId → local id
    name: bc.name,
    phone: bc.phone,
    email: bc.email ?? '',
    // Optional extended fields — mobile UI ignores unknown fields safely
  };
}

function localToBackend(contact: Contact, priority: number): CreateContactPayload {
  return {
    name: contact.name,
    phone: contact.phone,
    email: contact.email || undefined,
    priority,
    enabled: true,
  };
}

// ─── Sync operations ───────────────────────────────────────────────────────────

/**
 * Creates or updates a contact on the backend.
 * Returns the server-assigned contactId, or null if offline.
 *
 * NOTE: The mobile app already has a local id — the backend assigns its own
 * contactId. This dual-ID approach is intentional for offline-first resilience.
 */
export async function syncContact(contact: Contact, priority = 1): Promise<string | null> {
  const payload = localToBackend(contact, priority);
  const result = await api.contacts.create(payload);

  if (result === null) {
    console.warn('[contactService] Offline — contact not synced to backend:', contact.name);
    return null;
  }
  if (!result.success) {
    console.error('[contactService] Failed to sync contact:', result.error);
    return null;
  }

  return result.data.contactId;
}

/**
 * Fetches all contacts from the backend and returns them as local Contact objects.
 * Returns null if offline or error.
 */
export async function fetchContacts(): Promise<Contact[] | null> {
  const result = await api.contacts.list();
  if (result === null || !result.success) return null;
  return result.data.map(backendToLocal);
}

/**
 * Deletes a contact from the backend by server-assigned contactId.
 * The backend contactId may differ from the local id.
 */
export async function deleteContact(contactId: string): Promise<boolean> {
  const result = await api.contacts.delete(contactId);
  if (result === null) {
    console.warn('[contactService] Offline — contact deletion not synced:', contactId);
    return false;
  }
  return result.success;
}