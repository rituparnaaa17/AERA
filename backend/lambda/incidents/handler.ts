import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { extractAuth, parseBody } from '../shared/auth';
import { dbGet, dbPut, dbUpdate, dbQuery, TABLES } from '../shared/dynamo';
import {
  ok,
  created,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  badRequest,
} from '../shared/response';
import { validate, CreateIncidentSchema } from '../shared/validation';
import type { IncidentItem, ContactItem, UserItem, NotificationStatus } from '../shared/types';

const snsClient = new SNSClient({
  region: process.env.AWS_REGION ?? 'ap-south-1',
});

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN ?? '';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const incidentId = event.pathParameters?.incidentId;

  const auth = extractAuth(event);
  if (!auth) return unauthorized();

  try {
    if (method === 'GET' && !incidentId) return listIncidents(auth.userId);
    if (method === 'GET' && incidentId) return getIncident(auth.userId, incidentId);
    if (method === 'POST' && !incidentId) return createIncident(auth.userId, event.body);

    return badRequest('Route not found', 'NOT_FOUND');
  } catch (err) {
    return internalError('Incidents operation failed', err);
  }
}

async function listIncidents(userId: string): Promise<APIGatewayProxyResultV2> {
  const items = await dbQuery<IncidentItem>({
    TableName: TABLES.incidents,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,
    Limit: 50,
  });
  return ok(items);
}

async function getIncident(userId: string, incidentId: string): Promise<APIGatewayProxyResultV2> {
  const incident = await dbGet<IncidentItem>({
    TableName: TABLES.incidents,
    Key: { incidentId },
  });
  if (!incident) return notFound('Incident not found');
  if (incident.userId !== userId) return forbidden('Incident belongs to another user');
  return ok(incident);
}

