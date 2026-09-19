import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export function ok<T>(data: T, statusCode = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data }),
  };
}

export function created<T>(data: T): APIGatewayProxyResultV2 {
  return ok(data, 201);
}

export function badRequest(message: string, code = 'VALIDATION_ERROR'): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: { code, message } }),
  };
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResultV2 {
  return {
    statusCode: 401,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message } }),
  };
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResultV2 {
  return {
    statusCode: 403,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }),
  };
}

export function notFound(message = 'Not found'): APIGatewayProxyResultV2 {
  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }),
  };
}

export function conflict(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 409,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: { code: 'CONFLICT', message } }),
  };
}

export function internalError(message = 'Internal server error', err?: unknown): APIGatewayProxyResultV2 {
  if (err) {
    console.error('[AeraError]', message, err instanceof Error ? err.stack : err);
  }
  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message } }),
  };
}

export function noContent(): APIGatewayProxyResultV2 {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}
