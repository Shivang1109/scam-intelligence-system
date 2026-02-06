/**
 * Conversation Routes Unit Tests
 * Tests the conversation API endpoints
 */

import request from 'supertest';
import express, { Application } from 'express';
import { createConversationRoutes } from './conversations';
import { AgentController } from '../../agents/AgentController';
import { StateMachine } from '../../agents/StateMachine';
import { PersonaManager } from '../../agents/PersonaManager';
import { NLPExtractor } from '../../nlp/NLPExtractor';
import { ScamSignalDetector } from '../../nlp/ScamSignalDetector';
import { ScamClassifier } from '../../scoring/ScamClassifier';
import { RiskScorer } from '../../scoring/RiskScorer';
import { addAPIKey, removeAPIKey } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';

describe('Conversation Routes', () => {
  let app: Application;
  let agentController: AgentController;
  const testApiKey = 'test-conversation-routes-key';

  beforeAll(() => {
    // Add test API key
    addAPIKey(testApiKey, 'test-client', 'Test Client');
  });

  afterAll(() => {
    // Clean up test API key
    removeAPIKey(testApiKey);
  });

  beforeEach(() => {
    // Create dependencies
    const stateMachine = new StateMachine();
    const personaManager = new PersonaManager();
    const nlpExtractor = new NLPExtractor();
    const signalDetector = new ScamSignalDetector();
    const scamClassifier = new ScamClassifier();
    const riskScorer = new RiskScorer();

    // Create agent controller
    agentController = new AgentController(
      stateMachine,
      personaManager,
      nlpExtractor,
      signalDetector,
      scamClassifier,
      riskScorer
    );

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/conversations', createConversationRoutes(agentController));
    app.use(errorHandler);
  });

  afterEach(async () => {
    // Clean up agent controller
    await agentController.shutdown();
  });

  describe('POST /api/v1/conversations', () => {
    it('should create a new conversation with valid request', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', testApiKey)
        .send({
          initialMessage: 'Hello, I received a message about winning a prize',
        })
        .expect(201);

      expect(response.body).toHaveProperty('conversationId');
      expect(response.body).toHaveProperty('status', 'created');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.conversationId).toBe('string');
      expect(response.body.conversationId.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .send({
          initialMessage: 'Hello',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', 'invalid-key')
        .send({
          initialMessage: 'Hello',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without initialMessage', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', testApiKey)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('initialMessage');
    });

    it('should reject request with empty initialMessage', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', testApiKey)
        .send({
          initialMessage: '   ',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('empty');
    });

    it('should reject request with non-string initialMessage', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', testApiKey)
        .send({
          initialMessage: 123,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('string');
    });

    it('should accept optional context parameter', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', testApiKey)
        .send({
          initialMessage: 'Hello',
          context: { source: 'email', priority: 'high' },
        })
        .expect(201);

      expect(response.body).toHaveProperty('conversationId');
    });
  });

  describe('GET /api/v1/conversations/:id', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a conversation first
      const conversation = await agentController.createConversation('Test message');
      conversationId = conversation.id;
    });

    it('should retrieve conversation details', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('id', conversationId);
      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('persona');
      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('extractedEntities');
      expect(response.body).toHaveProperty('scamSignals');
      expect(response.body).toHaveProperty('classification');
      expect(response.body).toHaveProperty('riskScore');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get(`/api/v1/conversations/${conversationId}`)
        .expect(401);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/v1/conversations/non-existent-id')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/v1/conversations/:id/status', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a conversation first
      const conversation = await agentController.createConversation('Test message');
      conversationId = conversation.id;
    });

    it('should retrieve conversation status', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversationId}/status`)
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('conversationId', conversationId);
      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('messageCount');
      expect(response.body).toHaveProperty('riskScore');
      expect(response.body).toHaveProperty('classification');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Should not include full details
      expect(response.body).not.toHaveProperty('messages');
      expect(response.body).not.toHaveProperty('extractedEntities');
      expect(response.body).not.toHaveProperty('scamSignals');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get(`/api/v1/conversations/${conversationId}/status`)
        .expect(401);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/v1/conversations/non-existent-id/status')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/v1/conversations/:id/messages', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a conversation first
      const conversation = await agentController.createConversation('Test message');
      conversationId = conversation.id;
    });

    it('should send message and receive response', async () => {
      const response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', testApiKey)
        .send({
          message: 'Yes, I am interested in the prize',
        })
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('delay');
      expect(typeof response.body.content).toBe('string');
      expect(typeof response.body.delay).toBe('number');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .send({
          message: 'Test',
        })
        .expect(401);
    });

    it('should reject request without message', async () => {
      const response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', testApiKey)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('message');
    });

    it('should reject request with empty message', async () => {
      const response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', testApiKey)
        .send({
          message: '   ',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('empty');
    });

    it('should reject request with non-string message', async () => {
      const response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', testApiKey)
        .send({
          message: 123,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('string');
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/non-existent-id/messages')
        .set('X-API-Key', testApiKey)
        .send({
          message: 'Test',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for terminated conversation', async () => {
      // Terminate the conversation first
      await agentController.terminateConversation(conversationId);

      const response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', testApiKey)
        .send({
          message: 'Test',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/v1/conversations/:id', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a conversation first
      const conversation = await agentController.createConversation('Test message');
      conversationId = conversation.id;
    });

    it('should terminate conversation', async () => {
      const response = await request(app)
        .delete(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('conversationId', conversationId);
      expect(response.body).toHaveProperty('status', 'terminated');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .delete(`/api/v1/conversations/${conversationId}`)
        .expect(401);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .delete('/api/v1/conversations/non-existent-id')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should handle terminating already terminated conversation', async () => {
      // Terminate once
      await request(app)
        .delete(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', testApiKey)
        .expect(200);

      // Try to terminate again - should return 404 since agent is removed
      await request(app)
        .delete(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', testApiKey)
        .expect(404);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete conversation flow', async () => {
      // 1. Create conversation
      const createResponse = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', testApiKey)
        .send({
          initialMessage: 'I got a message about a lottery win',
        })
        .expect(201);

      const conversationId = createResponse.body.conversationId;

      // 2. Check status
      const statusResponse = await request(app)
        .get(`/api/v1/conversations/${conversationId}/status`)
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(statusResponse.body.conversationId).toBe(conversationId);
      expect(statusResponse.body.messageCount).toBeGreaterThan(0);

      // 3. Send message
      const messageResponse = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', testApiKey)
        .send({
          message: 'Tell me more about this lottery',
        })
        .expect(200);

      expect(messageResponse.body.content).toBeTruthy();

      // 4. Get full details
      const detailsResponse = await request(app)
        .get(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(detailsResponse.body.messages.length).toBeGreaterThan(1);

      // 5. Terminate conversation
      await request(app)
        .delete(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', testApiKey)
        .expect(200);
    });

    it('should handle multiple concurrent conversations', async () => {
      // Create multiple conversations
      const conversations = await Promise.all([
        request(app)
          .post('/api/v1/conversations')
          .set('X-API-Key', testApiKey)
          .send({ initialMessage: 'Message 1' }),
        request(app)
          .post('/api/v1/conversations')
          .set('X-API-Key', testApiKey)
          .send({ initialMessage: 'Message 2' }),
        request(app)
          .post('/api/v1/conversations')
          .set('X-API-Key', testApiKey)
          .send({ initialMessage: 'Message 3' }),
      ]);

      // All should succeed
      conversations.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.conversationId).toBeTruthy();
      });

      // All should have unique IDs
      const ids = conversations.map((r) => r.body.conversationId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);

      // Clean up
      await Promise.all(
        ids.map((id) =>
          request(app)
            .delete(`/api/v1/conversations/${id}`)
            .set('X-API-Key', testApiKey)
        )
      );
    });
  });
});
