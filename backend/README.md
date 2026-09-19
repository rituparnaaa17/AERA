# AERA Backend — AWS Serverless

Production-grade serverless backend for the AERA mobile safety application.

## Architecture

```
React Native (Expo) + TypeScript
         │
         │ HTTPS + Cognito Bearer JWT
         ▼
Amazon API Gateway HTTP API (ap-south-1)
         │
    JWT Authorizer (Cognito User Pool)
         │
         ▼
AWS Lambda (Node.js 20 ARM64 TypeScript)
    │              │
    ▼              ▼
DynamoDB        SNS → SMS (DEMO_MODE → CloudWatch)
```

## Design Principles

- **Device-first**: All sensor processing, ML inference, and the SAFE → ALERT → EMERGENCY state machine run on-device.
- **Additive backend**: Backend sync is additive and non-blocking. The app remains fully functional offline.
- **JWT.sub as userId**: `userId` is ALWAYS derived from `JWT.sub` in Lambda — never trusted from request body.
- **Idempotency**: Incidents use `clientIncidentId` to prevent duplicates on retry.
- **Least privilege IAM**: Each Lambda has only the DynamoDB/SNS permissions it needs.

## DynamoDB Tables

| Table | PK | GSIs |
|---|---|---|
| `aera-users` | `userId` (Cognito sub) | — |
| `aera-contacts` | `contactId` | `userId-index` |
| `aera-trips` | `tripId` (mobile sessionId) | `userId-index` |
| `aera-incidents` | `incidentId` | `userId-index`, `clientId-index` |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| GET | `/profile` | JWT | Get/auto-create user profile |
| PUT | `/profile` | JWT | Update name/phone |
| GET | `/contacts` | JWT | List contacts (sorted by priority) |
| POST | `/contacts` | JWT | Create contact |
| PUT | `/contacts/{contactId}` | JWT | Update contact |
| DELETE | `/contacts/{contactId}` | JWT | Delete contact |
| POST | `/trips` | JWT | Create trip (idempotent via tripId) |
| GET | `/trips` | JWT | List last 30 trips |
| PUT | `/trips/{tripId}` | JWT | Update trip (end time, stats) |
| POST | `/incidents` | JWT | Escalate emergency + trigger SNS |
| GET | `/incidents` | JWT | List last 50 incidents |
| GET | `/incidents/{incidentId}` | JWT | Get specific incident |

> **NOT CREATED**: `/predict` — all ML inference stays on-device.

## Prerequisites

```bash
npm install -g aws-cdk
aws configure  # Set credentials + region (ap-south-1)
npm install
```

## Deployment

```bash
# First-time CDK bootstrap (once per account/region)
npx cdk bootstrap

# Synth — generates CloudFormation template (no deployment)
npm run synth

# Deploy all resources
npm run deploy
```

After deployment, CDK prints:
```
Outputs:
  AeraStack.ApiBaseUrl           = https://xxxx.execute-api.ap-south-1.amazonaws.com
  AeraStack.UserPoolId           = ap-south-1_XXXXXXXXX
  AeraStack.UserPoolClientId     = xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  AeraStack.EmergencyTopicArn    = arn:aws:sns:ap-south-1:...
```

Copy these values to:
- `backend/.env` → `DEMO_MODE=true`
- `artifacts/aera/.env` → see `.env.example`

## Environment Variables

| Variable | Description |
|---|---|
| `DEMO_MODE` | `true` = log to CloudWatch only (no real SMS). Set `false` after DLT registration. |
| `USERS_TABLE` | Auto-injected by CDK |
| `CONTACTS_TABLE` | Auto-injected by CDK |
| `TRIPS_TABLE` | Auto-injected by CDK |
| `INCIDENTS_TABLE` | Auto-injected by CDK |
| `SNS_TOPIC_ARN` | Auto-injected by CDK |

## Testing

```bash
npm run test          # Jest unit tests
npm run typecheck     # TypeScript type check
npm run synth         # CDK CloudFormation synthesis
```

## SMS Notifications (Production)

DEMO_MODE logs notifications to CloudWatch. For real SMS:

1. Complete [Indian DLT registration](https://www.trai.gov.in/sites/default/files/RegulationUcc19072018.pdf)
2. Register a sender ID (e.g., `AERA`) with your telecom operator
3. Set `DEMO_MODE=false` in `backend/.env` and redeploy
4. SNS sends transactional SMS to all enabled emergency contacts

## Destroy

```bash
npx cdk destroy
```

> **Warning**: Tables have `RemovalPolicy.RETAIN` — data is NOT deleted on stack destroy.
> Delete tables manually if needed.
