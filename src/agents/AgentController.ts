/**
 * Agent Controller Implementation
 * Manages agent pool, conversation lifecycle, and message routing
 * 
 * Validates Requirements: 2.1, 2.5
 */

import { Conversation, Response } from '../types';
import { Agent } from './Agent';
import { StateMachine } from './StateMachine';
import { PersonaManager } from './PersonaManager';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';
import { ConversationRepository } from '../persistence/interfaces';
import { logger } from '../utils/logger';

/**
 * Simple UUID generator
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * AgentController manages the lifecycle of multiple conversation agents
 * Implements agent pool management, creation, routing, and termination
 */
export class AgentController {
  private agents: Map<string, Agent>;
  private stateMachine: StateMachine;
  private personaManager: PersonaManager;
  private nlpExtractor: NLPExtractor;
  private signalDetector: ScamSignalDetector;
  private scamClassifier: ScamClassifier;
  private riskScorer: RiskScorer;
  private conversationRepository?: ConversationRepository;
  private stalledCheckInterval: number = 60000; // Check every 60 seconds
  private stalledCheckTimer?: NodeJS.Timeout;

  constructor(
    stateMachine: StateMachine,
    personaManager: PersonaManager,
    nlpExtractor: NLPExtractor,
    signalDetector: ScamSignalDetector,
    scamClassifier: ScamClassifier,
    riskScorer: RiskScorer,
    conversationRepository?: ConversationRepository
  ) {
    this.agents = new Map();
    this.stateMachine = stateMachine;
    this.personaManager = personaManager;
    this.nlpExtractor = nlpExtractor;
    this.signalDetector = signalDetector;
    this.scamClassifier = scamClassifier;
    this.riskScorer = riskScorer;
    this.conversationRepository = conversationRepository;

    // Start stalled conversation detection
    this.startStalledConversationDetection();
  }

  /**
   * Create a new conversation with automatic engagement initiation
   * Requirement 2.1: Automatic engagement when scam conversation detected
   */
  async createConversation(initialMessage: string): Promise<Conversation> {
    // Generate unique conversation ID
    const conversationId = generateUUID();

    // Create new agent instance for this conversation
    const agent = new Agent(
      conversationId,
      initialMessage,
      this.stateMachine,
      this.personaManager,
      this.nlpExtractor,
      this.signalDetector,
      this.scamClassifier,
      this.riskScorer
    );

    // Add agent to pool
    this.agents.set(conversationId, agent);

    // Process the initial message to start engagement
    await agent.processMessage(initialMessage);

    // Get the conversation state
    const conversation = agent.getConversation();

    // Log conversation creation
    logger.conversationCreated(conversationId, conversation.persona.name);

    // Persist conversation if repository is available
    if (this.conversationRepository) {
      await this.conversationRepository.save(conversation);
    }

    // Return the conversation state
    return conversation;
  }

  /**
   * Process a message for an existing conversation
   * Routes message to appropriate agent
   */
  async processMessage(conversationId: string, message: string): Promise<Response> {
    // Get agent for this conversation
    const agent = this.agents.get(conversationId);

    if (!agent) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Check if conversation is already terminated
    if (agent.isTerminated()) {
      throw new Error(`Conversation already terminated: ${conversationId}`);
    }

    // Route message to agent
    const response = await agent.processMessage(message);

    // Persist updated conversation state if repository is available
    if (this.conversationRepository) {
      const conversation = agent.getConversation();
      await this.conversationRepository.update(conversation);
    }

    // If agent terminated during processing, clean up
    if (agent.isTerminated()) {
      // Keep agent in pool for report generation, but mark for cleanup
      // Actual cleanup can happen after report is generated
    }

    return response;
  }

  /**
   * Get conversation state
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const agent = this.agents.get(conversationId);

    if (!agent) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    return agent.getConversation();
  }

  /**
   * Terminate a conversation
   * Removes agent from pool after ensuring data is preserved
   */
  async terminateConversation(conversationId: string): Promise<void> {
    const agent = this.agents.get(conversationId);

    if (!agent) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // If not already terminated, process a termination message
    if (!agent.isTerminated()) {
      // Send empty message to trigger termination logic
      await agent.processMessage('');
    }

    // Persist final conversation state if repository is available
    if (this.conversationRepository) {
      const conversation = agent.getConversation();
      await this.conversationRepository.update(conversation);
    }

    // Remove agent from pool
    // Note: In production, you'd want to persist the conversation data first
    this.agents.delete(conversationId);
  }

  /**
   * List all active (non-terminated) conversations
   */
  async listActiveConversations(): Promise<Conversation[]> {
    const activeConversations: Conversation[] = [];

    for (const agent of this.agents.values()) {
      if (!agent.isTerminated()) {
        activeConversations.push(agent.getConversation());
      }
    }

    return activeConversations;
  }

  /**
   * Recover conversations from persistent storage after system restart
   * Requirement 9.7: State persistence and recovery
   *
   * @returns Number of conversations recovered
   */
  async recoverConversations(): Promise<number> {
    if (!this.conversationRepository) {
      throw new Error('Cannot recover conversations: no repository configured');
    }

    // Find all active conversations from storage
    const storedConversations = await this.conversationRepository.findActive();

    let recoveredCount = 0;

    for (const conversation of storedConversations) {
      try {
        // Restore agent from conversation state
        await this.restoreAgent(conversation);
        recoveredCount++;
      } catch (error) {
        // Log error but continue recovering other conversations
        console.error(`Error recovering conversation ${conversation.id}:`, error);
      }
    }

    return recoveredCount;
  }

