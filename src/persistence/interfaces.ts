/**
 * Persistence Interfaces
 */

import { Conversation, IntelligenceReport, Entity } from '../types';

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
  findActive(): Promise<Conversation[]>;
  update(conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ReportRepository {
  save(report: IntelligenceReport): Promise<void>;
  findById(conversationId: string): Promise<IntelligenceReport | null>;
  findAll(page: number, pageSize: number): Promise<IntelligenceReport[]>;
  count(): Promise<number>;
}

export interface EntityRepository {
  save(conversationId: string, entity: Entity): Promise<void>;
  findByConversation(conversationId: string): Promise<Entity[]>;
  findByType(type: string): Promise<Entity[]>;
}
