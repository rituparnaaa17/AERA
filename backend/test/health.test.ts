import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handler } from '../lambda/health/handler';

describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const result = await handler({} as APIGatewayProxyEventV2) as APIGatewayProxyStructuredResultV2;
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.service).toBe('cognisafe-q-backend');
    expect(body.data.timestamp).toBeDefined();
  });
});
