import { API_GATEWAY_URL, USE_MOCK_AI } from '@/utils/constants';

export type PredictionStatus = 'SAFE' | 'ALERT' | 'EMERGENCY';
export type PredictionResult = { status: PredictionStatus; confidence: number };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function predictSensorWindow(
  window: number[][],
  sessionId: string,
  useMockAi = USE_MOCK_AI,
): Promise<PredictionResult | null> {
  if (useMockAi) {
    await wait(420 + Math.round(Math.random() * 260));
    return { status: 'SAFE', confidence: 0.96 };
  }
  if (!API_GATEWAY_URL) return null;
  try {
    const response = await fetch(`${API_GATEWAY_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, timestamp: new Date().toISOString(), window }),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as Partial<PredictionResult>;
    if (!result.status || !['SAFE', 'ALERT', 'EMERGENCY'].includes(result.status)) return null;
    return { status: result.status, confidence: typeof result.confidence === 'number' ? result.confidence : 0 };
  } catch {
    return null;
  }
}

export async function simulatePrediction(status: PredictionStatus): Promise<PredictionResult> {
  await wait(350);
  return {
    status,
    confidence: status === 'SAFE' ? 0.96 : status === 'ALERT' ? 0.89 : 0.97,
  };
}