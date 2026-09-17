import { API_GATEWAY_URL } from '@/utils/constants';
import type { Contact } from '@/components/TripContext';

export async function syncContact(contact: Contact) {
  if (!API_GATEWAY_URL) return false;
  try {
    const response = await fetch(`${API_GATEWAY_URL.replace(/\/$/, '')}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    return response.ok;
  } catch {
    return false;
  }
}