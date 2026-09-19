export const WINDOW_SIZE = 150;
export const STRIDE = 15;
export const TARGET_SENSOR_HZ = 50;
export const DEFAULT_COUNTDOWN_SECONDS = 30;
// Real sensor-based detection is the default.
// Mock AI can be enabled via Settings → Developer → Mock AI toggle.
// When false: ML API call is made (advisory, may return null if no /predict endpoint).
// Detection engine (rolling window + risk scoring) runs regardless of this flag.
export const USE_MOCK_AI = false;

// ─── AWS Backend Configuration ────────────────────────────────────────────────
// Set these in your .env file after running `npx cdk deploy`
export const API_GATEWAY_URL =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_GATEWAY_URL : undefined;

export const COGNITO_USER_POOL_ID =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID : undefined;

export const COGNITO_CLIENT_ID =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID : undefined;

export const COGNITO_REGION =
  typeof process !== 'undefined' ? (process.env.EXPO_PUBLIC_COGNITO_REGION ?? 'ap-south-1') : 'ap-south-1';