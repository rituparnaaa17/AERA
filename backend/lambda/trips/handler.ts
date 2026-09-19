import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';
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
  conflict,
} from '../shared/response';
import { validate, CreateTripSchema, UpdateTripSchema } from '../shared/validation';
import type { TripItem } from '../shared/types';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const tripId = event.pathParameters?.tripId;

  const auth = extractAuth(event);
  if (!auth) return unauthorized();

  try {
    if (method === 'GET' && !tripId) return listTrips(auth.userId);
    if (method === 'GET' && tripId) return getTrip(auth.userId, tripId);
    if (method === 'POST' && !tripId) return createTrip(auth.userId, event.body);
    if (method === 'PUT' && tripId) return updateTrip(auth.userId, tripId, event.body);

    return badRequest('Route not found', 'NOT_FOUND');
  } catch (err) {
    return internalError('Trips operation failed', err);
  }
}

async function listTrips(userId: string): Promise<APIGatewayProxyResultV2> {
  const items = await dbQuery<TripItem>({
    TableName: TABLES.trips,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false, // newest first
    Limit: 30,
  });

  return ok(items);
}

async function getTrip(userId: string, tripId: string): Promise<APIGatewayProxyResultV2> {
  const trip = await dbGet<TripItem>({ TableName: TABLES.trips, Key: { tripId } });
  if (!trip) return notFound('Trip not found');
  if (trip.userId !== userId) return forbidden('Trip belongs to another user');
  return ok(trip);
}

async function createTrip(
  userId: string,
  rawBody: string | null | undefined,
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(rawBody);
  if (!body) return badRequest('Request body is required');

  const validation = validate(CreateTripSchema, body);
  if ('error' in validation) return badRequest(validation.error);
  const input = validation.data;

  // Idempotency: don't create duplicate trip with same tripId
  const existing = await dbGet<TripItem>({ TableName: TABLES.trips, Key: { tripId: input.tripId } });
  if (existing) {
    if (existing.userId !== userId) return forbidden('Trip ID already used by another user');
    // Return existing trip as idempotent response
    return ok(existing);
  }

  const now = new Date().toISOString();
  const trip: TripItem = {
    tripId: input.tripId,
    userId,
    startTime: input.startTime,
    createdAt: now,
    updatedAt: now,
  };

  await dbPut({ TableName: TABLES.trips, Item: trip });
  console.log(`[trips] Created trip ${trip.tripId} for user ${userId}`);
  return created(trip);
}

async function updateTrip(
  userId: string,
  tripId: string,
  rawBody: string | null | undefined,
): Promise<APIGatewayProxyResultV2> {
  // Ownership check
  const existing = await dbGet<TripItem>({ TableName: TABLES.trips, Key: { tripId } });
  if (!existing) return notFound('Trip not found');
  if (existing.userId !== userId) return forbidden('Trip belongs to another user');

  const body = parseBody(rawBody);
  if (!body) return badRequest('Request body is required');

  const validation = validate(UpdateTripSchema, body);
  if ('error' in validation) return badRequest(validation.error);
  const input = validation.data;

  const now = new Date().toISOString();
  const updated: TripItem = {
    ...existing,
    ...input,
    userId,   // ownership preserved
    tripId,   // PK preserved
    updatedAt: now,
  };

  await dbPut({ TableName: TABLES.trips, Item: updated });
  console.log(`[trips] Updated trip ${tripId} for user ${userId}`);
  return ok(updated);
}