async function createIncident(
  userId: string,
  rawBody: string | null | undefined,
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(rawBody);
  if (!body) return badRequest('Request body is required');

  const validation = validate(CreateIncidentSchema, body);
  if ('error' in validation) return badRequest(validation.error);
  const input = validation.data;

  // ── Idempotency check via clientIncidentId ──────────────────────────────────
  if (input.clientIncidentId) {
    const existing = await dbQuery<IncidentItem>({
      TableName: TABLES.incidents,
      IndexName: 'clientId-index',
      KeyConditionExpression: 'clientIncidentId = :cid',
      ExpressionAttributeValues: { ':cid': input.clientIncidentId },
      Limit: 1,
    });
    if (existing.length > 0) {
      console.log(`[incidents] Idempotent: returning existing incident for clientId ${input.clientIncidentId}`);
      return ok(existing[0]);
    }
  }

  const now = new Date().toISOString();
  const incidentId = uuidv4();

  // ── Step 1: Persist incident with PROCESSING status ─────────────────────────
  const incident: IncidentItem = {
    incidentId,
    clientIncidentId: input.clientIncidentId,
    userId,
    tripId: input.tripId,
    status: input.status ?? 'EMERGENCY',
    confidence: input.confidence,
    latitude: input.location?.latitude,
    longitude: input.location?.longitude,
    accuracy: input.location?.accuracy,
    speed: input.location?.speed,
    heading: input.location?.heading,
    detectedAt: input.detectedAt,
    createdAt: now,
    notificationStatus: 'PROCESSING',
  };

  await dbPut({ TableName: TABLES.incidents, Item: incident });
  console.log(`[incidents] Created incident ${incidentId} for user ${userId} | confidence=${input.confidence} | DEMO_MODE=${DEMO_MODE}`);

  // ── Step 2: Fetch user profile for notification message ─────────────────────
  const user = await dbGet<UserItem>({ TableName: TABLES.users, Key: { userId } });
  const userName = user?.name ?? user?.email ?? 'Unknown user';

  // ── Step 3: Fetch enabled emergency contacts ────────────────────────────────
  const contacts = await dbQuery<ContactItem>({
    TableName: TABLES.contacts,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  });
  const enabledContacts = contacts.filter((c) => c.enabled !== false);

  if (enabledContacts.length === 0) {
    await updateNotificationStatus(incidentId, 'NO_CONTACTS');
    console.log(`[incidents] No enabled contacts for user ${userId}`);
    return created({ ...incident, notificationStatus: 'NO_CONTACTS' });
  }

  // ── Step 4: Build notification message ─────────────────────────────────────
  const lat = input.location?.latitude;
  const lng = input.location?.longitude;
  const locationUrl = (lat !== undefined && lng !== undefined)
    ? `https://maps.google.com/?q=${lat},${lng}`
    : 'Location unavailable';

  const confidencePct = Math.round(input.confidence * 100);
  const message = [
    '🚨 COGNISAFE-Q EMERGENCY ALERT 🚨',
    '',
    `A possible emergency was detected.`,
    '',
    `User: ${userName}`,
    `Location: ${locationUrl}`,
    `Confidence: ${confidencePct}%`,
    `Incident ID: ${incidentId}`,
    '',
    'This is an automated safety alert from COGNISAFE-Q.',
  ].join('\n');

  // ── Step 5: Send notifications ──────────────────────────────────────────────
  let finalStatus: NotificationStatus = 'SENT';
  let notificationTimestamp: string | undefined;
  let notifiedCount = 0;

  if (DEMO_MODE) {
    // DEMO_MODE: Log to CloudWatch, don't send real SMS
    console.log('[incidents][DEMO_MODE] Emergency notification payload:');
    console.log('[incidents][DEMO_MODE] Message:', message);
    console.log('[incidents][DEMO_MODE] Would notify:', enabledContacts.map((c) => ({
      name: c.name,
      phone: c.phone,
    })));
    finalStatus = 'DEMO';
    notificationTimestamp = new Date().toISOString();
    notifiedCount = enabledContacts.length;
  } else {
    // Production: Send SMS via SNS
    const results = await Promise.allSettled(
      enabledContacts.map(async (contact) => {
        try {
          await snsClient.send(new PublishCommand({
            PhoneNumber: contact.phone,
            Message: message,
            MessageAttributes: {
              'AWS.SNS.SMS.SMSType': {
                DataType: 'String',
                StringValue: 'Transactional',
              },
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: 'COGNISAFE',
              },
            },
          }));
          console.log(`[incidents] SMS sent to ${contact.name} (${contact.phone})`);
          notifiedCount++;
        } catch (snsErr) {
          console.error(`[incidents] SMS failed for ${contact.name} (${contact.phone}):`, snsErr);
          throw snsErr;
        }
      }),
    );

    const anyFailed = results.some((r) => r.status === 'rejected');
    finalStatus = anyFailed ? (notifiedCount > 0 ? 'SENT' : 'FAILED') : 'SENT';
    notificationTimestamp = new Date().toISOString();

    if (anyFailed) {
      console.warn(`[incidents] Some notifications failed for incident ${incidentId}`);
    }
  }

  // ── Step 6: Update notification status ─────────────────────────────────────
  await updateNotificationStatus(incidentId, finalStatus, notificationTimestamp, notifiedCount);

  const finalIncident: IncidentItem = {
    ...incident,
    notificationStatus: finalStatus,
    notificationTimestamp,
    notifiedContacts: notifiedCount,
  };

  console.log(`[incidents] Incident ${incidentId} complete | status=${finalStatus} | notified=${notifiedCount}`);
  return created(finalIncident);
}

async function updateNotificationStatus(
  incidentId: string,
  status: NotificationStatus,
  timestamp?: string,
  count?: number,
): Promise<void> {
  const expressions = ['#ns = :ns', '#updatedAt = :updatedAt'];
  const names: Record<string, string> = {
    '#ns': 'notificationStatus',
    '#updatedAt': 'updatedAt',
  };
  const values: Record<string, unknown> = {
    ':ns': status,
    ':updatedAt': new Date().toISOString(),
  };

  if (timestamp) {
    expressions.push('#nt = :nt');
    names['#nt'] = 'notificationTimestamp';
    values[':nt'] = timestamp;
  }
  if (count !== undefined) {
    expressions.push('#nc = :nc');
    names['#nc'] = 'notifiedContacts';
    values[':nc'] = count;
  }

  await dbUpdate({
    TableName: TABLES.incidents,
    Key: { incidentId },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  });
}
