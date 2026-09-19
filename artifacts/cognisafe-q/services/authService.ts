/**
 * authService.ts — COGNISAFE-Q
 *
 * Amazon Cognito authentication using direct USER_SRP_AUTH / USER_PASSWORD_AUTH
 * HTTP calls. No Amplify, no AWS SDK in Expo. Tokens stored in AsyncStorage.
 *
 * Set these environment variables in your .env file:
 *   EXPO_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
 *   EXPO_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   EXPO_PUBLIC_COGNITO_REGION=ap-south-1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration (injected at build time via Expo env vars) ─────────────────
const REGION = process.env.EXPO_PUBLIC_COGNITO_REGION ?? 'ap-south-1';
const CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const COGNITO_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  idToken: '@cognisafe/auth/idToken',
  accessToken: '@cognisafe/auth/accessToken',
  refreshToken: '@cognisafe/auth/refreshToken',
  userId: '@cognisafe/auth/userId',
  email: '@cognisafe/auth/email',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  userId: string;      // Cognito sub
  email: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// ─── Cognito HTTP helper ───────────────────────────────────────────────────────

async function cognitoRequest(target: string, body: object): Promise<Record<string, unknown>> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': target,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const errorCode = (data['__type'] as string) ?? 'UnknownError';
    const message = (data['message'] as string) ?? 'An authentication error occurred';
    throw { code: errorCode, message } as AuthError;
  }

  return data;
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

/**
 * Sign up a new user.
 * Returns: 'CONFIRM_SIGN_UP' — user needs to verify email.
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  phone?: string,
): Promise<{ nextStep: 'CONFIRM_SIGN_UP' }> {
  const userAttributes: Array<{ Name: string; Value: string }> = [
    { Name: 'email', Value: email },
    { Name: 'name', Value: name },
  ];
  if (phone) {
    userAttributes.push({ Name: 'phone_number', Value: phone });
  }

  await cognitoRequest('AWSCognitoIdentityProviderService.SignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: userAttributes,
  });

  return { nextStep: 'CONFIRM_SIGN_UP' };
}

/**
 * Confirm email verification code sent after signUp.
 */
export async function confirmSignUp(email: string, code: string): Promise<void> {
  await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  });
}

/**
 * Resend the email verification code.
 */
export async function resendConfirmationCode(email: string): Promise<void> {
  await cognitoRequest('AWSCognitoIdentityProviderService.ResendConfirmationCode', {
    ClientId: CLIENT_ID,
    Username: email,
  });
}

/**
 * Sign in with email and password using USER_PASSWORD_AUTH.
 * Stores tokens in AsyncStorage.
 */
export async function signIn(email: string, password: string): Promise<AuthSession> {
  const data = await cognitoRequest('AWSCognitoIdentityProviderService.InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const result = data['AuthenticationResult'] as Record<string, string>;
  if (!result) {
    throw { code: 'AuthenticationFailed', message: 'Authentication did not return tokens' } as AuthError;
  }

  // Decode the sub (userId) from the ID token
  const userId = decodeJwtSub(result['IdToken'] ?? '');

  const session: AuthSession = {
    idToken: result['IdToken'] ?? '',
    accessToken: result['AccessToken'] ?? '',
    refreshToken: result['RefreshToken'] ?? '',
    userId,
    email,
  };

  await storeSession(session);
  return session;
}

/**
 * Sign out — clears all stored tokens.
 */
export async function signOut(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

/**
 * Initiate forgot-password flow — sends a verification code to the user's email.
 */
export async function forgotPassword(email: string): Promise<void> {
  await cognitoRequest('AWSCognitoIdentityProviderService.ForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
  });
}

/**
 * Complete forgot-password flow — confirms new password with the verification code.
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await cognitoRequest('AWSCognitoIdentityProviderService.ConfirmForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
}

/**
 * Returns the current session from AsyncStorage.
 * Returns null if not authenticated.
 * Does NOT automatically refresh tokens — call refreshSession() if needed.
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const [idToken, accessToken, refreshToken, userId, email] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.idToken),
    AsyncStorage.getItem(STORAGE_KEYS.accessToken),
    AsyncStorage.getItem(STORAGE_KEYS.refreshToken),
    AsyncStorage.getItem(STORAGE_KEYS.userId),
    AsyncStorage.getItem(STORAGE_KEYS.email),
  ]);

  if (!idToken || !accessToken || !userId) return null;

  return {
    idToken,
    accessToken,
    refreshToken: refreshToken ?? '',
    userId,
    email: email ?? '',
  };
}

/**
 * Returns the current ID token for API Authorization headers.
 * Attempts token refresh if expired.
 * Returns null if not authenticated.
 */
export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  // Check if token is expired (Cognito tokens are 1-hour JWTs)
  if (isTokenExpired(session.idToken)) {
    try {
      const refreshed = await refreshSession(session.refreshToken, session.email);
      return refreshed.idToken;
    } catch {
      // Refresh failed — user needs to re-authenticate
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

  const updated: AuthSession = {
    idToken: result['IdToken'] ?? '',
    accessToken: result['AccessToken'] ?? '',
    refreshToken: result['RefreshToken'] ?? session?.refreshToken ?? '',
    userId: session?.userId ?? decodeJwtSub(result['IdToken'] ?? ''),
    email,
  };

  await storeSession(updated);
  return updated;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function storeSession(session: AuthSession): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.idToken, session.idToken],
    [STORAGE_KEYS.accessToken, session.accessToken],
    [STORAGE_KEYS.refreshToken, session.refreshToken],
    [STORAGE_KEYS.userId, session.userId],
    [STORAGE_KEYS.email, session.email],
  ]);
}

function decodeJwtSub(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(atob(parts[1]!)) as Record<string, unknown>;
    return (payload['sub'] as string) ?? '';
  } catch {
    return '';
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]!)) as Record<string, unknown>;
    const exp = payload['exp'] as number;
    // Add 60-second buffer
    return Date.now() / 1000 > exp - 60;
  } catch {
    return true;
  }
}

/**
 * Maps Cognito error codes to user-friendly messages.
 */
export function mapCognitoError(error: unknown): string {
  const err = error as AuthError;
  const code = err?.code ?? '';

  const messages: Record<string, string> = {
    UserNotFoundException: 'No account found with this email address.',
    NotAuthorizedException: 'Incorrect email or password.',
    UserNotConfirmedException: 'Please verify your email before signing in.',
    UsernameExistsException: 'An account with this email already exists.',
    CodeMismatchException: 'Invalid verification code. Please try again.',
    ExpiredCodeException: 'This code has expired. Please request a new one.',
    LimitExceededException: 'Too many attempts. Please try again later.',
    InvalidPasswordException: err?.message ?? 'Password does not meet requirements.',
    InvalidParameterException: err?.message ?? 'Invalid input. Please check your details.',
    NetworkError: 'Network error. Please check your connection.',
  };

  return messages[code] ?? err?.message ?? 'Authentication failed. Please try again.';
}