  /**
   * Restore a single agent from persisted conversation state
   * Requirement 9.7: Support resuming conversations from last known state
   *
   * @param conversation - The persisted conversation to restore
   */
  /**
     * Restore a single agent from persisted conversation state
     * Requirement 9.7: Support resuming conversations from last known state
     * 
     * @param conversation - The persisted conversation to restore
     */
    async restoreAgent(conversation: Conversation): Promise<void> {
      // Check if agent already exists (avoid duplicates)
      if (this.agents.has(conversation.id)) {
        throw new Error(`Agent already exists for conversation ${conversation.id}`);
      }

      // Restore state machine history FIRST (before creating agent)
      this.stateMachine.restoreConversation(
        conversation.id,
        conversation.state,
        conversation.metadata.stateHistory
      );

      // Create new agent instance with restoration flag
      const agent = new Agent(
        conversation.id,
        conversation.metadata.initialMessage,
        this.stateMachine,
        this.personaManager,
        this.nlpExtractor,
        this.signalDetector,
        this.scamClassifier,
        this.riskScorer,
        true // isRestoration flag
      );

      // Restore conversation state to the agent
      agent.restoreState(conversation);

      // Add agent to pool
      this.agents.set(conversation.id, agent);
    }

  /**
   * Recover a specific conversation by ID from persistent storage
   * Useful for on-demand recovery or debugging
   *
   * @param conversationId - The ID of the conversation to recover
   * @returns The recovered conversation, or null if not found
   */
  async recoverConversation(conversationId: string): Promise<Conversation | null> {
    if (!this.conversationRepository) {
      throw new Error('Cannot recover conversation: no repository configured');
    }

    // Check if already in memory
    if (this.agents.has(conversationId)) {
      return this.agents.get(conversationId)!.getConversation();
    }

    // Load from storage
    const conversation = await this.conversationRepository.findById(conversationId);

    if (!conversation) {
      return null;
    }

    // Restore the agent
    await this.restoreAgent(conversation);

    return conversation;
  }

  /**
   * Get total number of agents in pool (including terminated)
   */
  getAgentPoolSize(): number {
    return this.agents.size;
  }

  /**
   * Get number of active (non-terminated) agents
   */
  getActiveAgentCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (!agent.isTerminated()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Start periodic stalled conversation detection
   * Requirement 2.5: Handle stalled conversations
   */
  private startStalledConversationDetection(): void {
    this.stalledCheckTimer = setInterval(() => {
      this.detectAndHandleStalledConversations();
    }, this.stalledCheckInterval);
  }

  /**
   * Stop stalled conversation detection
   * Used for cleanup
   */
  stopStalledConversationDetection(): void {
    if (this.stalledCheckTimer) {
      clearInterval(this.stalledCheckTimer);
      this.stalledCheckTimer = undefined;
    }
  }

  /**
   * Detect and handle stalled conversations
   * A conversation is stalled if:
   * - It's been inactive for more than 5 minutes
   * - It's not already terminated
   * - It has at least one message
   */
  private async detectAndHandleStalledConversations(): Promise<void> {
    const now = Date.now();
    const stalledThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds

    for (const [conversationId, agent] of this.agents.entries()) {
      // Skip if already terminated
      if (agent.isTerminated()) {
        continue;
      }

      const conversation = agent.getConversation();

      // Check if conversation has messages
      if (conversation.messages.length === 0) {
        continue;
      }

      // Check time since last update
      const timeSinceUpdate = now - conversation.updatedAt.getTime();

      if (timeSinceUpdate > stalledThreshold) {
        // Conversation is stalled, terminate it
        try {
          await this.terminateConversation(conversationId);
        } catch (error) {
          // Log error but continue processing other conversations
          console.error(`Error terminating stalled conversation ${conversationId}:`, error);
        }
      }
    }
  }

  /**
   * Clean up terminated conversations from pool
   * Useful for memory management in long-running systems
   */
  async cleanupTerminatedConversations(): Promise<number> {
    const terminatedIds: string[] = [];

    for (const [conversationId, agent] of this.agents.entries()) {
      if (agent.isTerminated()) {
        terminatedIds.push(conversationId);
      }
    }

    // Remove terminated agents
    for (const id of terminatedIds) {
      this.agents.delete(id);
    }

    return terminatedIds.length;
  }

  /**
   * Shutdown the controller
   * Stops background tasks and cleans up resources
   */
  async shutdown(): Promise<void> {
    // Stop stalled conversation detection
    this.stopStalledConversationDetection();

    // Optionally terminate all active conversations
    const activeIds: string[] = [];
    for (const [conversationId, agent] of this.agents.entries()) {
      if (!agent.isTerminated()) {
        activeIds.push(conversationId);
      }
    }

    // Terminate all active conversations
    for (const id of activeIds) {
      try {
        await this.terminateConversation(id);
      } catch (error) {
        console.error(`Error terminating conversation ${id} during shutdown:`, error);
      }
    }

    // Clear agent pool
    this.agents.clear();
  }
}
