/**
 * PostgreSQL Conversation Repository
 * Implements conversation persistence using PostgreSQL
 */

import { Pool } from 'pg';
import { Conversation, ConversationState } from '../types';
import { ConversationRepository } from './interfaces';

export class PostgresConversationRepository implements ConversationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async save(conversation: Conversation): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert conversation
      await client.query(
        `INSERT INTO conversations (id, state, persona_id, persona_name, risk_score, created_at, updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          conversation.id,
          conversation.state,
          conversation.persona.id,
          conversation.persona.name,
          conversation.riskScore,
          conversation.createdAt,
          conversation.updatedAt,
          JSON.stringify(conversation.metadata),
        ]
      );

      // Insert messages
      for (const message of conversation.messages) {
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender, content, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [message.id, conversation.id, message.sender, message.content, message.timestamp]
        );
      }

      // Insert entities
      for (const entity of conversation.extractedEntities) {
        await client.query(
          `INSERT INTO entities (conversation_id, type, value, normalized_value, confidence, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            conversation.id,
            entity.type,
            entity.value,
            entity.value, // Use value as normalized value
            entity.confidence,
            entity.timestamp,
            JSON.stringify(entity.metadata || {}),
          ]
        );
      }

      // Insert scam signals
      for (const signal of conversation.scamSignals) {
        await client.query(
          `INSERT INTO scam_signals (conversation_id, type, confidence, evidence, timestamp, message_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            conversation.id,
            signal.type,
            signal.confidence,
            signal.text, // Use text as evidence
            signal.timestamp,
            null, // messageId not in type definition
          ]
        );
      }

      // Insert classification
      if (conversation.classification) {
        await client.query(
          `INSERT INTO classifications (conversation_id, types, confidence, timestamp)
           VALUES ($1, $2, $3, NOW())`,
          [
            conversation.id,
            JSON.stringify([conversation.classification.primaryType, ...conversation.classification.secondaryTypes.map(s => s.type)]),
            conversation.classification.primaryConfidence,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(conversation: Conversation): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update conversation
      await client.query(
        `UPDATE conversations 
         SET state = $1, risk_score = $2, updated_at = $3, metadata = $4
         WHERE id = $5`,
        [
          conversation.state,
          conversation.riskScore,
          conversation.updatedAt,
          JSON.stringify(conversation.metadata),
          conversation.id,
        ]
      );

      // Delete and re-insert messages (simpler than diff)
      await client.query('DELETE FROM messages WHERE conversation_id = $1', [conversation.id]);
      for (const message of conversation.messages) {
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender, content, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [message.id, conversation.id, message.sender, message.content, message.timestamp]
        );
      }

      // Delete and re-insert entities
      await client.query('DELETE FROM entities WHERE conversation_id = $1', [conversation.id]);
      for (const entity of conversation.extractedEntities) {
        await client.query(
          `INSERT INTO entities (conversation_id, type, value, normalized_value, confidence, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            conversation.id,
            entity.type,
            entity.value,
            entity.value, // Use value as normalized value
            entity.confidence,
            entity.timestamp,
            JSON.stringify(entity.metadata || {}),
          ]
        );
      }

      // Delete and re-insert scam signals
      await client.query('DELETE FROM scam_signals WHERE conversation_id = $1', [conversation.id]);
      for (const signal of conversation.scamSignals) {
        await client.query(
          `INSERT INTO scam_signals (conversation_id, type, confidence, evidence, timestamp, message_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            conversation.id,
            signal.type,
            signal.confidence,
            signal.text, // Use text as evidence
            signal.timestamp,
            null, // messageId not in type definition
          ]
        );
      }

      // Update classification
      await client.query('DELETE FROM classifications WHERE conversation_id = $1', [
        conversation.id,
      ]);
      if (conversation.classification) {
        await client.query(
          `INSERT INTO classifications (conversation_id, types, confidence, timestamp)
           VALUES ($1, $2, $3, NOW())`,
          [
            conversation.id,
            JSON.stringify([conversation.classification.primaryType, ...conversation.classification.secondaryTypes.map(s => s.type)]),
            conversation.classification.primaryConfidence,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    const result = await this.pool.query(
      `SELECT c.*, 
              json_agg(DISTINCT jsonb_build_object(
                'id', m.id,
                'sender', m.sender,
                'content', m.content,
                'timestamp', m.timestamp
              )) FILTER (WHERE m.id IS NOT NULL) as messages,
              json_agg(DISTINCT jsonb_build_object(
                'type', e.type,
                'value', e.value,
                'normalizedValue', e.normalized_value,
                'confidence', e.confidence,
                'timestamp', e.timestamp,
                'metadata', e.metadata
              )) FILTER (WHERE e.id IS NOT NULL) as entities,
              json_agg(DISTINCT jsonb_build_object(
                'type', s.type,
                'confidence', s.confidence,
                'evidence', s.evidence,
                'timestamp', s.timestamp,
                'messageId', s.message_id
              )) FILTER (WHERE s.id IS NOT NULL) as signals
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       LEFT JOIN entities e ON c.id = e.conversation_id
       LEFT JOIN scam_signals s ON c.id = s.conversation_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConversation(result.rows[0]);
  }

  async findActive(): Promise<Conversation[]> {
    const result = await this.pool.query(
      `SELECT c.*, 
              json_agg(DISTINCT jsonb_build_object(
                'id', m.id,
                'sender', m.sender,
                'content', m.content,
                'timestamp', m.timestamp
              )) FILTER (WHERE m.id IS NOT NULL) as messages,
              json_agg(DISTINCT jsonb_build_object(
                'type', e.type,
                'value', e.value,
                'normalizedValue', e.normalized_value,
                'confidence', e.confidence,
                'timestamp', e.timestamp,
                'metadata', e.metadata
              )) FILTER (WHERE e.id IS NOT NULL) as entities,
              json_agg(DISTINCT jsonb_build_object(
                'type', s.type,
                'confidence', s.confidence,
                'evidence', s.evidence,
                'timestamp', s.timestamp,
                'messageId', s.message_id
              )) FILTER (WHERE s.id IS NOT NULL) as signals
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       LEFT JOIN entities e ON c.id = e.conversation_id
       LEFT JOIN scam_signals s ON c.id = s.conversation_id
       WHERE c.state != $1
       GROUP BY c.id`,
      [ConversationState.TERMINATION]
    );

    return result.rows.map(row => this.mapRowToConversation(row));
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM conversations WHERE id = $1', [id]);
  }

  async findAll(): Promise<Conversation[]> {
    const result = await this.pool.query(
      `SELECT c.*, 
              json_agg(DISTINCT jsonb_build_object(
                'id', m.id,
                'sender', m.sender,
                'content', m.content,
                'timestamp', m.timestamp
              )) FILTER (WHERE m.id IS NOT NULL) as messages,
              json_agg(DISTINCT jsonb_build_object(
                'type', e.type,
                'value', e.value,
                'normalizedValue', e.normalized_value,
                'confidence', e.confidence,
                'timestamp', e.timestamp,
                'metadata', e.metadata
              )) FILTER (WHERE e.id IS NOT NULL) as entities,
              json_agg(DISTINCT jsonb_build_object(
                'type', s.type,
                'confidence', s.confidence,
                'evidence', s.evidence,
                'timestamp', s.timestamp,
                'messageId', s.message_id
              )) FILTER (WHERE s.id IS NOT NULL) as signals
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       LEFT JOIN entities e ON c.id = e.conversation_id
       LEFT JOIN scam_signals s ON c.id = s.conversation_id
       GROUP BY c.id`
    );

    return result.rows.map(row => this.mapRowToConversation(row));
  }

  private mapRowToConversation(row: any): Conversation {
    const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;

    return {
      id: row.id,
      state: row.state as ConversationState,
      persona: {
        id: row.persona_id,
        name: row.persona_name,
        age: metadata.persona?.age || 0,
        background: metadata.persona?.background || '',
        vulnerabilityLevel: metadata.persona?.vulnerabilityLevel || 5,
        communicationStyle: metadata.persona?.communicationStyle || 'casual',
        typicalResponses: metadata.persona?.typicalResponses || [],
        characteristics: metadata.persona?.characteristics || {
          techSavvy: 3,
          trustLevel: 5,
          financialAwareness: 3,
          responseSpeed: 5,
        },
      },
      messages: row.messages || [],
      extractedEntities: row.entities || [],
      scamSignals: row.signals || [],
      classification: metadata.classification || null,
      riskScore: parseFloat(row.risk_score),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: {
        initialMessage: metadata.initialMessage || '',
        messageCount: metadata.messageCount || 0,
        duration: metadata.duration || 0,
        stateHistory: metadata.stateHistory || [],
      },
    };
  }
}
