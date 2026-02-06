/**
 * Integration Tests
 * End-to-end tests for complete conversation flows
 * 
 * Validates Requirements: All requirements
 */

import { Application } from './app';
import { Application as ExpressApp } from 'express';
import request from 'supertest';

describe('Integration Tests - End-to-End Flows', () => {
  let application: Application;
  let app: ExpressApp;
  const TEST_API_KEY = 'test-api-key-12345';

  beforeEach(async () => {
    application = new Application();
    await application.initialize();
    const server = application.getServer();
    if (!server) {
      throw new Error('Server not initialized');
    }
    app = server.getApp();
  });

  afterEach(async () => {
    await application.shutdown();
  });

  describe('Phishing Scam Flow', () => {
    it('should handle complete phishing scam conversation', async () => {
      // Create conversation with phishing initial message
      const createResponse = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({
          initialMessage: 'Your bank account has been compromised. Click here immediately: http://fake-bank.com',
        });

      expect(createResponse.status).toBe(201);
      const conversationId = createResponse.body.conversationId;

      // Send follow-up message with payment request
      const msg1Response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({
          message: 'Please verify your account by sending payment to UPI: scammer@paytm',
        });

      expect(msg1Response.status).toBe(200);
      expect(msg1Response.body.content).toBeDefined();

      // Get conversation details
      const convResponse = await request(app)
        .get(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', TEST_API_KEY);

      expect(convResponse.status).toBe(200);
      expect(convResponse.body.extractedEntities.length).toBeGreaterThan(0);
      expect(convResponse.body.scamSignals.length).toBeGreaterThan(0);
      expect(convResponse.body.classification.types).toContain('phishing');
      expect(convResponse.body.riskScore).toBeGreaterThan(0);
    });
  });

  describe('Tech Support Scam Flow', () => {
    it('should handle complete tech support scam conversation', async () => {
      // Create conversation
      const createResponse = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({
          initialMessage: 'This is Microsoft Support. Your computer has a virus. Call us at +1-800-123-4567',
        });

      expect(createResponse.status).toBe(201);
      const conversationId = createResponse.body.conversationId;

      // Send follow-up with payment request
      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({
          message: 'We need $299 to fix your computer. Pay now or your data will be lost!',
        });

      // Get conversation
      const convResponse = await request(app)
        .get(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', TEST_API_KEY);

      expect(convResponse.status).toBe(200);
      expect(convResponse.body.classification.types).toContain('tech_support');
      expect(convResponse.body.scamSignals.some((s: any) => s.type === 'urgency')).toBe(true);
      expect(convResponse.body.scamSignals.some((s: any) => s.type === 'authority_impersonation')).toBe(true);
    });
  });

  describe('Investment Scam Flow', () => {
    it('should handle complete investment scam conversation', async () => {
      // Create conversation
      const createResponse = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({
          initialMessage: 'Guaranteed 500% returns in 30 days! Limited spots available. Invest now!',
        });

      expect(createResponse.status).toBe(201);
      const conversationId = createResponse.body.conversationId;

      // Send follow-up
      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({
          message: 'Send Bitcoin to wallet: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        });

      // Get conversation
      const convResponse = await request(app)
        .get(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', TEST_API_KEY);

      expect(convResponse.status).toBe(200);
      expect(convResponse.body.classification.types).toContain('investment');
      expect(convResponse.body.extractedEntities.some((e: any) => e.type === 'payment_id')).toBe(true);
    });
  });

  describe('API to Report Generation Pipeline', () => {
    it('should generate report after conversation termination', async () => {
      // Create and run conversation
      const createResponse = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({
          initialMessage: 'You won the lottery! Send $100 processing fee to claim your prize.',
        });

      const conversationId = createResponse.body.conversationId;

      // Send multiple messages to build intelligence
      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({ message: 'Call +1-555-0123 to claim' });

      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({ message: 'Send payment to account 123456789' });

      // Terminate conversation
      await request(app)
        .delete(`/api/v1/conversations/${conversationId}`)
        .set('X-API-Key', TEST_API_KEY);

      // Get report
      const reportResponse = await request(app)
        .get(`/api/v1/reports/${conversationId}`)
        .set('X-API-Key', TEST_API_KEY);

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.conversationId).toBe(conversationId);
      expect(reportResponse.body.extractedEntities).toBeDefined();
      expect(reportResponse.body.scamSignals).toBeDefined();
      expect(reportResponse.body.scamClassification).toBeDefined();
      expect(reportResponse.body.riskScore).toBeDefined();
      expect(reportResponse.body.transcript).toBeDefined();
      expect(reportResponse.body.transcript.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Conversation Handling', () => {
    it('should handle multiple concurrent conversations independently', async () => {
      // Create first conversation
      const conv1Response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({ initialMessage: 'Phishing attempt 1' });

      const conv1Id = conv1Response.body.conversationId;

      // Create second conversation
      const conv2Response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({ initialMessage: 'Tech support scam attempt' });

      const conv2Id = conv2Response.body.conversationId;

      // Send messages to both
      await request(app)
        .post(`/api/v1/conversations/${conv1Id}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({ message: 'Phishing follow-up' });

      await request(app)
        .post(`/api/v1/conversations/${conv2Id}/messages`)
        .set('X-API-Key', TEST_API_KEY)
        .send({ message: 'Tech support follow-up' });

      // Get both conversations
      const conv1 = await request(app)
        .get(`/api/v1/conversations/${conv1Id}`)
        .set('X-API-Key', TEST_API_KEY);

      const conv2 = await request(app)
        .get(`/api/v1/conversations/${conv2Id}`)
        .set('X-API-Key', TEST_API_KEY);

      // Verify isolation
      expect(conv1.body.id).toBe(conv1Id);
      expect(conv2.body.id).toBe(conv2Id);
      expect(conv1.body.messages).not.toEqual(conv2.body.messages);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid conversation ID gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/conversations/invalid-id')
        .set('X-API-Key', TEST_API_KEY);

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .send({ initialMessage: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should handle invalid request body', async () => {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set('X-API-Key', TEST_API_KEY)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('initialMessage');
    });
  });

  describe('Report Pagination', () => {
    it('should paginate reports correctly', async () => {
      // Create and terminate multiple conversations
      for (let i = 0; i < 5; i++) {
        const createResponse = await request(app)
          .post('/api/v1/conversations')
          .set('X-API-Key', TEST_API_KEY)
          .send({ initialMessage: `Test message ${i}` });

        const conversationId = createResponse.body.conversationId;

        await request(app)
          .delete(`/api/v1/conversations/${conversationId}`)
          .set('X-API-Key', TEST_API_KEY);
      }

      // Get first page
      const page1Response = await request(app)
        .get('/api/v1/reports')
        .set('X-API-Key', TEST_API_KEY)
        .query({ page: 1, pageSize: 2 });

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.reports.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.pageSize).toBe(2);
      expect(page1Response.body.pagination.totalCount).toBeGreaterThanOrEqual(5);
    });
  });
});
