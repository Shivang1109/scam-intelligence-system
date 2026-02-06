/**
 * State Machine Implementation
 * Manages conversation state transitions with validation and history tracking
 */

import {
  ConversationState,
  StateEvent,
  StateTransition,
} from '../types';
import { StateMachine as IStateMachine } from './interfaces';
import { logger } from '../utils/logger';

/**
 * Valid state transitions map
 * Defines which states can transition to which other states
 */
const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  [ConversationState.IDLE]: [ConversationState.INITIAL_CONTACT],
  [ConversationState.INITIAL_CONTACT]: [
    ConversationState.ENGAGEMENT,
    ConversationState.TERMINATION,
  ],
  [ConversationState.ENGAGEMENT]: [
    ConversationState.INFORMATION_GATHERING,
    ConversationState.TERMINATION,
  ],
  [ConversationState.INFORMATION_GATHERING]: [
    ConversationState.EXTRACTION,
    ConversationState.TERMINATION,
  ],
  [ConversationState.EXTRACTION]: [
    ConversationState.INFORMATION_GATHERING,
    ConversationState.TERMINATION,
  ],
  [ConversationState.TERMINATION]: [], // Terminal state - no transitions allowed
};

/**
 * Terminal states that cannot transition to other states
 */
const TERMINAL_STATES: Set<ConversationState> = new Set([
  ConversationState.TERMINATION,
]);

/**
 * StateMachine class manages conversation state transitions
 * Implements event-driven state transitions with validation and history tracking
 */
export class StateMachine implements IStateMachine {
  private conversationStates: Map<string, ConversationState>;
  private stateHistories: Map<string, StateTransition[]>;

  constructor() {
    this.conversationStates = new Map();
    this.stateHistories = new Map();
  }

  /**
   * Get the current state of a conversation
   * @param conversationId - The conversation identifier
   * @returns The current conversation state
   * @throws Error if conversation not found
   */
  getCurrentState(conversationId: string): ConversationState {
    const state = this.conversationStates.get(conversationId);
    if (state === undefined) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    return state;
  }

  /**
   * Transition a conversation to a new state based on an event
   * Validates the transition is allowed before executing
   * @param conversationId - The conversation identifier
   * @param event - The state event triggering the transition
   * @returns The new conversation state
   * @throws Error if transition is invalid or conversation not found
   */
  transition(conversationId: string, event: StateEvent): ConversationState {
    const currentState = this.getCurrentState(conversationId);

    // Check if current state is terminal
    if (this.isTerminalState(currentState)) {
      throw new Error(
        `Cannot transition from terminal state ${currentState}`
      );
    }

    // Determine target state from event
    const targetState = this.determineTargetState(currentState, event);

    // Validate transition is allowed
    const validTransitions = this.getValidTransitions(currentState);
    if (!validTransitions.includes(targetState)) {
      throw new Error(
        `Invalid transition from ${currentState} to ${targetState}`
      );
    }

    // Execute transition
    this.conversationStates.set(conversationId, targetState);

    // Record transition in history
    const transition: StateTransition = {
      fromState: currentState,
      toState: targetState,
      timestamp: new Date(),
      reason: event.type,
    };

    const history = this.stateHistories.get(conversationId) || [];
    history.push(transition);
    this.stateHistories.set(conversationId, history);

    // Log state transition
    logger.stateTransition(conversationId, currentState, targetState, event.type);

    return targetState;
  }

  /**
   * Get valid transitions from a given state
   * @param currentState - The state to get valid transitions for
   * @returns Array of valid target states
   */
  getValidTransitions(currentState: ConversationState): ConversationState[] {
    return VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Get the state transition history for a conversation
   * @param conversationId - The conversation identifier
   * @returns Array of state transitions
   */
  getStateHistory(conversationId: string): StateTransition[] {
    return this.stateHistories.get(conversationId) || [];
  }

  /**
   * Initialize a new conversation in the IDLE state
   * @param conversationId - The conversation identifier
   */
  initializeConversation(conversationId: string): void {
    if (this.conversationStates.has(conversationId)) {
      throw new Error(`Conversation ${conversationId} already exists`);
    }
    this.conversationStates.set(conversationId, ConversationState.IDLE);
    this.stateHistories.set(conversationId, []);
  }

  /**
   * Check if a state is terminal (no further transitions allowed)
   * @param state - The state to check
   * @returns True if the state is terminal
   */
  isTerminalState(state: ConversationState): boolean {
    return TERMINAL_STATES.has(state);
  }

  /**
   * Determine the target state based on current state and event
   * @param _currentState - The current conversation state (unused but kept for future logic)
   * @param event - The state event
   * @returns The target state
   */
  private determineTargetState(
    _currentState: ConversationState,
    event: StateEvent
  ): ConversationState {
    // Extract target state from event data if provided
    if (event.data?.targetState) {
      return event.data.targetState as ConversationState;
    }

    // Default transition logic based on event type
    switch (event.type) {
      case 'start_conversation':
        return ConversationState.INITIAL_CONTACT;
      
      case 'build_trust':
        return ConversationState.ENGAGEMENT;
      
      case 'gather_information':
        return ConversationState.INFORMATION_GATHERING;
      
      case 'extract_entities':
        return ConversationState.EXTRACTION;
      
      case 'terminate':
      case 'goal_achieved':
      case 'unproductive':
      case 'timeout':
        return ConversationState.TERMINATION;
      
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Remove a conversation from the state machine
   * Useful for cleanup after conversation completion
   * @param conversationId - The conversation identifier
   */
  removeConversation(conversationId: string): void {
    this.conversationStates.delete(conversationId);
    this.stateHistories.delete(conversationId);
  }

  /**
   * Get all active conversation IDs
   * @returns Array of conversation IDs
   */
  getActiveConversations(): string[] {
    return Array.from(this.conversationStates.keys());
  }

    /**
     * Restore a conversation's state and history from persistent storage
     * Used for conversation recovery after system restart
     * Requirement 9.7: State persistence and recovery
     *
     * @param conversationId - The conversation identifier
     * @param state - The current state to restore
     * @param history - The state transition history to restore
     */
    /**
       * Restore a conversation's state and history from persistent storage
       * Used for conversation recovery after system restart
       * Requirement 9.7: State persistence and recovery
       * 
       * @param conversationId - The conversation identifier
       * @param state - The current state to restore
       * @param history - The state transition history to restore
       */
      restoreConversation(
        conversationId: string,
        state: ConversationState,
        history: StateTransition[]
      ): void {
        // If conversation already exists, remove it first (for recovery scenarios)
        if (this.conversationStates.has(conversationId)) {
          this.removeConversation(conversationId);
        }

        // Restore state
        this.conversationStates.set(conversationId, state);

        // Restore history with proper Date objects
        const restoredHistory = history.map(transition => ({
          ...transition,
          timestamp: new Date(transition.timestamp),
        }));
        this.stateHistories.set(conversationId, restoredHistory);
      }
}
