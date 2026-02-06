/**
 * Unit tests for InMemoryEntityRepository
 */

import { InMemoryEntityRepository } from './InMemoryEntityRepository';
import { Entity, EntityType } from '../types';

describe('InMemoryEntityRepository', () => {
  let repository: InMemoryEntityRepository;

  beforeEach(() => {
    repository = new InMemoryEntityRepository();
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

  describe('save', () => {
    it('should save an entity for a conversation', async () => {
      const entity = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');

      await repository.save('conv-1', entity);

      const entities = await repository.findByConversation('conv-1');
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe(entity.type);
      expect(entities[0].value).toBe(entity.value);
      expect(entities[0].confidence).toBe(entity.confidence);
    });

    it('should save multiple entities for the same conversation', async () => {
      const entity1 = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');
      const entity2 = createMockEntity(EntityType.EMAIL, 'test@example.com');
      const entity3 = createMockEntity(EntityType.URL, 'https://example.com');

      await repository.save('conv-1', entity1);
      await repository.save('conv-1', entity2);
      await repository.save('conv-1', entity3);

      const entities = await repository.findByConversation('conv-1');
      expect(entities).toHaveLength(3);
    });

    it('should save entities for different conversations independently', async () => {
      const entity1 = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');
      const entity2 = createMockEntity(EntityType.EMAIL, 'test@example.com');

      await repository.save('conv-1', entity1);
      await repository.save('conv-2', entity2);

      const conv1Entities = await repository.findByConversation('conv-1');
      const conv2Entities = await repository.findByConversation('conv-2');

      expect(conv1Entities).toHaveLength(1);
      expect(conv2Entities).toHaveLength(1);
      expect(conv1Entities[0].type).toBe(EntityType.PHONE_NUMBER);
      expect(conv2Entities[0].type).toBe(EntityType.EMAIL);
    });

    it('should create independent copies to prevent external mutations', async () => {
      const entity = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');

      await repository.save('conv-1', entity);

      // Mutate original
      entity.value = 'MUTATED';

      const entities = await repository.findByConversation('conv-1');
      expect(entities[0].value).toBe('+1234567890');
    });
  });

  describe('findByConversation', () => {
    it('should return empty array for conversation with no entities', async () => {
      const entities = await repository.findByConversation('conv-1');

      expect(entities).toEqual([]);
    });

    it('should return all entities for a conversation', async () => {
      const entity1 = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');
      const entity2 = createMockEntity(EntityType.EMAIL, 'test@example.com');

      await repository.save('conv-1', entity1);
      await repository.save('conv-1', entity2);

      const entities = await repository.findByConversation('conv-1');

      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.type)).toContain(EntityType.PHONE_NUMBER);
      expect(entities.map((e) => e.type)).toContain(EntityType.EMAIL);
    });

    it('should return only entities for the specified conversation', async () => {
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.PHONE_NUMBER, '+1111111111')
      );
      await repository.save(
        'conv-2',
        createMockEntity(EntityType.PHONE_NUMBER, '+2222222222')
      );

      const entities = await repository.findByConversation('conv-1');

      expect(entities).toHaveLength(1);
      expect(entities[0].value).toBe('+1111111111');
    });

    it('should return independent copies to prevent external mutations', async () => {
      const entity = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');
      await repository.save('conv-1', entity);

      const entities = await repository.findByConversation('conv-1');
      entities[0].value = 'MUTATED';

      const entitiesAgain = await repository.findByConversation('conv-1');
      expect(entitiesAgain[0].value).toBe('+1234567890');
    });
  });

  describe('findByType', () => {
    it('should return empty array when no entities of type exist', async () => {
      const entities = await repository.findByType(EntityType.PHONE_NUMBER);

      expect(entities).toEqual([]);
    });

    it('should return all entities of specified type across all conversations', async () => {
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.PHONE_NUMBER, '+1111111111')
      );
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.EMAIL, 'test1@example.com')
      );
      await repository.save(
        'conv-2',
        createMockEntity(EntityType.PHONE_NUMBER, '+2222222222')
      );
      await repository.save(
        'conv-3',
        createMockEntity(EntityType.PHONE_NUMBER, '+3333333333')
      );

      const phoneNumbers = await repository.findByType(EntityType.PHONE_NUMBER);

      expect(phoneNumbers).toHaveLength(3);
      expect(phoneNumbers.map((e) => e.value).sort()).toEqual([
        '+1111111111',
        '+2222222222',
        '+3333333333',
      ]);
    });

    it('should not return entities of other types', async () => {
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890')
      );
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.EMAIL, 'test@example.com')
      );
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.URL, 'https://example.com')
      );

      const phoneNumbers = await repository.findByType(EntityType.PHONE_NUMBER);

      expect(phoneNumbers).toHaveLength(1);
      expect(phoneNumbers[0].type).toBe(EntityType.PHONE_NUMBER);
    });

    it('should return independent copies to prevent external mutations', async () => {
      const entity = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');
      await repository.save('conv-1', entity);

      const entities = await repository.findByType(EntityType.PHONE_NUMBER);
      entities[0].value = 'MUTATED';

      const entitiesAgain = await repository.findByType(EntityType.PHONE_NUMBER);
      expect(entitiesAgain[0].value).toBe('+1234567890');
    });
  });

  describe('clear', () => {
    it('should remove all entities', async () => {
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.PHONE_NUMBER, '+1234567890')
      );
      await repository.save(
        'conv-2',
        createMockEntity(EntityType.EMAIL, 'test@example.com')
      );

      repository.clear();

      const conv1Entities = await repository.findByConversation('conv-1');
      const conv2Entities = await repository.findByConversation('conv-2');
      const allPhones = await repository.findByType(EntityType.PHONE_NUMBER);

      expect(conv1Entities).toEqual([]);
      expect(conv2Entities).toEqual([]);
      expect(allPhones).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return 0 when no entities exist', () => {
      expect(repository.count()).toBe(0);
    });

    it('should return correct count of all entities across all conversations', async () => {
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.PHONE_NUMBER, '+1111111111')
      );
      await repository.save(
        'conv-1',
        createMockEntity(EntityType.EMAIL, 'test1@example.com')
      );
      await repository.save(
        'conv-2',
        createMockEntity(EntityType.PHONE_NUMBER, '+2222222222')
      );

      expect(repository.count()).toBe(3);
    });
  });

  describe('data isolation', () => {
    it('should maintain data integrity with complex metadata', async () => {
      const entity = createMockEntity(EntityType.PHONE_NUMBER, '+1234567890');
      entity.metadata = {
        validated: true,
        countryCode: '+1',
        format: 'E.164',
        customField: { nested: 'value' },
      };

      await repository.save('conv-1', entity);

      // Mutate original
      (entity.metadata.customField as any).nested = 'MUTATED';

      const entities = await repository.findByConversation('conv-1');
      expect((entities[0].metadata.customField as any).nested).toBe('value');
    });
  });
});
