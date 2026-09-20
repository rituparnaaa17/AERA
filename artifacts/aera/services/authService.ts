/**
 * authService.ts — AERA
 *
 * Amazon Cognito authentication using direct USER_SRP_AUTH / USER_PASSWORD_AUTH
 * HTTP calls. No Amplify, no AWS SDK in Expo. Tokens stored in AsyncStorage.
 *
 * Fallbacks to EXPO_PUBLIC_COGNITO_CLIENT_ID / EXPO_PUBLIC_COGNITO_REGION
 * and deployed stack constants so authentication endpoints are guaranteed to connect.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { COGNITO_CLIENT_ID, COGNITO_REGION } from '@/utils/constants';

// ─── Configuration ─────────────────────────────────────────────────────────────
const REGION = COGNITO_REGION || process.env.EXPO_PUBLIC_COGNITO_REGION || 'ap-south-1';
const CLIENT_ID = COGNITO_CLIENT_ID || process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '15k0dlo5upacipgg1e71l9fsqe';
const COGNITO_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com`;

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  idToken: '@aera/auth/idToken',
  accessToken: '@aera/auth/accessToken',
  refreshToken: '@aera/auth/refreshToken',
  userId: '@aera/auth/userId',
  email: '@aera/auth/email',
  name: '@aera/auth/name',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  userId: string;      // Cognito sub
  email: string;
  /**
   * User's display name — captured at signup and cached from the ID
   * token's `name` claim on every sign-in / refresh.
   */
  name?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// ─── Base64 Safe Decoder ───────────────────────────────────────────────────────
function base64Decode(str: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(str);
    }
  } catch {
    // Fall back to manual base64 decode if atob is unavailable or throws
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  for (let i = 0; i < base64.length; ) {
    const enc1 = chars.indexOf(base64.charAt(i++));
    const enc2 = chars.indexOf(base64.charAt(i++));
    const enc3 = chars.indexOf(base64.charAt(i++));
    const enc4 = chars.indexOf(base64.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }
  return output;
}

// ─── Cognito HTTP helper ───────────────────────────────────────────────────────

async function cognitoRequest(target: string, body: object): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': target,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const rawCode = (data['__type'] as string) ?? (data['code'] as string) ?? '';
      const errorCode = rawCode.includes('#') ? rawCode.split('#').pop()! : rawCode || 'UnknownError';
      const message = (data['message'] as string) ?? (data['Message'] as string) ?? 'An authentication error occurred';
      throw { code: errorCode, message } as AuthError;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if ((err as AuthError)?.code && (err as AuthError).code !== 'UnknownError') {
      throw err;
    }

    const isAbort = (err as Error)?.name === 'AbortError';
    console.error('[cognitoRequest] error:', err);
    throw {
      code: isAbort ? 'AbortError' : 'NetworkError',
      message: isAbort
        ? 'Connection timed out. Please check your internet connection.'
        : err instanceof Error
          ? err.message
          : 'Network request failed to Cognito',
    } as AuthError;
  }
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

export interface SignUpParams {
  name: string;
  password: string;
  verificationMethod: 'email' | 'phone';
  email?: string;
  phone?: string;
}

/**
 * Resolves any user identifier (email or phone) to a Cognito-compliant username.
 */
export function resolveCognitoUsername(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.startsWith('+') || /^\+?\d[\d\s\-\(\)]{7,}$/.test(trimmed)) {
    const e164 = normalizePhoneNumber(trimmed);
    const digits = e164.replace(/\D/g, '');
    return `${digits}@phone.aera.app`;
  }
  return trimmed.toLowerCase();
}

/**
 * Sign up a new user using EITHER email OR phone number verification.
 * The user verifies ONLY ONE contact method via Cognito OTP.
 */
