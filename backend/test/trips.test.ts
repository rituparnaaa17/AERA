import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('../lambda/shared/dynamo', () => ({
  dbGet: jest.fn(),
  dbPut: jest.fn(),
  dbDelete: jest.fn(),
  dbQuery: jest.fn(),
  dbUpdate: jest.fn(),
  TABLES: {
    users: 'cognisafe-users',
    contacts: 'cognisafe-contacts',
    trips: 'cognisafe-trips',
    incidents: 'cognisafe-incidents',
  },
}));

const { dbGet, dbPut, dbQuery } = require('../lambda/shared/dynamo') as {
  dbGet: jest.Mock;
  dbPut: jest.Mock;
  dbQuery: jest.Mock;
};

import { handler } from '../lambda/trips/handler';

type TestResult = APIGatewayProxyStructuredResultV2;

function makeEvent(
  method: string,
  body?: object,
  pathParams?: Record<string, string>,
  userId = 'trip-user-id',
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      http: { method },
      authorizer: {
        jwt: {
          claims: { sub: userId, email: 'trip@example.com' },
          scopes: [],
        },
      },
    },
    body: body ? JSON.stringify(body) : undefined,
    pathParameters: pathParams ?? {},
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  jest.clearAllMocks();
  dbGet.mockResolvedValue(null);
  dbPut.mockResolvedValue({});
  dbQuery.mockResolvedValue([]);
});

describe('POST /trips', () => {
  it('creates a trip with mobile sessionId as tripId', async () => {
    const result = await handler(makeEvent('POST', {
      tripId: 'session-123456-abc',
      startTime: '2026-09-19T00:00:00.000Z',
    })) as TestResult;
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.data.tripId).toBe('session-123456-abc');
    expect(body.data.userId).toBe('trip-user-id');
    expect(dbPut).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — returns existing trip on duplicate tripId', async () => {
    dbGet.mockResolvedValue({
      tripId: 'existing-trip',
      userId: 'trip-user-id',
      startTime: '2026-09-19T00:00:00.000Z',
      createdAt: '2026-09-19T00:00:00.000Z',
      updatedAt: '2026-09-19T00:00:00.000Z',
    });
    const result = await handler(makeEvent('POST', {
      tripId: 'existing-trip',
      startTime: '2026-09-19T00:00:00.000Z',
    })) as TestResult;
    expect(result.statusCode).toBe(200);
    expect(dbPut).not.toHaveBeenCalled();
  });

  it('rejects invalid startTime', async () => {
    const result = await handler(makeEvent('POST', {
      tripId: 'trip-bad',
      startTime: 'not-a-date',
    })) as TestResult;
    expect(result.statusCode).toBe(400);
  });

  it('rejects missing tripId', async () => {
    const result = await handler(makeEvent('POST', {
      startTime: '2026-09-19T00:00:00.000Z',
    })) as TestResult;
    expect(result.statusCode).toBe(400);
  });
});

describe('PUT /trips/{tripId}', () => {
  it('updates owned trip', async () => {
    dbGet.mockResolvedValue({
      tripId: 'trip-1',
      userId: 'trip-user-id',
      startTime: '2026-09-19T00:00:00.000Z',
      createdAt: '2026-09-19T00:00:00.000Z',
      updatedAt: '2026-09-19T00:00:00.000Z',
    });
    const result = await handler(makeEvent('PUT', {
      endTime: '2026-09-19T01:00:00.000Z',
      duration: 3600,
      distance: 45.2,
      alertCount: 0,
      emergencyTriggered: false,
    }, { tripId: 'trip-1' })) as TestResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data.duration).toBe(3600);
    expect(body.data.distance).toBe(45.2);
  });

  it('returns 403 when trip belongs to another user', async () => {
    dbGet.mockResolvedValue({
      tripId: 'trip-1',
      userId: 'DIFFERENT-USER',
    });
    const result = await handler(makeEvent('PUT', { duration: 100 }, { tripId: 'trip-1' })) as TestResult;
    expect(result.statusCode).toBe(403);
  });
});

describe('GET /trips', () => {
  it('returns list of trips for authenticated user', async () => {
    dbQuery.mockResolvedValue([
      { tripId: 't1', userId: 'trip-user-id', startTime: '2026-09-19T00:00:00.000Z' },
    ]);
    const result = await handler(makeEvent('GET')) as TestResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data).toHaveLength(1);
  });
});
