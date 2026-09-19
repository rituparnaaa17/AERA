import type { APIGatewayProxyResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import { ok } from '../shared/response';

const START_TIME = Date.now();

export async function handler(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return ok({
    status: 'healthy',
    service: 'aera-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - START_TIME,
    region: process.env.AWS_REGION ?? 'unknown',
  });
}
