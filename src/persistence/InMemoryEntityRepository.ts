/**
 * In-Memory Entity Repository Implementation
 * Provides Map-based storage for extracted entities
 */

import { Entity } from '../types';
import { EntityRepository } from './interfaces';

export class InMemoryEntityRepository implements EntityRepository {
  // Map of conversationId -> Entity[]
  private entitiesByConversation: Map<string, Entity[]>;

  constructor() {
    this.entitiesByConversation = new Map();
  }

  async save(conversationId: string, entity: Entity): Promise<void> {
    const entities = this.entitiesByConversation.get(conversationId) || [];
    entities.push(this.deepClone(entity));
    this.entitiesByConversation.set(conversationId, entities);
  }

  async findByConversation(conversationId: string): Promise<Entity[]> {
    const entities = this.entitiesByConversation.get(conversationId) || [];
    return entities.map((e) => this.deepClone(e));
  }

  async findByType(type: string): Promise<Entity[]> {
    const allEntities: Entity[] = [];

    for (const entities of this.entitiesByConversation.values()) {
      const matchingEntities = entities.filter((e) => e.type === type);
      allEntities.push(...matchingEntities);
    }

    return allEntities.map((e) => this.deepClone(e));
  }

  /**
   * Deep clone to prevent external mutations
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear all entities (useful for testing)
   */
  clear(): void {
    this.entitiesByConversation.clear();
  }

  /**
   * Get count of stored entities across all conversations (useful for testing)
   */
  count(): number {
    let total = 0;
    for (const entities of this.entitiesByConversation.values()) {
      total += entities.length;
    }
    return total;
  }
}