export async function signUp(params: SignUpParams): Promise<{ nextStep: 'CONFIRM_SIGN_UP' }> {
  const { name, password, verificationMethod, email, phone } = params;

  let cognitoUsername = '';
  const userAttributes: Array<{ Name: string; Value: string }> = [
    { Name: 'name', Value: name.trim() },
  ];

  if (verificationMethod === 'email') {
    if (!email?.trim()) throw { code: 'InvalidParameterException', message: 'Email address is required.' } as AuthError;
    cognitoUsername = email.trim().toLowerCase();
    userAttributes.push({ Name: 'email', Value: cognitoUsername });
  } else {
    if (!phone?.trim()) throw { code: 'InvalidParameterException', message: 'Phone number is required.' } as AuthError;
    const formattedPhone = normalizePhoneNumber(phone.trim());
    cognitoUsername = resolveCognitoUsername(formattedPhone);
    userAttributes.push({ Name: 'phone_number', Value: formattedPhone });
    userAttributes.push({ Name: 'email', Value: cognitoUsername });
  }

  await cognitoRequest('AWSCognitoIdentityProviderService.SignUp', {
    ClientId: CLIENT_ID,
    Username: cognitoUsername,
    Password: password,
    UserAttributes: userAttributes,
  });

  return { nextStep: 'CONFIRM_SIGN_UP' };
}

/**
 * Confirm verification code (email OTP or SMS OTP) sent after signUp.
 * Fallbacks to E.164 phone username if synthetic phone email username is not found.
 */
export async function confirmSignUp(identifier: string, code: string): Promise<void> {
  const cognitoUsername = resolveCognitoUsername(identifier);
  try {
    await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmSignUp', {
      ClientId: CLIENT_ID,
      Username: cognitoUsername,
      ConfirmationCode: code.trim(),
    });
  } catch (err) {
    const isPhone = identifier.trim().startsWith('+') || /^\+?\d[\d\s\-\(\)]{7,}$/.test(identifier.trim());
    if (isPhone && (err as AuthError)?.code === 'UserNotFoundException') {
      const rawPhone = normalizePhoneNumber(identifier.trim());
      if (rawPhone !== cognitoUsername) {
        await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmSignUp', {
          ClientId: CLIENT_ID,
          Username: rawPhone,
          ConfirmationCode: code.trim(),
        });
        return;
      }
    }
    throw err;
  }
}

/**
 * Resend verification code to user's selected contact method (email or phone).
 */
export async function resendConfirmationCode(identifier: string): Promise<void> {
  const cognitoUsername = resolveCognitoUsername(identifier);
  try {
    await cognitoRequest('AWSCognitoIdentityProviderService.ResendConfirmationCode', {
      ClientId: CLIENT_ID,
      Username: cognitoUsername,
    });
  } catch (err) {
    const isPhone = identifier.trim().startsWith('+') || /^\+?\d[\d\s\-\(\)]{7,}$/.test(identifier.trim());
    if (isPhone && (err as AuthError)?.code === 'UserNotFoundException') {
      const rawPhone = normalizePhoneNumber(identifier.trim());
      if (rawPhone !== cognitoUsername) {
        await cognitoRequest('AWSCognitoIdentityProviderService.ResendConfirmationCode', {
          ClientId: CLIENT_ID,
          Username: rawPhone,
        });
        return;
      }
    }
    throw err;
  }
}

/**
 * Sign in with email or phone number and password using USER_PASSWORD_AUTH.
 * Tries synthetic username first, and falls back to E.164 phone number if UserNotFound.
 */
export async function signIn(identifier: string, password: string): Promise<AuthSession> {
  const cognitoUsername = resolveCognitoUsername(identifier);

  try {
    return await executeSignIn(cognitoUsername, password, identifier);
  } catch (err) {
    const isPhone = identifier.trim().startsWith('+') || /^\+?\d[\d\s\-\(\)]{7,}$/.test(identifier.trim());
    if (isPhone && (err as AuthError)?.code === 'UserNotFoundException') {
      const rawPhone = normalizePhoneNumber(identifier.trim());
      if (rawPhone !== cognitoUsername) {
        return await executeSignIn(rawPhone, password, identifier);
      }
    }
    throw err;
  }
}

