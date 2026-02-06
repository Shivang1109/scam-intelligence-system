/**
 * Request Validation Tests
 * Tests for API request validation
 * 
 * Validates Requirements: 8.6
 */

import request from 'supertest';
import express, { Application } from 'express';
import { createConversationRoutes } from './conversations';
import { createReportRoutes } from './reports';
import { AgentController } from '../../agents/AgentController';
import { StateMachine } from '../../agents/StateMachine';
import { PersonaManager } from '../../agents/PersonaManager';
import { NLPExtractor } from '../../nlp/NLPExtractor';
import { ScamSignalDetector } from '../../nlp/ScamSignalDetector';
import { ScamClassifier } from '../../scoring/ScamClassifier';
import { RiskScorer } from '../../scoring/RiskScorer';
import { InMemoryConversationRepository } from '../../persistence/InMemoryConversationRepository';
import { InMemoryReportRepository } from '../../persistence/InMemoryReportRepository';
import { errorHandler } from '../middleware/errorHandler';

describe('Request Validation', () => {
  let app: Application;
  let agentController: AgentController;

  beforeEach(() => {
    // Create repositories
    const conversationRepo = new InMemoryConversationRepository();
    const reportRepo = new InMemoryReportRepository();

    // Create components
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
      riskScorer,
      conversationRepo
    );

    // Create Express app
    app = express();
    app.use(express.json());

    // Mount routes
    app.use('/api/v1/conversations', createConversationRoutes(agentController));
    app.use('/api/v1/reports', createReportRoutes(reportRepo));

    // Error handler
    app.use(errorHandler);
  });

  describe('POST /api/v1/conversations - Validation', () => {
    it('should reject request without initialMessage', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', 'test-key')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('initialMessage');
    });

    it('should reject request with non-string initialMessage', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', 'test-key')
        .send({ initialMessage: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('initialMessage');
      expect(response.body.error).toContain('string');
    });

    it('should reject request with empty initialMessage', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', 'test-key')
        .send({ initialMessage: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empty');
    });
  });

  describe('POST /api/v1/conversations/:id/messages - Validation', () => {
    it('should reject request without message', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/test-id/messages')
        .set('X-API-Key', 'test-key')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('message');
    });

    it('should reject request with non-string message', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/test-id/messages')
        .set('X-API-Key', 'test-key')
        .send({ message: 456 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('message');
      expect(response.body.error).toContain('string');
    });

    it('should reject request with empty message', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/test-id/messages')
        .set('X-API-Key', 'test-key')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empty');
    });
  });

  describe('GET /api/v1/reports - Pagination Validation', () => {
    it('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', 'test-key')
        .query({ page: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('page');
    });

    it('should reject negative page number', async () => {
      const response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', 'test-key')
        .query({ page: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('page');
    });

    it('should reject invalid page size', async () => {
      const response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', 'test-key')
        .query({ pageSize: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('page size');
    });

    it('should enforce maximum page size', async () => {
      const response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', 'test-key')
        .query({ pageSize: 1000 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Response Format', () => {
    it('should return descriptive error messages', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', 'test-key')
        .send({ initialMessage: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });
  });
});
