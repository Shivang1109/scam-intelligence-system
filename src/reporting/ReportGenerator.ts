/**
 * Report Generator Implementation
 * Generates structured JSON intelligence reports from conversation data
 * 
 * Validates Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { 
  IntelligenceReport, 
  Conversation, 
  Entity, 
  ScamSignal, 
  Message,
  RiskScore,
} from '../types';
import { ReportGenerator as IReportGenerator } from './interfaces';
import { RiskScorer } from '../scoring/RiskScorer';

/**
 * ReportGenerator aggregates conversation intelligence and produces structured reports
 * Implements report generation, validation, and export functionality
 */
export class ReportGenerator implements IReportGenerator {
  private riskScorer: RiskScorer;
  private conversationStore: Map<string, Conversation>;

  constructor(riskScorer: RiskScorer, conversationStore?: Map<string, Conversation>) {
    this.riskScorer = riskScorer;
    this.conversationStore = conversationStore || new Map();
  }

  /**
   * Generate a complete intelligence report for a conversation
   * Requirement 7.1: Produce JSON reports with all required fields
   * Requirement 7.2: Generate report within 5 seconds of conversation conclusion
   * Requirement 7.4: Structure entities by type with metadata
   * Requirement 7.5: Include conversation metadata
   */
  async generateReport(conversationId: string): Promise<IntelligenceReport> {
    // Fetch conversation data
    const conversation = this.conversationStore.get(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Calculate final risk score
    const riskScore: RiskScore = this.riskScorer.calculateScore(conversation);

    // Calculate conversation duration (in seconds)
    const duration = this.calculateDuration(conversation);

    // Build the intelligence report
    const report: IntelligenceReport = {
      conversationId: conversation.id,
      timestamp: new Date(),
      persona: {
        id: conversation.persona.id,
        name: conversation.persona.name,
      },
      scamClassification: conversation.classification,
      riskScore: riskScore,
      extractedEntities: this.structureEntities(conversation.extractedEntities),
      scamSignals: this.structureSignals(conversation.scamSignals),
      conversationMetadata: {
        duration: duration,
        messageCount: conversation.messages.length,
        stateTransitions: conversation.metadata.stateHistory,
      },
      transcript: this.annotateTranscript(conversation.messages, conversation),
    };

    // Validate report before returning (Requirement 7.3)
    if (!this.validateReport(report)) {
      throw new Error(`Generated report failed validation for conversation: ${conversationId}`);
    }

    return report;
  }

  /**
   * Validate report against schema
   * Requirement 7.3: Validate all JSON reports against defined schema
   */
  validateReport(report: IntelligenceReport): boolean {
    try {
      // Check required top-level fields
      if (!report.conversationId || typeof report.conversationId !== 'string') {
        console.error('Validation failed: missing or invalid conversationId');
        return false;
      }

      if (!report.timestamp || !(report.timestamp instanceof Date)) {
        console.error('Validation failed: missing or invalid timestamp');
        return false;
      }

      // Validate persona
      if (!report.persona || !report.persona.id || !report.persona.name) {
        console.error('Validation failed: missing or invalid persona');
        return false;
      }

      // Validate scamClassification (can be null)
      if (report.scamClassification !== null) {
        if (!report.scamClassification.primaryType || 
            typeof report.scamClassification.primaryConfidence !== 'number' ||
            !Array.isArray(report.scamClassification.secondaryTypes)) {
          console.error('Validation failed: invalid scamClassification');
          return false;
        }
      }

      // Validate riskScore
      if (!report.riskScore || 
          typeof report.riskScore.score !== 'number' ||
          !report.riskScore.breakdown ||
          !report.riskScore.calculatedAt) {
        console.error('Validation failed: missing or invalid riskScore');
        return false;
      }

      // Validate risk score bounds (0-100)
      if (report.riskScore.score < 0 || report.riskScore.score > 100) {
        console.error('Validation failed: riskScore out of bounds');
        return false;
      }

      // Validate extractedEntities array
      if (!Array.isArray(report.extractedEntities)) {
        console.error('Validation failed: extractedEntities must be an array');
        return false;
      }

      // Validate each entity has required fields (Requirement 7.4)
      for (const entity of report.extractedEntities) {
        if (!entity.type || !entity.value || 
            typeof entity.confidence !== 'number' ||
            !entity.context || !entity.timestamp || !entity.metadata) {
          console.error('Validation failed: invalid entity structure');
          return false;
        }

        // Validate confidence is between 0 and 1
        if (entity.confidence < 0 || entity.confidence > 1) {
          console.error('Validation failed: entity confidence out of bounds');
          return false;
        }
      }

      // Validate scamSignals array
      if (!Array.isArray(report.scamSignals)) {
        console.error('Validation failed: scamSignals must be an array');
        return false;
      }

      // Validate each signal has required fields
      for (const signal of report.scamSignals) {
        if (!signal.type || typeof signal.confidence !== 'number' ||
            !signal.text || !signal.context || !signal.timestamp) {
          console.error('Validation failed: invalid signal structure');
          return false;
        }
      }

      // Validate conversationMetadata (Requirement 7.5)
      if (!report.conversationMetadata ||
          typeof report.conversationMetadata.duration !== 'number' ||
          typeof report.conversationMetadata.messageCount !== 'number' ||
          !Array.isArray(report.conversationMetadata.stateTransitions)) {
        console.error('Validation failed: invalid conversationMetadata');
        return false;
      }

      // Validate transcript array
      if (!Array.isArray(report.transcript)) {
        console.error('Validation failed: transcript must be an array');
        return false;
      }

      // Validate each message in transcript
      for (const message of report.transcript) {
        if (!message.id || !message.sender || !message.content || !message.timestamp) {
          console.error('Validation failed: invalid message structure in transcript');
          return false;
        }

        if (message.sender !== 'system' && message.sender !== 'scammer') {
          console.error('Validation failed: invalid message sender');
          return false;
        }
      }

      // All validations passed
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Export report in specified format
   * Requirement 7.6: Support report export in JSON format
   */
  async exportReport(conversationId: string, format: string): Promise<string> {
    // Generate the report
    const report = await this.generateReport(conversationId);

    // Currently only JSON format is supported
    if (format.toLowerCase() !== 'json') {
      throw new Error(`Unsupported export format: ${format}. Only 'json' is supported.`);
    }

    // Export as formatted JSON
    return JSON.stringify(report, null, 2);
  }

  /**
   * Structure entities by type with metadata
   * Requirement 7.4: Structure entities by type with metadata (confidence, context, timestamp)
   */
  private structureEntities(entities: Entity[]): Entity[] {
    // Entities are already structured with metadata, but we ensure consistency
    return entities.map(entity => ({
      type: entity.type,
      value: entity.value,
      confidence: entity.confidence,
      context: entity.context,
      timestamp: entity.timestamp,
      metadata: {
        ...entity.metadata,
        validated: entity.metadata.validated,
      },
    }));
  }

  /**
   * Structure scam signals with full details
   */
  private structureSignals(signals: ScamSignal[]): ScamSignal[] {
    // Signals are already properly structured, return as-is
    return signals.map(signal => ({
      type: signal.type,
      confidence: signal.confidence,
      text: signal.text,
      context: signal.context,
      timestamp: signal.timestamp,
    }));
  }

  /**
   * Annotate transcript with intelligence markers
   * Requirement 7.1: Include full conversation transcript with annotations
   */
  private annotateTranscript(messages: Message[], _conversation: Conversation): Message[] {
    // Create annotated transcript
    // For now, we return the messages as-is, but in a production system,
    // we could add annotations like:
    // - Which entities were extracted from each message
    // - Which signals were detected in each message
    // - State transitions that occurred after each message
    
    return messages.map(message => ({
      id: message.id,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp,
    }));
  }

  /**
   * Calculate conversation duration in seconds
   */
  private calculateDuration(conversation: Conversation): number {
    if (conversation.messages.length === 0) {
      return 0;
    }

    const firstMessage = conversation.messages[0];
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    const durationMs = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
    return Math.round(durationMs / 1000); // Convert to seconds
  }

  /**
   * Register a conversation for report generation
   * This is a helper method for testing and integration
   */
  registerConversation(conversation: Conversation): void {
    this.conversationStore.set(conversation.id, conversation);
  }

  /**
   * Unregister a conversation
   * This is a helper method for cleanup
   */
  unregisterConversation(conversationId: string): void {
    this.conversationStore.delete(conversationId);
  }

  /**
   * Get all registered conversation IDs
   * This is a helper method for testing
   */
  getRegisteredConversationIds(): string[] {
    return Array.from(this.conversationStore.keys());
  }
}
