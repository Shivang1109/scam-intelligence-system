/**
 * Unit Tests for ReportGenerator
 * Tests report generation, validation, and export functionality
 */

import { ReportGenerator } from './ReportGenerator';
import { RiskScorer } from '../scoring/RiskScorer';
import {
  Conversation,
  ConversationState,
  EntityType,
  SignalType,
  ScamType,
  Entity,
  ScamSignal,
  Message,
  Persona,
} from '../types';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let riskScorer: RiskScorer;
  let conversationStore: Map<string, Conversation>;

  beforeEach(() => {
    riskScorer = new RiskScorer();
    conversationStore = new Map();
    reportGenerator = new ReportGenerator(riskScorer, conversationStore);
  });

  // Helper function to create a test persona
  const createTestPersona = (): Persona => ({
    id: 'persona-1',
    name: 'Elderly User',
    age: 70,
    background: 'Retired teacher',
    vulnerabilityLevel: 8,
    communicationStyle: 'polite',
    typicalResponses: ['Hello', 'Thank you'],
    characteristics: {
      techSavvy: 3,
      trustLevel: 8,
      financialAwareness: 4,
      responseSpeed: 5,
    },
  });

  // Helper function to create a test conversation
  const createTestConversation = (overrides?: Partial<Conversation>): Conversation => {
    const baseConversation: Conversation = {
      id: 'conv-123',
      state: ConversationState.TERMINATION,
      persona: createTestPersona(),
      messages: [
        {
          id: 'msg-1',
          sender: 'scammer',
          content: 'Hello, this is Microsoft support',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          sender: 'system',
          content: 'Oh hello, is something wrong?',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
      ],
      extractedEntities: [
        {
          type: EntityType.ORGANIZATION,
          value: 'Microsoft',
          confidence: 0.9,
          context: 'this is Microsoft support',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          metadata: {
            validated: true,
          },
        },
      ],
      scamSignals: [
        {
          type: SignalType.IMPERSONATION,
          confidence: 0.85,
          text: 'Microsoft support',
          context: 'this is Microsoft support',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      classification: {
        primaryType: ScamType.TECH_SUPPORT,
        primaryConfidence: 0.9,
        secondaryTypes: [{ type: ScamType.IMPERSONATION, confidence: 0.7 }],
        updatedAt: new Date('2024-01-01T10:01:00Z'),
      },
      riskScore: 75,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:01:00Z'),
      metadata: {
        initialMessage: 'Hello, this is Microsoft support',
        messageCount: 2,
        duration: 60,
        stateHistory: [
          {
            fromState: ConversationState.IDLE,
            toState: ConversationState.INITIAL_CONTACT,
            timestamp: new Date('2024-01-01T10:00:00Z'),
            reason: 'Conversation initiated',
          },
          {
            fromState: ConversationState.INITIAL_CONTACT,
            toState: ConversationState.TERMINATION,
            timestamp: new Date('2024-01-01T10:01:00Z'),
            reason: 'Conversation ended',
          },
        ],
      },
    };

    return { ...baseConversation, ...overrides };
  };

  describe('generateReport', () => {
    it('should generate a complete intelligence report', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report).toBeDefined();
      expect(report.conversationId).toBe(conversation.id);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.persona.id).toBe(conversation.persona.id);
      expect(report.persona.name).toBe(conversation.persona.name);
    });

    it('should include scam classification in report', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.scamClassification).toBeDefined();
      expect(report.scamClassification?.primaryType).toBe(ScamType.TECH_SUPPORT);
      expect(report.scamClassification?.primaryConfidence).toBe(0.9);
      expect(report.scamClassification?.secondaryTypes).toHaveLength(1);
    });

    it('should handle null classification', async () => {
      const conversation = createTestConversation({ classification: null });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.scamClassification).toBeNull();
    });

    it('should include calculated risk score', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.riskScore).toBeDefined();
      expect(report.riskScore.score).toBeGreaterThanOrEqual(0);
      expect(report.riskScore.score).toBeLessThanOrEqual(100);
      expect(report.riskScore.breakdown).toBeDefined();
      expect(report.riskScore.calculatedAt).toBeInstanceOf(Date);
    });

    it('should include all extracted entities with metadata', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.extractedEntities).toHaveLength(1);
      const entity = report.extractedEntities[0];
      expect(entity.type).toBe(EntityType.ORGANIZATION);
      expect(entity.value).toBe('Microsoft');
      expect(entity.confidence).toBe(0.9);
      expect(entity.context).toBeDefined();
      expect(entity.timestamp).toBeInstanceOf(Date);
      expect(entity.metadata).toBeDefined();
      expect(entity.metadata.validated).toBe(true);
    });

    it('should include all scam signals', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.scamSignals).toHaveLength(1);
      const signal = report.scamSignals[0];
      expect(signal.type).toBe(SignalType.IMPERSONATION);
      expect(signal.confidence).toBe(0.85);
      expect(signal.text).toBeDefined();
      expect(signal.context).toBeDefined();
      expect(signal.timestamp).toBeInstanceOf(Date);
    });

    it('should include conversation metadata', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.conversationMetadata).toBeDefined();
      expect(report.conversationMetadata.duration).toBe(60); // 60 seconds between messages
      expect(report.conversationMetadata.messageCount).toBe(2);
      expect(report.conversationMetadata.stateTransitions).toHaveLength(2);
    });

    it('should include full conversation transcript', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.transcript).toHaveLength(2);
      expect(report.transcript[0].sender).toBe('scammer');
      expect(report.transcript[0].content).toBe('Hello, this is Microsoft support');
      expect(report.transcript[1].sender).toBe('system');
    });

    it('should calculate duration correctly', async () => {
      const conversation = createTestConversation({
        messages: [
          {
            id: 'msg-1',
            sender: 'scammer',
            content: 'First message',
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
          {
            id: 'msg-2',
            sender: 'system',
            content: 'Second message',
            timestamp: new Date('2024-01-01T10:05:30Z'),
          },
        ],
      });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.conversationMetadata.duration).toBe(330); // 5 minutes 30 seconds = 330 seconds
    });

    it('should handle empty messages array', async () => {
      const conversation = createTestConversation({ messages: [] });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.conversationMetadata.duration).toBe(0);
      expect(report.transcript).toHaveLength(0);
    });

    it('should throw error for non-existent conversation', async () => {
      await expect(
        reportGenerator.generateReport('non-existent-id')
      ).rejects.toThrow('Conversation not found');
    });

    it('should handle multiple entities of different types', async () => {
      const entities: Entity[] = [
        {
          type: EntityType.PHONE_NUMBER,
          value: '+1234567890',
          confidence: 0.95,
          context: 'Call me at +1234567890',
          timestamp: new Date(),
          metadata: { validated: true, countryCode: '+1', format: 'E.164' },
        },
        {
          type: EntityType.URL,
          value: 'https://fake-bank.com',
          confidence: 0.88,
          context: 'Visit https://fake-bank.com',
          timestamp: new Date(),
          metadata: { validated: true, domain: 'fake-bank.com' },
        },
        {
          type: EntityType.PAYMENT_ID,
          value: 'user@upi',
          confidence: 0.92,
          context: 'Send to user@upi',
          timestamp: new Date(),
          metadata: { validated: true, paymentSystem: 'UPI' },
        },
      ];

      const conversation = createTestConversation({ extractedEntities: entities });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.extractedEntities).toHaveLength(3);
      expect(report.extractedEntities.map(e => e.type)).toContain(EntityType.PHONE_NUMBER);
      expect(report.extractedEntities.map(e => e.type)).toContain(EntityType.URL);
      expect(report.extractedEntities.map(e => e.type)).toContain(EntityType.PAYMENT_ID);
    });

    it('should handle multiple scam signals', async () => {
      const signals: ScamSignal[] = [
        {
          type: SignalType.URGENCY,
          confidence: 0.9,
          text: 'Act now!',
          context: 'You must act now!',
          timestamp: new Date(),
        },
        {
          type: SignalType.FINANCIAL_REQUEST,
          confidence: 0.85,
          text: 'Send $500',
          context: 'Please send $500',
          timestamp: new Date(),
        },
        {
          type: SignalType.THREAT,
          confidence: 0.8,
          text: 'Account will be closed',
          context: 'Your account will be closed',
          timestamp: new Date(),
        },
      ];

      const conversation = createTestConversation({ scamSignals: signals });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.scamSignals).toHaveLength(3);
      expect(report.scamSignals.map(s => s.type)).toContain(SignalType.URGENCY);
      expect(report.scamSignals.map(s => s.type)).toContain(SignalType.FINANCIAL_REQUEST);
      expect(report.scamSignals.map(s => s.type)).toContain(SignalType.THREAT);
    });
  });

  describe('validateReport', () => {
    it('should validate a complete valid report', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      const isValid = reportGenerator.validateReport(report);

      expect(isValid).toBe(true);
    });

    it('should reject report with missing conversationId', () => {
      const invalidReport = {
        timestamp: new Date(),
        persona: { id: 'p1', name: 'Test' },
      } as any;

      const isValid = reportGenerator.validateReport(invalidReport);
      expect(isValid).toBe(false);
    });

    it('should reject report with invalid timestamp', () => {
      const invalidReport = {
        conversationId: 'conv-123',
        timestamp: 'not-a-date',
        persona: { id: 'p1', name: 'Test' },
      } as any;

      const isValid = reportGenerator.validateReport(invalidReport);
      expect(isValid).toBe(false);
    });

    it('should reject report with missing persona', () => {
      const invalidReport = {
        conversationId: 'conv-123',
        timestamp: new Date(),
      } as any;

      const isValid = reportGenerator.validateReport(invalidReport);
      expect(isValid).toBe(false);
    });

    it('should reject report with invalid risk score', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      report.riskScore.score = 150; // Out of bounds

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with negative risk score', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      report.riskScore.score = -10; // Out of bounds

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with invalid entity confidence', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      report.extractedEntities[0].confidence = 1.5; // Out of bounds

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with missing entity metadata', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      delete (report.extractedEntities[0] as any).metadata;

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with invalid message sender', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      (report.transcript[0] as any).sender = 'invalid-sender';

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should accept report with null classification', async () => {
      const conversation = createTestConversation({ classification: null });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      const isValid = reportGenerator.validateReport(report);

      expect(isValid).toBe(true);
    });

    it('should reject report with invalid classification structure', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      delete (report.scamClassification as any).primaryType;

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with non-array extractedEntities', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      (report as any).extractedEntities = 'not-an-array';

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with non-array scamSignals', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      (report as any).scamSignals = 'not-an-array';

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });

    it('should reject report with invalid conversationMetadata', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);
      delete (report.conversationMetadata as any).duration;

      const isValid = reportGenerator.validateReport(report);
      expect(isValid).toBe(false);
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON string', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const jsonString = await reportGenerator.exportReport(conversation.id, 'json');

      expect(typeof jsonString).toBe('string');
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it('should export report with proper formatting', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const jsonString = await reportGenerator.exportReport(conversation.id, 'json');
      const parsed = JSON.parse(jsonString);

      expect(parsed.conversationId).toBe(conversation.id);
      expect(parsed.persona.id).toBe(conversation.persona.id);
    });

    it('should reject unsupported export formats', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      await expect(
        reportGenerator.exportReport(conversation.id, 'xml')
      ).rejects.toThrow('Unsupported export format');
    });

    it('should handle case-insensitive format parameter', async () => {
      const conversation = createTestConversation();
      conversationStore.set(conversation.id, conversation);

      const jsonString = await reportGenerator.exportReport(conversation.id, 'JSON');

      expect(typeof jsonString).toBe('string');
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });

  describe('helper methods', () => {
    it('should register conversation', () => {
      const conversation = createTestConversation();
      reportGenerator.registerConversation(conversation);

      const ids = reportGenerator.getRegisteredConversationIds();
      expect(ids).toContain(conversation.id);
    });

    it('should unregister conversation', () => {
      const conversation = createTestConversation();
      reportGenerator.registerConversation(conversation);
      reportGenerator.unregisterConversation(conversation.id);

      const ids = reportGenerator.getRegisteredConversationIds();
      expect(ids).not.toContain(conversation.id);
    });

    it('should get all registered conversation IDs', () => {
      const conv1 = createTestConversation({ id: 'conv-1' });
      const conv2 = createTestConversation({ id: 'conv-2' });

      reportGenerator.registerConversation(conv1);
      reportGenerator.registerConversation(conv2);

      const ids = reportGenerator.getRegisteredConversationIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('conv-1');
      expect(ids).toContain('conv-2');
    });
  });

  describe('edge cases', () => {
    it('should handle conversation with no entities', async () => {
      const conversation = createTestConversation({ extractedEntities: [] });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.extractedEntities).toHaveLength(0);
      expect(reportGenerator.validateReport(report)).toBe(true);
    });

    it('should handle conversation with no signals', async () => {
      const conversation = createTestConversation({ scamSignals: [] });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.scamSignals).toHaveLength(0);
      expect(reportGenerator.validateReport(report)).toBe(true);
    });

    it('should handle conversation with no state transitions', async () => {
      const conversation = createTestConversation({
        metadata: {
          initialMessage: 'Test',
          messageCount: 1,
          duration: 0,
          stateHistory: [],
        },
      });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.conversationMetadata.stateTransitions).toHaveLength(0);
      expect(reportGenerator.validateReport(report)).toBe(true);
    });

    it('should handle single message conversation', async () => {
      const conversation = createTestConversation({
        messages: [
          {
            id: 'msg-1',
            sender: 'scammer',
            content: 'Hello',
            timestamp: new Date('2024-01-01T10:00:00Z'),
          },
        ],
      });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.conversationMetadata.duration).toBe(0);
      expect(report.transcript).toHaveLength(1);
    });

    it('should handle very long conversations', async () => {
      const messages: Message[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          id: `msg-${i}`,
          sender: i % 2 === 0 ? 'scammer' : 'system',
          content: `Message ${i}`,
          timestamp: new Date(`2024-01-01T10:${String(i).padStart(2, '0')}:00Z`),
        });
      }

      const conversation = createTestConversation({ messages });
      conversationStore.set(conversation.id, conversation);

      const report = await reportGenerator.generateReport(conversation.id);

      expect(report.transcript).toHaveLength(100);
      expect(report.conversationMetadata.messageCount).toBe(100);
      expect(reportGenerator.validateReport(report)).toBe(true);
    });
  });
});
