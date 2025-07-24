import request from 'supertest';
import { app } from '../index';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/healthz')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('Well-known endpoint', () => {
  it('should return OAuth resource metadata', async () => {
    const response = await request(app)
      .get('/.well-known/oauth-protected-resource')
      .expect(200);

    expect(response.body).toHaveProperty('resource_id');
    expect(response.body).toHaveProperty('issuer');
    expect(response.body).toHaveProperty('scopes_supported');
    expect(response.body).toHaveProperty('authorization_endpoint');
    expect(response.body).toHaveProperty('token_endpoint');
    expect(response.body).toHaveProperty('jwks_uri');
  });
}); 