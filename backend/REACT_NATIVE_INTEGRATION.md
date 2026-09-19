# React Native Integration Guide — COGNISAFE-Q Backend

This guide explains how the existing Expo React Native app integrates with the AWS backend.

## Principle: Offline-First + Additive Backend

The mobile app is **local-first**. All backend calls are:
- **Non-blocking** — local state is always updated immediately
- **Graceful** — `null` return from `apiService` means offline; app continues normally
- **Idempotent** — trips use mobile `sessionId` as `tripId`; incidents use `clientIncidentId`

## File Map

| Old file | Status | Change |
|---|---|---|
| `services/alertService.ts` | ✅ Modified | `POST /alert` → `POST /incidents` + offline queue |
| `services/contactService.ts` | ✅ Modified | `POST /contacts` with JWT via `apiService` |
| `services/inferenceService.ts` | ✅ Unchanged | Inference stays on-device |
| `services/sensorService.ts` | ✅ Unchanged | Sensor collection on-device |
| `services/locationService.ts` | ✅ Unchanged | GPS for emergency payload |
| `services/storageService.ts` | ✅ Unchanged | AsyncStorage offline fallback |
| `services/authService.ts` | 🆕 New | Cognito auth (no Amplify) |
| `services/apiService.ts` | 🆕 New | Typed HTTP client with auto-JWT |
| `components/TripContext.tsx` | ✅ Modified | `startTrip`/`stopTrip` sync trips; `sendEmergency` passes confidence |
| `app/(auth)/login.tsx` | ✅ Modified | Real Cognito `signIn` |
| `app/(auth)/signup.tsx` | ✅ Modified | Real Cognito `signUp` + email confirmation step |
| `app/(auth)/forgot-password.tsx` | ✅ Modified | Real Cognito `forgotPassword` / `confirmForgotPassword` |
| `app/_layout.tsx` | ✅ Modified | Auth guard (checks session on mount) |
| `utils/constants.ts` | ✅ Modified | Added Cognito env var exports |

## Environment Setup

After `npx cdk deploy`, add to `artifacts/cognisafe-q/.env`:

```bash
EXPO_PUBLIC_API_GATEWAY_URL=https://xxxx.execute-api.ap-south-1.amazonaws.com
EXPO_PUBLIC_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
EXPO_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_COGNITO_REGION=ap-south-1
```

## Auth Flow

```
User opens app
  → _layout.tsx checks getCurrentSession() (AsyncStorage)
  → Not found → redirect /(auth)/login
  → Cognito signIn(email, password)
  → Stores idToken, accessToken, refreshToken, userId in AsyncStorage
  → Redirect /(tabs)
```

**Token refresh**: `authService.getIdToken()` auto-refreshes using `REFRESH_TOKEN_AUTH` when the 1-hour ID token expires. If refresh fails, user is signed out and redirected to login.

## Emergency Escalation Flow

```
On-device sensor pipeline (UNCHANGED):
  Accelerometer + Gyroscope → 150×6 windows → ML inference
  SAFE → ALERT (countdown) → user doesn't cancel → EMERGENCY

TripContext.sendEmergency() call (MODIFIED):
  → alertService.sendEmergencyAlert({sessionId, location, confidence})
  → POST /incidents {
        tripId: sessionId,
        clientIncidentId: "<sessionId>-<timestamp>",
        status: "EMERGENCY",
        confidence: 0.91,
        location: { latitude, longitude },
        detectedAt: ISO8601
      }
  → Lambda validates + persists incident
  → Queries enabled contacts
  → DEMO_MODE=true: logs to CloudWatch
  → DEMO_MODE=false: SNS SMS to each contact
  → Returns { incidentId, notificationStatus }

If network unavailable:
  → Incident queued in AsyncStorage (@cognisafe/pending_incidents)
  → Auto-retried on next successful API call (flushPendingIncidents)
```

## Trip Sync Flow

```
startTrip():
  → TripContext creates local sessionId (UUID)
  → api.trips.create({ tripId: sessionId, startTime }) — non-blocking
  → Trip begins regardless of backend response

stopTrip():
  → TripContext saves trip to local AsyncStorage trips[]
  → api.trips.update(sessionId, { endTime, duration, distance, ... }) — non-blocking
```

## Contact Sync Flow

```
addContact(contact):
  → Contact saved to AsyncStorage contacts[] immediately (local-first)
  → contactService.syncContact(contact) — non-blocking
  → POST /contacts → returns backend contactId

fetchContacts() on app load:
  → GET /contacts → returns server contacts
  → Merged with local contacts by TripContext
```

## Cognito Auth (No Amplify)

`authService.ts` uses **direct HTTP calls** to Cognito:

```
Endpoint: https://cognito-idp.{region}.amazonaws.com/
Header: X-Amz-Target: AWSCognitoIdentityProviderService.{Operation}
Content-Type: application/x-amz-json-1.1
```

Operations:
- `SignUp` → `confirmSignUp` → email verification
- `InitiateAuth` (USER_PASSWORD_AUTH) → tokens
- `InitiateAuth` (REFRESH_TOKEN_AUTH) → new tokens
- `ForgotPassword` → `ConfirmForgotPassword`

No Amplify library — zero bundle size impact on Expo.

## Testing Without Backend

The app works fully offline without any environment variables set. Set:

```bash
# No .env file needed for offline mode
USE_MOCK_AI=true  # Already default in constants.ts
```

The `apiService` detects missing `EXPO_PUBLIC_API_GATEWAY_URL` and returns `null` for all calls — the app uses AsyncStorage exclusively.
