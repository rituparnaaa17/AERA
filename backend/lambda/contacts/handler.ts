import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { extractAuth, parseBody } from '../shared/auth';
import { dbGet, dbPut, dbDelete, dbQuery, TABLES } from '../shared/dynamo';
import {
  ok,
  created,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  badRequest,
  noContent,
} from '../shared/response';
import {
  validate,
  CreateContactSchema,
  UpdateContactSchema,
} from '../shared/validation';
import type { ContactItem } from '../shared/types';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method.toUpperCase();
  const contactId = event.pathParameters?.contactId;

  const auth = extractAuth(event);
  if (!auth) return unauthorized();

  try {
    if (method === 'GET' && !contactId) return listContacts(auth.userId);
    if (method === 'POST' && !contactId) return createContact(auth.userId, event.body);
    if (method === 'PUT' && contactId) return updateContact(auth.userId, contactId, event.body);
    if (method === 'DELETE' && contactId) return deleteContact(auth.userId, contactId);

    return badRequest('Route not found', 'NOT_FOUND');
  } catch (err) {
    return internalError('Contacts operation failed', err);
  }
}

async function listContacts(userId: string): Promise<APIGatewayProxyResultV2> {
  const items = await dbQuery<ContactItem>({
    TableName: TABLES.contacts,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  });

  // Sort by priority ascending
  const sorted = items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return ok(sorted);
}

async function createContact(
  userId: string,
  rawBody: string | null | undefined,
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(rawBody);
  if (!body) return badRequest('Request body is required');

  const validation = validate(CreateContactSchema, body);
  if ('error' in validation) return badRequest(validation.error);
  const input = validation.data;

  const now = new Date().toISOString();
  const contact: ContactItem = {
    contactId: uuidv4(),
    userId,
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    relationship: input.relationship,
    priority: input.priority ?? 1,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await dbPut({ TableName: TABLES.contacts, Item: contact });
  console.log(`[contacts] Created contact ${contact.contactId} for user ${userId}`);
  return created(contact);
}

async function updateContact(
  userId: string,
  contactId: string,
  rawBody: string | null | undefined,
): Promise<APIGatewayProxyResultV2> {
  // Ownership check
  const existing = await dbGet<ContactItem>({
    TableName: TABLES.contacts,
    Key: { contactId },
  });
  if (!existing) return notFound('Contact not found');
  if (existing.userId !== userId) return forbidden('Contact belongs to another user');

  const body = parseBody(rawBody);
  if (!body) return badRequest('Request body is required');

  const validation = validate(UpdateContactSchema, body);
  if ('error' in validation) return badRequest(validation.error);
  const input = validation.data;

  const updated: ContactItem = {
    ...existing,
    ...input,
    email: input.email || existing.email,
    userId,   // never allow changing ownership
    contactId, // never allow changing PK
    updatedAt: new Date().toISOString(),
  };

  await dbPut({ TableName: TABLES.contacts, Item: updated });
  return ok(updated);
}

async function deleteContact(
  userId: string,
  contactId: string,
): Promise<APIGatewayProxyResultV2> {
  // Ownership check before delete
  const existing = await dbGet<ContactItem>({
    TableName: TABLES.contacts,
    Key: { contactId },
  });
  if (!existing) return notFound('Contact not found');
  if (existing.userId !== userId) return forbidden('Contact belongs to another user');

  await dbDelete({ TableName: TABLES.contacts, Key: { contactId } });
  console.log(`[contacts] Deleted contact ${contactId} for user ${userId}`);
  return noContent();
}
