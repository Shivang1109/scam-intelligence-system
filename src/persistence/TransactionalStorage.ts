/**
 * Transactional Storage
 * Provides transactional operations for data integrity across repositories
 */

import { Conversation, IntelligenceReport, Entity } from '../types';
import {
  ConversationRepository,
  ReportRepository,
  EntityRepository,
} from './interfaces';

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class TransactionalStorage {
  constructor(
    private conversationRepo: ConversationRepository,
    private reportRepo: ReportRepository,
    private entityRepo: EntityRepository
  ) {}

  /**
   * Execute a function within a transaction context
   * If the function throws, all changes are rolled back
   */
  async executeTransaction<T>(
    fn: (context: TransactionContext) => Promise<T>
  ): Promise<T> {
    const context = new TransactionContext(
      this.conversationRepo,
      this.reportRepo,
      this.entityRepo
    );

    try {
      const result = await fn(context);
      await context.commit();
      return result;
    } catch (error) {
      await context.rollback();
      throw error;
    }
  }

  /**
   * Save conversation and all its entities atomically
   */
  async saveConversationWithEntities(
    conversation: Conversation
  ): Promise<void> {
    await this.executeTransaction(async (ctx) => {
      await ctx.saveConversation(conversation);

      // Save all entities
      for (const entity of conversation.extractedEntities) {
        await ctx.saveEntity(conversation.id, entity);
      }
    });
  }

  /**
   * Save conversation and generate report atomically
   */
  async saveConversationWithReport(
    conversation: Conversation,
    report: IntelligenceReport
  ): Promise<void> {
    await this.executeTransaction(async (ctx) => {
      await ctx.saveConversation(conversation);
      await ctx.saveReport(report);

      // Save all entities
      for (const entity of conversation.extractedEntities) {
        await ctx.saveEntity(conversation.id, entity);
      }
    });
  }
}

/**
 * Transaction Context
 * Tracks operations and provides rollback capability
 */
class TransactionContext {
  private operations: Array<() => Promise<void>> = [];
  private rollbackOperations: Array<() => Promise<void>> = [];

  constructor(
    private conversationRepo: ConversationRepository,
    private reportRepo: ReportRepository,
    private entityRepo: EntityRepository
  ) {}

  async saveConversation(conversation: Conversation): Promise<void> {
    // Check if conversation exists for rollback
    const existing = await this.conversationRepo.findById(conversation.id);

    this.operations.push(async () => {
      if (existing) {
        await this.conversationRepo.update(conversation);
      } else {
        await this.conversationRepo.save(conversation);
      }
    });

    this.rollbackOperations.push(async () => {
      if (existing) {
        await this.conversationRepo.update(existing);
      } else {
        await this.conversationRepo.delete(conversation.id);
      }
    });
  }

  async saveReport(report: IntelligenceReport): Promise<void> {
    // Check if report exists for rollback
    const existing = await this.reportRepo.findById(report.conversationId);

    this.operations.push(async () => {
      await this.reportRepo.save(report);
    });

    this.rollbackOperations.push(async () => {
      if (existing) {
        await this.reportRepo.save(existing);
      }
      // Note: In-memory implementation doesn't support delete for reports
      // In a real database, we would delete the report here
    });
  }

  async saveEntity(conversationId: string, entity: Entity): Promise<void> {
    this.operations.push(async () => {
      await this.entityRepo.save(conversationId, entity);
    });

    // Note: Rollback for entities is complex in the current implementation
    // since we don't have a delete operation. In a real database,
    // we would track and delete the entity on rollback.
    this.rollbackOperations.push(async () => {
      // No-op for in-memory implementation
      // In a real database, we would delete the entity
    });
  }

  async commit(): Promise<void> {
    // Execute all operations in order
    for (const operation of this.operations) {
      await operation();
    }
    // Clear operations after successful commit
    this.operations = [];
    this.rollbackOperations = [];
  }

  async rollback(): Promise<void> {
    // Execute rollback operations in reverse order
    for (let i = this.rollbackOperations.length - 1; i >= 0; i--) {
      try {
        await this.rollbackOperations[i]();
      } catch (error) {
        // Log rollback errors but continue rolling back
        console.error('Error during rollback:', error);
      }
    }
    // Clear operations after rollback
    this.operations = [];
    this.rollbackOperations = [];
  }
}
