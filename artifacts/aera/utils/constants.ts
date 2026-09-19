export const WINDOW_SIZE = 150;
export const STRIDE = 15;
export const TARGET_SENSOR_HZ = 50;
export const DEFAULT_COUNTDOWN_SECONDS = 30;
export const USE_MOCK_AI = true;

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