async function executeSignIn(username: string, password: string, originalIdentifier: string): Promise<AuthSession> {
  const data = await cognitoRequest('AWSCognitoIdentityProviderService.InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  const result = data['AuthenticationResult'] as Record<string, string>;
  if (!result) {
    throw { code: 'AuthenticationFailed', message: 'Authentication did not return tokens' } as AuthError;
  }

  const idToken = result['IdToken'] ?? '';
  const claims = decodeJwtClaims(idToken);
  const userId = (claims['sub'] as string) ?? '';
  const nameClaim = (claims['name'] as string | undefined)?.trim();

  const session: AuthSession = {
    idToken,
    accessToken: result['AccessToken'] ?? '',
    refreshToken: result['RefreshToken'] ?? '',
    userId,
    email: originalIdentifier.trim(),
    name: nameClaim && nameClaim.length ? nameClaim : undefined,
  };

  await storeSession(session);
  return session;
}

/**
 * Normalizes phone numbers to E.164 format. Defaults to +91 if no country code provided.
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
  return `+${cleaned}`;
}

/**
 * Sign out — clears all stored tokens.
 */
export async function signOut(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

/**
 * Initiate forgot-password flow — sends a verification code to the user's email or phone.
 */
export async function forgotPassword(identifier: string): Promise<void> {
  const cognitoUsername = resolveCognitoUsername(identifier);
  try {
    await cognitoRequest('AWSCognitoIdentityProviderService.ForgotPassword', {
      ClientId: CLIENT_ID,
      Username: cognitoUsername,
    });
  } catch (err) {
    const isPhone = identifier.trim().startsWith('+') || /^\+?\d[\d\s\-\(\)]{7,}$/.test(identifier.trim());
    if (isPhone && (err as AuthError)?.code === 'UserNotFoundException') {
      const rawPhone = normalizePhoneNumber(identifier.trim());
      if (rawPhone !== cognitoUsername) {
        await cognitoRequest('AWSCognitoIdentityProviderService.ForgotPassword', {
          ClientId: CLIENT_ID,
          Username: rawPhone,
        });
        return;
      }
    }
    throw err;
  }
}

/**
 * Complete forgot-password flow — confirms new password with the verification code.
 */
export async function confirmForgotPassword(
  identifier: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const cognitoUsername = resolveCognitoUsername(identifier);
  try {
    await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmForgotPassword', {
      ClientId: CLIENT_ID,
      Username: cognitoUsername,
      ConfirmationCode: code.trim(),
      Password: newPassword,
    });
  } catch (err) {
    const isPhone = identifier.trim().startsWith('+') || /^\+?\d[\d\s\-\(\)]{7,}$/.test(identifier.trim());
    if (isPhone && (err as AuthError)?.code === 'UserNotFoundException') {
      const rawPhone = normalizePhoneNumber(identifier.trim());
      if (rawPhone !== cognitoUsername) {
        await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmForgotPassword', {
          ClientId: CLIENT_ID,
          Username: rawPhone,
          ConfirmationCode: code.trim(),
          Password: newPassword,
        });
        return;
      }
    }
    throw err;
  }
}

/**
 * Returns the current session from AsyncStorage.
 * Returns null if not authenticated.
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const [idToken, accessToken, refreshToken, userId, email, name] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.idToken),
    AsyncStorage.getItem(STORAGE_KEYS.accessToken),
    AsyncStorage.getItem(STORAGE_KEYS.refreshToken),
    AsyncStorage.getItem(STORAGE_KEYS.userId),
    AsyncStorage.getItem(STORAGE_KEYS.email),
    AsyncStorage.getItem(STORAGE_KEYS.name),
  ]);

  if (!idToken || !accessToken || !userId) return null;

  return {
    idToken,
    accessToken,
    refreshToken: refreshToken ?? '',
    userId,
    email: email ?? '',
    name: name ?? undefined,
  };
}

/**
 * Returns the current ID token for API Authorization headers.
 * Attempts token refresh if expired.
 */
