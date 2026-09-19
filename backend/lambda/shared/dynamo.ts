import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  type GetCommandInput,
  type PutCommandInput,
  type UpdateCommandInput,
  type DeleteCommandInput,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-south-1',
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// ─── Convenience wrappers ──────────────────────────────────────────────────────

export async function dbGet<T>(input: GetCommandInput): Promise<T | null> {
  const result = await ddb.send(new GetCommand(input));
  return (result.Item as T) ?? null;
}

export async function dbPut(input: PutCommandInput): Promise<void> {
  await ddb.send(new PutCommand(input));
}

export async function dbUpdate(input: UpdateCommandInput): Promise<Record<string, unknown>> {
  const result = await ddb.send(new UpdateCommand(input));
  return (result.Attributes as Record<string, unknown>) ?? {};
}

export async function dbDelete(input: DeleteCommandInput): Promise<void> {
  await ddb.send(new DeleteCommand(input));
}

export async function dbQuery<T>(input: QueryCommandInput): Promise<T[]> {
  const result = await ddb.send(new QueryCommand(input));
  return (result.Items as T[]) ?? [];
}

// ─── Table name env helpers ────────────────────────────────────────────────────

export const TABLES = {
  users: process.env.USERS_TABLE ?? 'aera-users',
  contacts: process.env.CONTACTS_TABLE ?? 'aera-contacts',
  trips: process.env.TRIPS_TABLE ?? 'aera-trips',
  incidents: process.env.INCIDENTS_TABLE ?? 'aera-incidents',
} as const;
