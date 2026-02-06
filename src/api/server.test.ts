/**
 * API Server Tests
 * Tests for Express.js server setup and basic functionality
 */

import { APIServer } from './server';
import request from 'supertest';

describe('APIServer', () => {
  let server: APIServer;

  beforeEach(() => {
    server = new APIServer(3001); // Use different port for testing
  });

  describe('Server Initialization', () => {
    it('should create an Express application', () => {
      const app = server.getApp();
      expect(app).toBeDefined();
    });

    it('should use the configured port', () => {
      expect(server.getPort()).toBe(3001);
    });

    it('should use default port 3000 when not specified', () => {
      const defaultServer = new APIServer();
      expect(defaultServer.getPort()).toBe(3000);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond to health check requests', async () => {
      const response = await request(server.getApp()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(server.getApp()).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should return numeric uptime', async () => {
      const response = await request(server.getApp()).get('/health');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API Version Endpoint', () => {
    it('should respond to API version requests', async () => {
      const response = await request(server.getApp()).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should list available endpoints', async () => {
      const response = await request(server.getApp()).get('/api/v1');

      expect(response.body.endpoints).toHaveProperty('conversations');
      expect(response.body.endpoints).toHaveProperty('reports');
      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('metrics');
    });
  });

  describe('Middleware Configuration', () => {
    it('should parse JSON request bodies', async () => {
      // This will be tested more thoroughly when we add POST endpoints
      const app = server.getApp();
      expect(app).toBeDefined();
    });

    it('should handle CORS requests', async () => {
      const response = await request(server.getApp())
        .options('/health')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(server.getApp()).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include route information in 404 response', async () => {
      const response = await request(server.getApp()).get('/invalid/path');

      expect(response.body.message).toContain('GET');
      expect(response.body.message).toContain('/invalid/path');
    });
  });

  describe('Response Headers', () => {
    it('should set Content-Type to application/json', async () => {
      const response = await request(server.getApp()).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
