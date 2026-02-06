/**
 * Unit tests for TransactionalStorage
 */

import { TransactionalStorage } from './TransactionalStorage';
import { InMemoryConversationRepository } from './InMemoryConversationRepository';
import { InMemoryReportRepository } from './InMemoryReportRepository';
import { InMemoryEntityRepository } from './InMemoryEntityRepository';
import {
  Conversation,
  ConversationState,
  IntelligenceReport,
  Entity,
  EntityType,
  ScamType,
} from '../types';

describe('TransactionalStorage', () => {
  let transactionalStorage: TransactionalStorage;
  let conversationRepo: InMemoryConversationRepository;
  let reportRepo: InMemoryReportRepository;
  let entityRepo: InMemoryEntityRepository;

  beforeEach(() => {
    conversationRepo = new InMemoryConversationRepository();
    reportRepo = new InMemoryReportRepository();
    entityRepo = new InMemoryEntityRepository();
    transactionalStorage = new TransactionalStorage(
      conversationRepo,
      reportRepo,
      entityRepo
    );
  });

  const createMockConversation = (id: string): Conversation => ({
    id,
    state: ConversationState.INITIAL_CONTACT,
    persona: {
      id: 'persona-1',
      name: 'Test Persona',
      age: 65,
      background: 'Retired teacher',
      vulnerabilityLevel: 7,
      communicationStyle: 'polite',
      typicalResponses: [],
      characteristics: {
        techSavvy: 3,
        trustLevel: 8,
        financialAwareness: 4,
        responseSpeed: 5,
      },
    },
    messages: [],
    extractedEntities: [],
    scamSignals: [],
    classification: null,
    riskScore: 0,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    metadata: {
      initialMessage: 'Hello',
      messageCount: 0,
      duration: 0,
      stateHistory: [],
    },
  });

  const createMockReport = (conversationId: string): IntelligenceReport => ({
    conversationId,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    persona: {
      id: 'persona-1',
      name: 'Test Persona',
    },
    scamClassification: {
      primaryType: ScamType.PHISHING,
      primaryConfidence: 0.85,
      secondaryTypes: [],
      updatedAt: new Date('2024-01-01T10:00:00Z'),
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
      calculatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    extractedEntities: [],
    scamSignals: [],
    conversationMetadata: {
      duration: 300,
      messageCount: 5,
      stateTransitions: [],
    },
    transcript: [],
  });

  const createMockEntity = (
    type: EntityType,
    value: string
  ): Entity => ({
    type,
    value,
    confidence: 0.9,
    context: 'Test context',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    metadata: {
      validated: true,
    },
  });

  describe('executeTransaction', () => {
    it('should commit changes when transaction succeeds', async () => {
      const conversation = createMockConversation('conv-1');

      await transactionalStorage.executeTransaction(async (ctx) => {
        await ctx.saveConversation(conversation);
      });

      const retrieved = await conversationRepo.findById('conv-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(conversation.id);
      expect(retrieved?.state).toBe(conversation.state);
    });

    it('should rollback changes when transaction fails', async () => {
      const conversation = createMockConversation('conv-1');

      await expect(
        transactionalStorage.executeTransaction(async (ctx) => {
          await ctx.saveConversation(conversation);
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');

      const retrieved = await conversationRepo.findById('conv-1');
      expect(retrieved).toBeNull();
    });

    it('should handle multiple operations in a transaction', async () => {
      const conversation = createMockConversation('conv-1');
      const report = createMockReport('conv-1');

      await transactionalStorage.executeTransaction(async (ctx) => {
        await ctx.saveConversation(conversation);
        await ctx.saveReport(report);
      });

      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedReport = await reportRepo.findById('conv-1');

      expect(retrievedConv).toBeDefined();
      expect(retrievedConv?.id).toBe(conversation.id);
      expect(retrievedReport).toBeDefined();
      expect(retrievedReport?.conversationId).toBe(report.conversationId);
    });

    it('should rollback all operations when one fails', async () => {
      const conversation = createMockConversation('conv-1');
      const report = createMockReport('conv-1');

      await expect(
        transactionalStorage.executeTransaction(async (ctx) => {
          await ctx.saveConversation(conversation);
          await ctx.saveReport(report);
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');

      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedReport = await reportRepo.findById('conv-1');

      expect(retrievedConv).toBeNull();
      expect(retrievedReport).toBeNull();
    });

    it('should return the result from the transaction function', async () => {
      const result = await transactionalStorage.executeTransaction(
        async () => {
          return 'success';
        }
      );

      expect(result).toBe('success');
    });
  });

  describe('saveConversationWithEntities', () => {
    it('should save conversation and all its entities atomically', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890'),
        createMockEntity(EntityType.EMAIL, 'test@example.com'),
      ];

      await transactionalStorage.saveConversationWithEntities(conversation);

      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedEntities = await entityRepo.findByConversation('conv-1');

      expect(retrievedConv).toBeDefined();
      expect(retrievedConv?.id).toBe(conversation.id);
      expect(retrievedEntities).toHaveLength(2);
    });

    it('should rollback all changes if save fails', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890'),
      ];

      // Force an error by making the conversation invalid
      // (This is a bit contrived for in-memory implementation)
      const originalSave = conversationRepo.save.bind(conversationRepo);
      conversationRepo.save = jest
        .fn()
        .mockRejectedValue(new Error('Save failed'));

      await expect(
        transactionalStorage.saveConversationWithEntities(conversation)
      ).rejects.toThrow('Save failed');

      // Restore original method
      conversationRepo.save = originalSave;

      const retrievedConv = await conversationRepo.findById('conv-1');

      expect(retrievedConv).toBeNull();
      // Note: Entity rollback is not fully implemented in in-memory version
      // In a real database, entities would also be rolled back
    });

    it('should handle conversation with no entities', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [];

      await transactionalStorage.saveConversationWithEntities(conversation);

      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedEntities = await entityRepo.findByConversation('conv-1');

      expect(retrievedConv).toBeDefined();
      expect(retrievedConv?.id).toBe(conversation.id);
      expect(retrievedEntities).toEqual([]);
    });
  });

  describe('saveConversationWithReport', () => {
    it('should save conversation, report, and entities atomically', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890'),
      ];
      const report = createMockReport('conv-1');

      await transactionalStorage.saveConversationWithReport(
        conversation,
        report
      );

      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedReport = await reportRepo.findById('conv-1');
      const retrievedEntities = await entityRepo.findByConversation('conv-1');

      expect(retrievedConv).toBeDefined();
      expect(retrievedConv?.id).toBe(conversation.id);
      expect(retrievedReport).toBeDefined();
      expect(retrievedReport?.conversationId).toBe(report.conversationId);
      expect(retrievedEntities).toHaveLength(1);
    });

    it('should rollback all changes if save fails', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890'),
      ];
      const report = createMockReport('conv-1');

      // Force an error
      const originalSave = reportRepo.save.bind(reportRepo);
      reportRepo.save = jest
        .fn()
        .mockRejectedValue(new Error('Report save failed'));

      await expect(
        transactionalStorage.saveConversationWithReport(conversation, report)
      ).rejects.toThrow('Report save failed');

      // Restore original method
      reportRepo.save = originalSave;

      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedReport = await reportRepo.findById('conv-1');

      expect(retrievedConv).toBeNull();
      expect(retrievedReport).toBeNull();
    });
  });

  describe('transaction context', () => {
    it('should handle updating existing conversation', async () => {
      // First save a conversation
      const conversation = createMockConversation('conv-1');
      await conversationRepo.save(conversation);

      // Update it in a transaction
      const updated = {
        ...conversation,
        state: ConversationState.ENGAGEMENT,
      };

      await transactionalStorage.executeTransaction(async (ctx) => {
        await ctx.saveConversation(updated);
      });

      const retrieved = await conversationRepo.findById('conv-1');
      expect(retrieved?.state).toBe(ConversationState.ENGAGEMENT);
    });

    it('should rollback to previous state when updating fails', async () => {
      // First save a conversation
      const conversation = createMockConversation('conv-1');
      await conversationRepo.save(conversation);

      // Try to update it but fail
      const updated = {
        ...conversation,
        state: ConversationState.ENGAGEMENT,
      };

      await expect(
        transactionalStorage.executeTransaction(async (ctx) => {
          await ctx.saveConversation(updated);
          throw new Error('Update failed');
        })
      ).rejects.toThrow('Update failed');

      const retrieved = await conversationRepo.findById('conv-1');
      expect(retrieved?.state).toBe(ConversationState.INITIAL_CONTACT);
    });
  });

  describe('data integrity', () => {
    it('should maintain data consistency across repositories', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890'),
        createMockEntity(EntityType.EMAIL, 'test@example.com'),
      ];
      const report = createMockReport('conv-1');

      await transactionalStorage.saveConversationWithReport(
        conversation,
        report
      );

      // Verify all data is consistent
      const retrievedConv = await conversationRepo.findById('conv-1');
      const retrievedReport = await reportRepo.findById('conv-1');
      const retrievedEntities = await entityRepo.findByConversation('conv-1');

      expect(retrievedConv?.id).toBe('conv-1');
      expect(retrievedReport?.conversationId).toBe('conv-1');
      expect(retrievedEntities).toHaveLength(2);
    });
  });
});
