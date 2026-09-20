import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// Mock DynamoDB before importing handlers
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

// Mock SNS client to prevent real AWS calls
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ MessageId: 'mock-msg-id' }),
  })),
  PublishCommand: jest.fn(),
}));

const { dbGet, dbPut, dbDelete, dbQuery } = require('../lambda/shared/dynamo') as {
  dbGet: jest.Mock;
  dbPut: jest.Mock;
  dbDelete: jest.Mock;
  dbQuery: jest.Mock;
};

import { handler as tripsHandler } from '../lambda/trips/handler';
import { handler as contactsHandler } from '../lambda/contacts/handler';
import { handler as incidentsHandler } from '../lambda/incidents/handler';
import { handler as profileHandler } from '../lambda/profile/handler';

type TestResult = APIGatewayProxyStructuredResultV2;

function makeEvent(
  method: string,
  userId: string,
  body?: object,
  pathParams?: Record<string, string>,
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      http: { method },
      authorizer: {
        jwt: {
          claims: { sub: userId, email: `${userId}@example.com` },
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
  dbQuery.mockResolvedValue([]);
  dbPut.mockResolvedValue({});
  dbDelete.mockResolvedValue({});
  dbGet.mockResolvedValue(null);
});

describe('Multi-User Strict Data Isolation Tests', () => {
  const USER_A = 'sub-user-AAAA-1111';
  const USER_B = 'sub-user-BBBB-2222';

  describe('Trips Isolation', () => {
    it('User A queries GET /trips with ExpressionAttributeValues strictly bound to USER_A sub', async () => {
      await tripsHandler(makeEvent('GET', USER_A));
      expect(dbQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: { ':uid': USER_A },
        }),
      );
    });

    it('User A cannot update User B trip (returns 403 Forbidden)', async () => {
      dbGet.mockResolvedValue({
        tripId: 'trip-b-999',
        userId: USER_B,
        startTime: '2026-09-20T00:00:00.000Z',
      });

      const result = (await tripsHandler(
        makeEvent('PUT', USER_A, { duration: 1200 }, { tripId: 'trip-b-999' }),
      )) as TestResult;

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body as string);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('User A cannot access User B trip details GET /trips/{tripId} (returns 403 Forbidden)', async () => {
      dbGet.mockResolvedValue({
        tripId: 'trip-b-999',
        userId: USER_B,
      });

      const result = (await tripsHandler(
        makeEvent('GET', USER_A, undefined, { tripId: 'trip-b-999' }),
      )) as TestResult;

      expect(result.statusCode).toBe(403);
    });
  });

  describe('Contacts Isolation', () => {
    it('User A queries GET /contacts strictly bound to USER_A sub', async () => {
      await contactsHandler(makeEvent('GET', USER_A));
      expect(dbQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: { ':uid': USER_A },
        }),
      );
    });

    it('User A cannot update User B contact (returns 403 Forbidden)', async () => {
      dbGet.mockResolvedValue({
        contactId: 'contact-b-1',
        userId: USER_B,
        name: 'User B Emergency Contact',
        phone: '+919876543210',
      });

      const result = (await contactsHandler(
        makeEvent('PUT', USER_A, { name: 'Hacked Name' }, { contactId: 'contact-b-1' }),
      )) as TestResult;

      expect(result.statusCode).toBe(403);
      expect(dbPut).not.toHaveBeenCalled();
    });

    it('User A cannot delete User B contact (returns 403 Forbidden)', async () => {
      dbGet.mockResolvedValue({
        contactId: 'contact-b-1',
        userId: USER_B,
      });

      const result = (await contactsHandler(
        makeEvent('DELETE', USER_A, undefined, { contactId: 'contact-b-1' }),
      )) as TestResult;

      expect(result.statusCode).toBe(403);
      expect(dbDelete).not.toHaveBeenCalled();
    });
  });

  describe('Incidents Isolation', () => {
    it('User A queries GET /incidents strictly bound to USER_A sub', async () => {
      await incidentsHandler(makeEvent('GET', USER_A));
      expect(dbQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: { ':uid': USER_A },
        }),
      );
    });

    it('User A cannot fetch User B incident details GET /incidents/{incidentId} (returns 403)', async () => {
      dbGet.mockResolvedValue({
        incidentId: 'inc-b-777',
        userId: USER_B,
      });

      const result = (await incidentsHandler(
        makeEvent('GET', USER_A, undefined, { incidentId: 'inc-b-777' }),
      )) as TestResult;

      expect(result.statusCode).toBe(403);
    });
  });

  describe('Profile Isolation', () => {
    it('User A GET /profile returns ONLY User A profile', async () => {
      dbGet.mockResolvedValue({
        userId: USER_A,
        email: `${USER_A}@example.com`,
        name: 'User A',
      });

      const result = (await profileHandler(makeEvent('GET', USER_A))) as TestResult;
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.data.userId).toBe(USER_A);
      expect(body.data.name).toBe('User A');
      expect(dbGet).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: { userId: USER_A },
        }),
      );
    });
  });
});
