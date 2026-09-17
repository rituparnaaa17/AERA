import { API_GATEWAY_URL } from '@/utils/constants';

export async function sendEmergencyAlert(body: {
  sessionId: string;
  location: { lat: number; lng: number } | null;
  timestamp: string;
  notifyEmergencyServices: boolean;
}) {
  if (!API_GATEWAY_URL) return false;
  try {
    const response = await fetch(`${API_GATEWAY_URL.replace(/\/$/, '')}/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}