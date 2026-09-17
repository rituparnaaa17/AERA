export const WINDOW_SIZE = 150;
export const STRIDE = 15;
export const TARGET_SENSOR_HZ = 50;
export const DEFAULT_COUNTDOWN_SECONDS = 30;
export const USE_MOCK_AI = true;
export const API_GATEWAY_URL =
  typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_GATEWAY_URL : undefined;