export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  if (isTokenExpired(session.idToken)) {
    try {
      const refreshed = await refreshSession(session.refreshToken, session.email);
      return refreshed.idToken;
    } catch {
      await signOut();
      return null;
    }
  }

  return session.idToken;
}

/**
 * Refresh tokens using the stored refresh token.
 */
export async function refreshSession(
  refreshToken: string,
  email: string,
): Promise<AuthSession> {
  const data = await cognitoRequest('AWSCognitoIdentityProviderService.InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const result = data['AuthenticationResult'] as Record<string, string>;
  const session = await getCurrentSession();

  const nextIdToken = result['IdToken'] ?? '';
  const nextClaims = decodeJwtClaims(nextIdToken);
  const nextName = (nextClaims['name'] as string | undefined)?.trim();

  const updated: AuthSession = {
    idToken: nextIdToken,
    accessToken: result['AccessToken'] ?? '',
    refreshToken: result['RefreshToken'] ?? session?.refreshToken ?? '',
    userId: session?.userId ?? (nextClaims['sub'] as string) ?? '',
    email,
    // Prefer the refreshed claim, then the last cached name.
    name: (nextName && nextName.length ? nextName : session?.name) ?? undefined,
  };

  await storeSession(updated);
  return updated;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function storeSession(session: AuthSession): Promise<void> {
  const pairs: [string, string][] = [
    [STORAGE_KEYS.idToken, session.idToken],
    [STORAGE_KEYS.accessToken, session.accessToken],
    [STORAGE_KEYS.refreshToken, session.refreshToken],
    [STORAGE_KEYS.userId, session.userId],
    [STORAGE_KEYS.email, session.email],
  ];
  if (session.name) pairs.push([STORAGE_KEYS.name, session.name]);
  await AsyncStorage.multiSet(pairs);
}

/**
 * Decode a Cognito ID/access token's payload. Returns an empty object if
 * the token isn't a valid three-segment JWT.
 */
function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payloadStr = base64Decode(parts[1]!);
    return JSON.parse(payloadStr) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Kept as a small convenience for callers that only need `sub`.
function decodeJwtSub(token: string): string {
  return (decodeJwtClaims(token)['sub'] as string) ?? '';
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadStr = base64Decode(parts[1]!);
    const payload = JSON.parse(payloadStr) as Record<string, unknown>;
    const exp = payload['exp'] as number;
    return Date.now() / 1000 > exp - 60;
  } catch {
    return true;
  }
}

/**
 * Maps Cognito error codes to user-friendly messages.
 */
export function mapCognitoError(error: unknown): string {
  if (!error) return 'An unknown error occurred.';

  const errObj = typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const code = (errObj['code'] as string) || (errObj['name'] as string) || '';
  const rawMsg = String(errObj['message'] || error);

  if (
    code === 'NetworkError' ||
    code === 'AbortError' ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('Network request failed') ||
    rawMsg.includes('Failed to fetch') ||
    rawMsg.includes('NetworkError')
  ) {
    return 'Unable to connect to authentication server. Please check your internet connection and try again.';
  }

  const messages: Record<string, string> = {
    UserNotFoundException: 'No account found with this email or phone number.',
    NotAuthorizedException: 'Incorrect email/phone number or password.',
    UserNotConfirmedException: 'Account unverified. Please check your email or phone for verification code.',
    UsernameExistsException: 'An account with this email or phone already exists.',
    CodeMismatchException: 'Invalid verification code. Please check and try again.',
    ExpiredCodeException: 'Verification code has expired. Please request a new one.',
    LimitExceededException: 'Too many attempts. Please try again in a few minutes.',
    InvalidPasswordException: (errObj['message'] as string) ?? 'Password does not meet requirements.',
    InvalidParameterException: (errObj['message'] as string) ?? 'Invalid input parameters.',
  };

  return messages[code] ?? (errObj['message'] as string) ?? 'Authentication failed. Please try again.';
}
