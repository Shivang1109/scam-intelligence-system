/**
 * Unit tests for InMemoryConversationRepository
 */

import { InMemoryConversationRepository } from './InMemoryConversationRepository';
import { Conversation, ConversationState, EntityType } from '../types';

describe('InMemoryConversationRepository', () => {
  let repository: InMemoryConversationRepository;

  beforeEach(() => {
    repository = new InMemoryConversationRepository();
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
    messages: [
      {
        id: 'msg-1',
        sender: 'scammer',
        content: 'Hello',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
    ],
    extractedEntities: [],
    scamSignals: [],
    classification: null,
    riskScore: 0,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    metadata: {
      initialMessage: 'Hello',
      messageCount: 1,
      duration: 0,
      stateHistory: [],
    },
  });

  describe('save', () => {
    it('should save a conversation', async () => {
      const conversation = createMockConversation('conv-1');

      await repository.save(conversation);

      const retrieved = await repository.findById('conv-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(conversation.id);
      expect(retrieved?.state).toBe(conversation.state);
      expect(retrieved?.persona).toEqual(conversation.persona);
    });

    it('should overwrite existing conversation with same id', async () => {
      const conversation1 = createMockConversation('conv-1');
      const conversation2 = {
        ...createMockConversation('conv-1'),
        state: ConversationState.ENGAGEMENT,
      };

      await repository.save(conversation1);
      await repository.save(conversation2);

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.state).toBe(ConversationState.ENGAGEMENT);
    });

    it('should create independent copies to prevent external mutations', async () => {
      const conversation = createMockConversation('conv-1');

      await repository.save(conversation);

      // Mutate original
      conversation.state = ConversationState.TERMINATION;

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.state).toBe(ConversationState.INITIAL_CONTACT);
    });
  });

  describe('findById', () => {
    it('should return conversation if it exists', async () => {
      const conversation = createMockConversation('conv-1');
      await repository.save(conversation);

      const retrieved = await repository.findById('conv-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(conversation.id);
      expect(retrieved?.state).toBe(conversation.state);
    });

    it('should return null if conversation does not exist', async () => {
      const retrieved = await repository.findById('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should return independent copy to prevent external mutations', async () => {
      const conversation = createMockConversation('conv-1');
      await repository.save(conversation);

      const retrieved = await repository.findById('conv-1');
      retrieved!.state = ConversationState.TERMINATION;

      const retrievedAgain = await repository.findById('conv-1');
      expect(retrievedAgain?.state).toBe(ConversationState.INITIAL_CONTACT);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no conversations exist', async () => {
      const conversations = await repository.findAll();

      expect(conversations).toEqual([]);
    });

    it('should return all conversations', async () => {
      const conv1 = createMockConversation('conv-1');
      const conv2 = createMockConversation('conv-2');
      const conv3 = createMockConversation('conv-3');

      await repository.save(conv1);
      await repository.save(conv2);
      await repository.save(conv3);

      const conversations = await repository.findAll();

      expect(conversations).toHaveLength(3);
      expect(conversations.map((c) => c.id).sort()).toEqual([
        'conv-1',
        'conv-2',
        'conv-3',
      ]);
    });

    it('should return independent copies', async () => {
      const conversation = createMockConversation('conv-1');
      await repository.save(conversation);

      const conversations = await repository.findAll();
      conversations[0].state = ConversationState.TERMINATION;

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.state).toBe(ConversationState.INITIAL_CONTACT);
    });
  });

  describe('findActive', () => {
    it('should return only non-terminated conversations', async () => {
      const conv1 = createMockConversation('conv-1');
      const conv2 = {
        ...createMockConversation('conv-2'),
        state: ConversationState.TERMINATION,
      };
      const conv3 = {
        ...createMockConversation('conv-3'),
        state: ConversationState.ENGAGEMENT,
      };

      await repository.save(conv1);
      await repository.save(conv2);
      await repository.save(conv3);

      const active = await repository.findActive();

      expect(active).toHaveLength(2);
      expect(active.map((c) => c.id).sort()).toEqual(['conv-1', 'conv-3']);
    });

    it('should return empty array when all conversations are terminated', async () => {
      const conv1 = {
        ...createMockConversation('conv-1'),
        state: ConversationState.TERMINATION,
      };
      const conv2 = {
        ...createMockConversation('conv-2'),
        state: ConversationState.TERMINATION,
      };

      await repository.save(conv1);
      await repository.save(conv2);

      const active = await repository.findActive();

      expect(active).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update existing conversation', async () => {
      const conversation = createMockConversation('conv-1');
      await repository.save(conversation);

      const updated = {
        ...conversation,
        state: ConversationState.ENGAGEMENT,
        riskScore: 75,
      };
      await repository.update(updated);

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.state).toBe(ConversationState.ENGAGEMENT);
      expect(retrieved?.riskScore).toBe(75);
    });

    it('should throw error if conversation does not exist', async () => {
      const conversation = createMockConversation('non-existent');

      await expect(repository.update(conversation)).rejects.toThrow(
        'Conversation non-existent not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete existing conversation', async () => {
      const conversation = createMockConversation('conv-1');
      await repository.save(conversation);

      await repository.delete('conv-1');

      const retrieved = await repository.findById('conv-1');
      expect(retrieved).toBeNull();
    });

    it('should not throw error if conversation does not exist', async () => {
      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all conversations', async () => {
      await repository.save(createMockConversation('conv-1'));
      await repository.save(createMockConversation('conv-2'));
      await repository.save(createMockConversation('conv-3'));

      repository.clear();

      const conversations = await repository.findAll();
      expect(conversations).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return 0 when no conversations exist', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count of conversations', async () => {
      await repository.save(createMockConversation('conv-1'));
      await repository.save(createMockConversation('conv-2'));
      await repository.save(createMockConversation('conv-3'));

      expect(repository.count()).toBe(3);
    });
  });

  describe('data isolation', () => {
    it('should maintain data integrity with complex nested objects', async () => {
      const conversation = createMockConversation('conv-1');
      conversation.extractedEntities = [
        {
          type: EntityType.PHONE_NUMBER,
          value: '+1234567890',
          confidence: 0.95,
          context: 'Call me at +1234567890',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          metadata: {
            format: 'E.164',
            validated: true,
            countryCode: '+1',
          },
        },
      ];

      await repository.save(conversation);

      // Mutate original
      conversation.extractedEntities[0].value = 'MUTATED';

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.extractedEntities[0].value).toBe('+1234567890');
    });
  });
});
