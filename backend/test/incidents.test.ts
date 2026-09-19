import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('../lambda/shared/dynamo', () => ({
  dbGet: jest.fn(),
  dbPut: jest.fn(),
  dbDelete: jest.fn(),
  dbQuery: jest.fn(),
  dbUpdate: jest.fn(),
  TABLES: {
    users: 'aera-users',
    contacts: 'aera-contacts',
    trips: 'aera-trips',
    incidents: 'aera-incidents',
  },
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ MessageId: 'test-msg-id' }),
  })),
  PublishCommand: jest.fn(),
}));

const { dbGet, dbPut, dbQuery, dbUpdate } = require('../lambda/shared/dynamo') as {
  dbGet: jest.Mock;
  dbPut: jest.Mock;
  dbQuery: jest.Mock;
  dbUpdate: jest.Mock;
};

// Enable DEMO_MODE for tests to avoid real SMS
process.env.DEMO_MODE = 'true';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:ap-south-1:123456789012:aera-emergency-alerts';

import { handler } from '../lambda/incidents/handler';

type TestResult = APIGatewayProxyStructuredResultV2;

function makeEvent(
  method: string,
  body?: object,
  pathParams?: Record<string, string>,
  userId = 'incident-user-id',
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      http: { method },
      authorizer: {
        jwt: {
          claims: { sub: userId, email: 'incident@example.com' },
          scopes: [],
        },
      },
    },
    body: body ? JSON.stringify(body) : undefined,
    pathParameters: pathParams ?? {},
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

const VALID_INCIDENT = {
  tripId: 'trip-abc-123',
  clientIncidentId: 'client-incident-001',
  status: 'EMERGENCY',
  confidence: 0.94,
  location: {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 10,
    speed: 42,
    heading: 120,
  },
  detectedAt: '2026-09-19T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  dbGet.mockResolvedValue(null);
  dbPut.mockResolvedValue({});
  dbUpdate.mockResolvedValue({});
  dbQuery.mockResolvedValue([]);
});

describe('POST /incidents', () => {
  it('creates incident in DEMO_MODE with enabled contacts', async () => {
    dbGet.mockResolvedValue({ userId: 'incident-user-id', name: 'Test Driver', email: 'test@example.com' });
    // First call: clientId-index check → no duplicate
    dbQuery.mockResolvedValueOnce([]);
    // Second call: contacts query → one enabled contact
    dbQuery.mockResolvedValueOnce([
      { contactId: 'c1', userId: 'incident-user-id', name: 'Mom', phone: '+919876543210', enabled: true },
    ]);

    const result = await handler(makeEvent('POST', VALID_INCIDENT)) as TestResult;
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data.incidentId).toBeDefined();
    expect(body.data.userId).toBe('incident-user-id');
    expect(body.data.confidence).toBe(0.94);
    expect(body.data.notificationStatus).toBe('DEMO');
    expect(dbPut).toHaveBeenCalledTimes(1);
  });

  it('sets NO_CONTACTS when user has no enabled contacts', async () => {
    dbGet.mockResolvedValue({ userId: 'incident-user-id', name: 'Test Driver' });
    // clientId-index check → no duplicate
    dbQuery.mockResolvedValueOnce([]);
    // contacts query → no contacts
    dbQuery.mockResolvedValueOnce([]);

    const result = await handler(makeEvent('POST', VALID_INCIDENT)) as TestResult;
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.data.notificationStatus).toBe('NO_CONTACTS');
  });

  it('is idempotent via clientIncidentId', async () => {
    const existingIncident = {
      incidentId: 'existing-uuid',
      clientIncidentId: 'client-incident-001',
      userId: 'incident-user-id',
      confidence: 0.94,
      notificationStatus: 'DEMO',
    };
    dbQuery.mockResolvedValueOnce([existingIncident]);

    const result = await handler(makeEvent('POST', VALID_INCIDENT)) as TestResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data.incidentId).toBe('existing-uuid');
    expect(dbPut).not.toHaveBeenCalled();
  });

  it('rejects confidence out of range', async () => {
    const result = await handler(makeEvent('POST', {
      ...VALID_INCIDENT,
      confidence: 1.5,
    })) as TestResult;
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid latitude', async () => {
    const result = await handler(makeEvent('POST', {
      ...VALID_INCIDENT,
      location: { latitude: 999, longitude: 80, accuracy: 10 },
    })) as TestResult;
    expect(result.statusCode).toBe(400);
  });

  it('rejects missing detectedAt', async () => {
    const { detectedAt: _, ...withoutDate } = VALID_INCIDENT;
    const result = await handler(makeEvent('POST', withoutDate)) as TestResult;
    expect(result.statusCode).toBe(400);
  });

  it('returns 401 when no auth', async () => {
    const event = {
      requestContext: { http: { method: 'POST' }, authorizer: {} },
      body: JSON.stringify(VALID_INCIDENT),
    } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
    const result = await handler(event) as TestResult;
    expect(result.statusCode).toBe(401);
  });
});

describe('GET /incidents', () => {
  it('returns incidents for authenticated user', async () => {
    dbQuery.mockResolvedValue([
      { incidentId: 'i1', userId: 'incident-user-id', confidence: 0.9 },
    ]);
    const result = await handler(makeEvent('GET')) as TestResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data).toHaveLength(1);
  });
});

describe('GET /incidents/{incidentId}', () => {
  it('returns owned incident', async () => {
    dbGet.mockResolvedValue({
      incidentId: 'i1',
      userId: 'incident-user-id',
      confidence: 0.94,
    });
    const result = await handler(makeEvent('GET', undefined, { incidentId: 'i1' })) as TestResult;
    expect(result.statusCode).toBe(200);
  });

  it('returns 403 for another user incident', async () => {
    dbGet.mockResolvedValue({
      incidentId: 'i1',
      userId: 'ANOTHER-USER',
    });
    const result = await handler(makeEvent('GET', undefined, { incidentId: 'i1' })) as TestResult;
    expect(result.statusCode).toBe(403);
  });

  it('returns 404 for nonexistent incident', async () => {
    dbGet.mockResolvedValue(null);
    const result = await handler(makeEvent('GET', undefined, { incidentId: 'nope' })) as TestResult;
    expect(result.statusCode).toBe(404);
  });
});
