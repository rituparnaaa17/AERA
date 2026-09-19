/**
 * Contacts Lambda Tests
 * These tests mock DynamoDB and verify ownership + validation logic.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// Mock DynamoDB before importing handler
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

const { dbGet, dbPut, dbDelete, dbQuery } = require('../lambda/shared/dynamo') as {
  dbGet: jest.Mock;
  dbPut: jest.Mock;
  dbDelete: jest.Mock;
  dbQuery: jest.Mock;
};

import { handler } from '../lambda/contacts/handler';

type TestResult = APIGatewayProxyStructuredResultV2;

function makeEvent(
  method: string,
  body?: object,
  pathParams?: Record<string, string>,
  userId = 'test-user-id',
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      http: { method },
      authorizer: {
        jwt: {
          claims: { sub: userId, email: 'test@example.com' },
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

describe('GET /contacts', () => {
  it('returns empty array when no contacts', async () => {
    const result = await handler(makeEvent('GET')) as TestResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('returns sorted contacts by priority', async () => {
    dbQuery.mockResolvedValue([
      { contactId: 'c2', userId: 'test-user-id', name: 'Bob', phone: '+1234567890', priority: 2, enabled: true },
      { contactId: 'c1', userId: 'test-user-id', name: 'Alice', phone: '+0987654321', priority: 1, enabled: true },
    ]);
    const result = await handler(makeEvent('GET')) as TestResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data[0].name).toBe('Alice');
    expect(body.data[1].name).toBe('Bob');
  });

  it('returns 401 when no auth', async () => {
    const event = {
      requestContext: { http: { method: 'GET' }, authorizer: {} },
    } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
    const result = await handler(event) as TestResult;
    expect(result.statusCode).toBe(401);
  });
});

describe('POST /contacts', () => {
  it('creates contact with server-generated contactId', async () => {
    const result = await handler(makeEvent('POST', {
      name: 'Mom',
      phone: '+919876543210',
      priority: 1,
      enabled: true,
    })) as TestResult;
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data.contactId).toBeDefined();
    expect(body.data.userId).toBe('test-user-id');
    expect(body.data.name).toBe('Mom');
    expect(dbPut).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid phone number', async () => {
    const result = await handler(makeEvent('POST', {
      name: 'Mom',
      phone: 'not-a-phone',
      priority: 1,
      enabled: true,
    })) as TestResult;
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing name', async () => {
    const result = await handler(makeEvent('POST', {
      phone: '+919876543210',
    })) as TestResult;
    expect(result.statusCode).toBe(400);
  });
});

describe('DELETE /contacts/{contactId}', () => {
  it('deletes owned contact', async () => {
    dbGet.mockResolvedValue({
      contactId: 'c1',
      userId: 'test-user-id',
      name: 'Mom',
      phone: '+919876543210',
    });
    const result = await handler(makeEvent('DELETE', undefined, { contactId: 'c1' })) as TestResult;
    expect(result.statusCode).toBe(204);
    expect(dbDelete).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when contact belongs to another user', async () => {
    dbGet.mockResolvedValue({
      contactId: 'c1',
      userId: 'OTHER-USER',
      name: 'Someone',
      phone: '+919876543210',
    });
    const result = await handler(makeEvent('DELETE', undefined, { contactId: 'c1' })) as TestResult;
    expect(result.statusCode).toBe(403);
    expect(dbDelete).not.toHaveBeenCalled();
  });

  it('returns 404 when contact does not exist', async () => {
    dbGet.mockResolvedValue(null);
    const result = await handler(makeEvent('DELETE', undefined, { contactId: 'nonexistent' })) as TestResult;
    expect(result.statusCode).toBe(404);
  });
});
