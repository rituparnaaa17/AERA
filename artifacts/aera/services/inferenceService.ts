/**
 * inferenceService.ts — AERA
 *
 * ML inference for sensor window analysis.
 *
 * ARCHITECTURE NOTE:
 *   The ML inference call is ADVISORY ONLY. The primary crash detection is
 *   the rolling-window risk scoring engine in TripContext.tsx. The inference
 *   result may influence confidence display but NEVER directly triggers SOS.
 *
 * WHEN mockAi = false (default):
 *   Calls the /predict endpoint on the AWS API Gateway. Returns null if
 *   the endpoint is unavailable (the current backend has no /predict Lambda,
 *   so this will always return null — which is handled gracefully).
 *
 * WHEN mockAi = true (Settings → Developer → Mock AI):
 *   Returns a fixed SAFE result with 0.96 confidence. Use only for demos.
 *   Never enable in a real safety scenario.
 */

import { API_GATEWAY_URL, USE_MOCK_AI } from '@/utils/constants';

export type PredictionStatus = 'SAFE' | 'ALERT' | 'EMERGENCY';
export type PredictionResult = { status: PredictionStatus; confidence: number };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function predictSensorWindow(
  window: number[][],
  sessionId: string,
  useMockAi = USE_MOCK_AI,
): Promise<PredictionResult | null> {
  // Mock mode: only for controlled demo presentations.
  // Should never be active in a real safety scenario.
  if (useMockAi) {
    await wait(400); // Simulate network delay
    return { status: 'SAFE', confidence: 0.96 };
  }

  // Real mode: call the /predict endpoint if configured.
  if (!API_GATEWAY_URL) {
    console.warn('[inferenceService] No API_GATEWAY_URL configured. ML inference unavailable.');
    return null;
  }

  try {
    const response = await fetch(`${API_GATEWAY_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, timestamp: new Date().toISOString(), window }),
    });
    if (!response.ok) {
      console.warn(`[inferenceService] /predict returned ${response.status}`);
      return null;
    }
    const result = (await response.json()) as Partial<PredictionResult>;
    if (!result.status || !['SAFE', 'ALERT', 'EMERGENCY'].includes(result.status)) {
      console.warn('[inferenceService] Invalid /predict response shape:', result);
      return null;
    }
    return {
      status: result.status,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
    };
  } catch (err) {
    // Network failure — this is expected when /predict is not deployed.
    // The primary detection engine in TripContext continues independently.
    console.warn('[inferenceService] /predict network error (advisory ML unavailable):', err);
    return null;
  }
}

/**
 * Simulate a specific prediction — development/demo only.
 * Never call this in the production safety pipeline.
 */
export async function simulatePrediction(status: PredictionStatus): Promise<PredictionResult> {
  await wait(350);
  return {
    status,
    confidence: status === 'SAFE' ? 0.96 : status === 'ALERT' ? 0.89 : 0.97,
  };
}