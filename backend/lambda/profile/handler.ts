import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';
import { extractAuth, parseBody } from '../shared/auth';
import { dbGet, dbPut, dbUpdate, TABLES } from '../shared/dynamo';
import {
  ok,
  unauthorized,
  internalError,
  badRequest,
  notFound,
} from '../shared/response';
import { validate, UpdateProfileSchema } from '../shared/validation';
import type { UserItem } from '../shared/types';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();

  const auth = extractAuth(event);
  if (!auth) return unauthorized();

  try {
    if (method === 'GET') {
      return getProfile(auth.userId, auth.email);
    }
    if (method === 'PUT') {
      return updateProfile(auth.userId, auth.email, event.body);
    }
    return badRequest(`Method ${method} not allowed`, 'METHOD_NOT_ALLOWED');
  } catch (err) {
    return internalError('Profile operation failed', err);
  }
}

async function getProfile(
  userId: string,
  jwtEmail?: string,
): Promise<APIGatewayProxyResultV2> {
  let user = await dbGet<UserItem>({
    TableName: TABLES.users,
    Key: { userId },
  });

  // Auto-create profile on first access (Cognito user exists, profile may not yet)
  if (!user) {
    const now = new Date().toISOString();
    user = {
      userId,
      email: jwtEmail ?? '',
      createdAt: now,
      updatedAt: now,
    };
    await dbPut({ TableName: TABLES.users, Item: user });
  }

  return ok({
    userId: user.userId,
    email: user.email,
    name: user.name ?? null,
    phone: user.phone ?? null,
    createdAt: user.createdAt,
  });
}

async function updateProfile(
  userId: string,
  jwtEmail: string | undefined,
  rawBody: string | null | undefined,
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(rawBody);
  if (!body) return badRequest('Request body is required');

  const validation = validate(UpdateProfileSchema, body);
  if ('error' in validation) return badRequest(validation.error);
  const input = validation.data;

  // Ensure profile exists
  let user = await dbGet<UserItem>({ TableName: TABLES.users, Key: { userId } });
  if (!user) {
    const now = new Date().toISOString();
    user = {
      userId,
      email: jwtEmail ?? '',
      createdAt: now,
      updatedAt: now,
    };
    await dbPut({ TableName: TABLES.users, Item: user });
  }

  const updatedAt = new Date().toISOString();
  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': updatedAt };

  if (input.name !== undefined) {
    updateExpressions.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = input.name;
  }
  if (input.phone !== undefined) {
    updateExpressions.push('#phone = :phone');
    names['#phone'] = 'phone';
    values[':phone'] = input.phone;
  }

  const updated = await dbUpdate({
    TableName: TABLES.users,
    Key: { userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  });

  return ok({
    userId,
    email: (updated['email'] as string) ?? jwtEmail ?? '',
    name: (updated['name'] as string) ?? null,
    phone: (updated['phone'] as string) ?? null,
    updatedAt,
  });
}
