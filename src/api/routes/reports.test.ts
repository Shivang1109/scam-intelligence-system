/**
 * Report Routes Unit Tests
 * Tests the report API endpoints
 */

import request from 'supertest';
import express, { Application } from 'express';
import { createReportRoutes } from './reports';
import { InMemoryReportRepository } from '../../persistence/InMemoryReportRepository';
import { IntelligenceReport, ScamType } from '../../types';
import { addAPIKey, removeAPIKey } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';

describe('Report Routes', () => {
  let app: Application;
  let reportRepository: InMemoryReportRepository;
  const testApiKey = 'test-report-routes-key';

  beforeAll(() => {
    // Add test API key
    addAPIKey(testApiKey, 'test-client', 'Test Client');
  });

  afterAll(() => {
    // Clean up test API key
    removeAPIKey(testApiKey);
  });

  beforeEach(() => {
    // Create repository
    reportRepository = new InMemoryReportRepository();

    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/reports', createReportRoutes(reportRepository));
    app.use(errorHandler);
  });

  afterEach(() => {
    // Clean up repository
    reportRepository.clear();
  });

  describe('GET /api/v1/reports/:id', () => {
    it('should retrieve report by ID', async () => {
      // Create a test report
      const testReport: IntelligenceReport = {
        conversationId: 'test-conv-123',
        timestamp: new Date(),
        persona: {
          id: 'persona-1',
          name: 'Test Persona',
        },
        scamClassification: {
          primaryType: ScamType.PHISHING,
          primaryConfidence: 0.9,
          secondaryTypes: [],
          updatedAt: new Date(),
        },
        riskScore: {
          score: 75,
          breakdown: {
            signalScore: 20,
            entityScore: 15,
            classificationScore: 20,
            urgencyScore: 10,
            financialScore: 10,
          },
          calculatedAt: new Date(),
        },
        extractedEntities: [],
        scamSignals: [],
        conversationMetadata: {
          duration: 300,
          messageCount: 5,
          stateTransitions: [],
        },
        transcript: [],
      };

      await reportRepository.save(testReport);

      // Retrieve report
      const response = await request(app)
        .get('/api/v1/reports/test-conv-123')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('conversationId', 'test-conv-123');
      expect(response.body).toHaveProperty('persona');
      expect(response.body).toHaveProperty('scamClassification');
      expect(response.body).toHaveProperty('riskScore');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/v1/reports/test-conv-123')
        .expect(401);
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/non-existent-id')
        .set('X-API-Key', testApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/v1/reports', () => {
    beforeEach(async () => {
      // Create multiple test reports
      for (let i = 1; i <= 25; i++) {
        const report: IntelligenceReport = {
          conversationId: `conv-${i}`,
          timestamp: new Date(),
          persona: { id: `persona-${i}`, name: `Persona ${i}` },
          scamClassification: {
            primaryType: ScamType.PHISHING,
            primaryConfidence: 0.8,
            secondaryTypes: [],
            updatedAt: new Date(),
          },
          riskScore: {
            score: 50 + i,
            breakdown: {
              signalScore: 10,
              entityScore: 10,
              classificationScore: 10,
              urgencyScore: 10,
              financialScore: 10,
            },
            calculatedAt: new Date(),
          },
          extractedEntities: [],
          scamSignals: [],
          conversationMetadata: {
            duration: 100,
            messageCount: 3,
            stateTransitions: [],
          },
          transcript: [],
        };
        await reportRepository.save(report);
      }
    });

    it('should retrieve reports with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.reports).toHaveLength(10); // Default page size
      expect(response.body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        totalCount: 25,
        totalPages: 3,
      });
    });

    it('should retrieve reports with custom page size', async () => {
      const response = await request(app)
        .get('/api/v1/reports?pageSize=5')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.reports).toHaveLength(5);
      expect(response.body.pagination.pageSize).toBe(5);
      expect(response.body.pagination.totalPages).toBe(5);
    });

    it('should retrieve specific page', async () => {
      const response = await request(app)
        .get('/api/v1/reports?page=2&pageSize=10')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.reports).toHaveLength(10);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should retrieve last page with remaining items', async () => {
      const response = await request(app)
        .get('/api/v1/reports?page=3&pageSize=10')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.reports).toHaveLength(5); // 25 total, 20 in first 2 pages
      expect(response.body.pagination.page).toBe(3);
    });

    it('should return empty array for page beyond total', async () => {
      const response = await request(app)
        .get('/api/v1/reports?page=10&pageSize=10')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.reports).toHaveLength(0);
      expect(response.body.pagination.page).toBe(10);
    });

    it('should enforce maximum page size of 100', async () => {
      const response = await request(app)
        .get('/api/v1/reports?pageSize=200')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.pagination.pageSize).toBe(100); // Capped at 100
    });

    it('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/api/v1/reports?page=0')
        .set('X-API-Key', testApiKey)
        .expect(400);

      expect(response.body.error).toContain('Invalid page number');
    });

    it('should reject negative page number', async () => {
      const response = await request(app)
        .get('/api/v1/reports?page=-1')
        .set('X-API-Key', testApiKey)
        .expect(400);

      expect(response.body.error).toContain('Invalid page number');
    });

    it('should reject invalid page size', async () => {
      const response = await request(app)
        .get('/api/v1/reports?pageSize=0')
        .set('X-API-Key', testApiKey)
        .expect(400);

      expect(response.body.error).toContain('Invalid page size');
    });

    it('should reject non-numeric page parameter', async () => {
      const response = await request(app)
        .get('/api/v1/reports?page=abc')
        .set('X-API-Key', testApiKey)
        .expect(400);

      expect(response.body.error).toContain('Invalid page number');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/v1/reports')
        .expect(401);
    });

    it('should handle empty repository', async () => {
      reportRepository.clear();

      const response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(response.body.reports).toHaveLength(0);
      expect(response.body.pagination.totalCount).toBe(0);
      expect(response.body.pagination.totalPages).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete report retrieval flow', async () => {
      // Create a report
      const testReport: IntelligenceReport = {
        conversationId: 'integration-test-123',
        timestamp: new Date(),
        persona: { id: 'persona-1', name: 'Test Persona' },
        scamClassification: {
          primaryType: ScamType.TECH_SUPPORT,
          primaryConfidence: 0.95,
          secondaryTypes: [],
          updatedAt: new Date(),
        },
        riskScore: {
          score: 85,
          breakdown: {
            signalScore: 20,
            entityScore: 20,
            classificationScore: 20,
            urgencyScore: 15,
            financialScore: 10,
          },
          calculatedAt: new Date(),
        },
        extractedEntities: [],
        scamSignals: [],
        conversationMetadata: {
          duration: 500,
          messageCount: 10,
          stateTransitions: [],
        },
        transcript: [],
      };

      await reportRepository.save(testReport);

      // 1. List all reports
      const listResponse = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(listResponse.body.reports.length).toBeGreaterThan(0);
      expect(listResponse.body.pagination.totalCount).toBeGreaterThan(0);

      // 2. Get specific report
      const getResponse = await request(app)
        .get('/api/v1/reports/integration-test-123')
        .set('X-API-Key', testApiKey)
        .expect(200);

      expect(getResponse.body.conversationId).toBe('integration-test-123');
      expect(getResponse.body.riskScore.score).toBe(85);
    });
  });
});
