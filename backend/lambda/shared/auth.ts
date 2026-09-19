import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import type { AuthContext } from './types';

/**
 * Extracts the authenticated user's Cognito sub from the API Gateway JWT authorizer context.
 * userId is ALWAYS derived from the JWT — never trusted from client body/query.
 */
export function extractAuth(event: APIGatewayProxyEventV2WithJWTAuthorizer): AuthContext | null {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims) return null;

  const sub = claims['sub'];
  if (typeof sub !== 'string' || !sub) return null;

  return {
    userId: sub,
    email: typeof claims['email'] === 'string' ? claims['email'] : undefined,
  };
}

/**
 * Safe JSON body parse — returns null on failure.
 */
export function parseBody<T = Record<string, unknown>>(body: string | null | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}
