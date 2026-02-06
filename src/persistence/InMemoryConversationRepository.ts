/**
 * In-Memory Conversation Repository Implementation
 * Provides Map-based storage for conversations
 */

import { Conversation } from '../types';
import { ConversationRepository } from './interfaces';

export class InMemoryConversationRepository implements ConversationRepository {
  private conversations: Map<string, Conversation>;

  constructor() {
    this.conversations = new Map();
  }

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, this.deepClone(conversation));
  }

  async findById(id: string): Promise<Conversation | null> {
    const conversation = this.conversations.get(id);
    return conversation ? this.deepClone(conversation) : null;
  }

  async findAll(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).map((c) =>
      this.deepClone(c)
    );
  }

  async findActive(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.state !== 'termination')
      .map((c) => this.deepClone(c));
  }

  async update(conversation: Conversation): Promise<void> {
    if (!this.conversations.has(conversation.id)) {
      throw new Error(`Conversation ${conversation.id} not found`);
    }
    this.conversations.set(conversation.id, this.deepClone(conversation));
  }

  async delete(id: string): Promise<void> {
    this.conversations.delete(id);
  }

  /**
   * Deep clone to prevent external mutations
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear all conversations (useful for testing)
   */
  clear(): void {
    this.conversations.clear();
  }

  /**
   * Get count of stored conversations (useful for testing)
   */
  count(): number {
    return this.conversations.size;
  }
}
