/**
 * Authentication Middleware Integration Tests
 * Tests authentication middleware integrated with Express server
 */

import express, { Application } from 'express';
import request from 'supertest';
import { authenticate, authorize, addAPIKey, clearAPIKeys, AuthenticatedRequest } from './auth';
import { errorHandler } from './errorHandler';

describe('Authentication Middleware Integration', () => {
  let app: Application;

  beforeEach(() => {
    // Reset API keys
    clearAPIKeys();
    addAPIKey('test-key-123', 'test-client', 'Test Client', ['read', 'write']);
    addAPIKey('read-only-key', 'read-client', 'Read Only Client', ['read']);

    // Create Express app with authentication
    app = express();
    app.use(express.json());

    // Public endpoint (no authentication)
    app.get('/public', (_req, res) => {
      res.json({ message: 'Public endpoint' });
    });

    // Protected endpoint (authentication required)
    app.get('/protected', authenticate, (req: AuthenticatedRequest, res) => {
      res.json({
        message: 'Protected endpoint',
        clientId: req.clientId,
      });
    });

    // Protected endpoint with read permission
    app.get('/read-only', authenticate, authorize('read'), (req: AuthenticatedRequest, res) => {
      res.json({
        message: 'Read-only endpoint',
        clientId: req.clientId,
      });
    });

    // Protected endpoint with write permission
    app.post('/write', authenticate, authorize('write'), (req: AuthenticatedRequest, res) => {
      res.json({
        message: 'Write endpoint',
        clientId: req.clientId,
        data: req.body,
      });
    });

    // Protected endpoint with multiple permissions
    app.delete('/admin', authenticate, authorize('read', 'write', 'admin'), (req: AuthenticatedRequest, res) => {
      res.json({
        message: 'Admin endpoint',
        clientId: req.clientId,
      });
    });

    // Error handler
    app.use(errorHandler);
  });

  describe('Public Endpoints', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app).get('/public');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Public endpoint');
    });
  });

  describe('Protected Endpoints', () => {
    it('should allow access with valid API key in X-API-Key header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', 'test-key-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Protected endpoint');
      expect(response.body.clientId).toBe('test-client');
    });

    it('should allow access with valid API key in Authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer test-key-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Protected endpoint');
      expect(response.body.clientId).toBe('test-client');
    });

    it('should reject access without API key', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required. Please provide an API key.');
    });

    it('should reject access with invalid API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid API key');
    });

    it('should reject access with empty API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', '');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required. Please provide an API key.');
    });
  });

  describe('Authorization with Permissions', () => {
    it('should allow access when user has required permission', async () => {
      const response = await request(app)
        .get('/read-only')
        .set('X-API-Key', 'test-key-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Read-only endpoint');
    });

    it('should allow read-only user to access read endpoint', async () => {
      const response = await request(app)
        .get('/read-only')
        .set('X-API-Key', 'read-only-key');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Read-only endpoint');
    });

    it('should deny access when user lacks required permission', async () => {
      const response = await request(app)
        .post('/write')
        .set('X-API-Key', 'read-only-key')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
      expect(response.body.error).toContain('write');
    });

    it('should deny access when user lacks multiple required permissions', async () => {
      const response = await request(app)
        .delete('/admin')
        .set('X-API-Key', 'test-key-123');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow POST requests with valid write permission', async () => {
      const response = await request(app)
        .post('/write')
        .set('X-API-Key', 'test-key-123')
        .send({ data: 'test data' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Write endpoint');
      expect(response.body.data).toEqual({ data: 'test data' });
    });
  });

  describe('Error Response Format', () => {
    it('should return proper error format for authentication failures', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path', '/protected');
    });

    it('should return proper error format for authorization failures', async () => {
      const response = await request(app)
        .post('/write')
        .set('X-API-Key', 'read-only-key')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path', '/write');
    });
  });

  describe('Multiple Authentication Methods', () => {
    it('should prefer X-API-Key over Authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('X-API-Key', 'test-key-123')
        .set('Authorization', 'Bearer read-only-key');

      expect(response.status).toBe(200);
      expect(response.body.clientId).toBe('test-client'); // From test-key-123
    });

    it('should use Authorization header when X-API-Key not present', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer read-only-key');

      expect(response.status).toBe(200);
      expect(response.body.clientId).toBe('read-client'); // From read-only-key
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle complete request flow with authentication and authorization', async () => {
      // Step 1: Access public endpoint
      const publicResponse = await request(app).get('/public');
      expect(publicResponse.status).toBe(200);

      // Step 2: Try to access protected endpoint without auth (should fail)
      const unauthResponse = await request(app).get('/protected');
      expect(unauthResponse.status).toBe(401);

      // Step 3: Access protected endpoint with auth (should succeed)
      const authResponse = await request(app)
        .get('/protected')
        .set('X-API-Key', 'test-key-123');
      expect(authResponse.status).toBe(200);

      // Step 4: Access read endpoint with read-only key (should succeed)
      const readResponse = await request(app)
        .get('/read-only')
        .set('X-API-Key', 'read-only-key');
      expect(readResponse.status).toBe(200);

      // Step 5: Try to write with read-only key (should fail)
      const writeResponse = await request(app)
        .post('/write')
        .set('X-API-Key', 'read-only-key')
        .send({ data: 'test' });
      expect(writeResponse.status).toBe(403);
    });

    it('should handle malformed requests gracefully', async () => {
      // Malformed Authorization header
      const response1 = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat test-key-123');
      expect(response1.status).toBe(401);

      // Whitespace API key
      const response2 = await request(app)
        .get('/protected')
        .set('X-API-Key', '   ');
      expect(response2.status).toBe(401);

      // Missing Bearer prefix
      const response3 = await request(app)
        .get('/protected')
        .set('Authorization', 'test-key-123');
      expect(response3.status).toBe(401);
    });
  });
});
