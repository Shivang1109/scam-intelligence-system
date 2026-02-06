/**
 * Unit tests for StateMachine class
 * Tests state transition logic, validation, and history tracking
 */

import { StateMachine } from './StateMachine';
import { ConversationState, StateEvent } from '../types';

describe('StateMachine', () => {
  let stateMachine: StateMachine;
  const testConversationId = 'test-conversation-1';

  beforeEach(() => {
    stateMachine = new StateMachine();
  });

  describe('Initialization', () => {
    it('should initialize a conversation in IDLE state', () => {
      stateMachine.initializeConversation(testConversationId);
      const state = stateMachine.getCurrentState(testConversationId);
      expect(state).toBe(ConversationState.IDLE);
    });

    it('should throw error when initializing duplicate conversation', () => {
      stateMachine.initializeConversation(testConversationId);
      expect(() => {
        stateMachine.initializeConversation(testConversationId);
      }).toThrow('already exists');
    });

    it('should throw error when getting state of non-existent conversation', () => {
      expect(() => {
        stateMachine.getCurrentState('non-existent');
      }).toThrow('not found');
    });
  });

  describe('State Transitions', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should transition from IDLE to INITIAL_CONTACT', () => {
      const event: StateEvent = { type: 'start_conversation' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.INITIAL_CONTACT);
      expect(stateMachine.getCurrentState(testConversationId)).toBe(
        ConversationState.INITIAL_CONTACT
      );
    });

    it('should transition from INITIAL_CONTACT to ENGAGEMENT', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const event: StateEvent = { type: 'build_trust' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.ENGAGEMENT);
    });

    it('should transition from ENGAGEMENT to INFORMATION_GATHERING', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      const event: StateEvent = { type: 'gather_information' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.INFORMATION_GATHERING);
    });

    it('should transition from INFORMATION_GATHERING to EXTRACTION', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      const event: StateEvent = { type: 'extract_entities' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.EXTRACTION);
    });

    it('should transition from EXTRACTION back to INFORMATION_GATHERING', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      stateMachine.transition(testConversationId, { type: 'extract_entities' });
      const event: StateEvent = { type: 'gather_information' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.INFORMATION_GATHERING);
    });

    it('should transition to TERMINATION from any non-terminal state', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const event: StateEvent = { type: 'terminate' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.TERMINATION);
    });

    it('should support explicit target state in event data', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const event: StateEvent = {
        type: 'custom_event',
        data: { targetState: ConversationState.TERMINATION },
      };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.TERMINATION);
    });
  });

  describe('Invalid Transitions', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should reject invalid transition from IDLE to ENGAGEMENT', () => {
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.ENGAGEMENT },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from TERMINATION state', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'start_conversation' });
      }).toThrow('Cannot transition from terminal state');
    });

    it('should throw error for unknown event type', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const event: StateEvent = { type: 'unknown_event_type' };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Unknown event type');
    });
  });

  describe('Terminal State Detection', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should identify TERMINATION as terminal state', () => {
      expect(stateMachine.isTerminalState(ConversationState.TERMINATION)).toBe(true);
    });

    it('should identify non-terminal states correctly', () => {
      expect(stateMachine.isTerminalState(ConversationState.IDLE)).toBe(false);
      expect(stateMachine.isTerminalState(ConversationState.INITIAL_CONTACT)).toBe(false);
      expect(stateMachine.isTerminalState(ConversationState.ENGAGEMENT)).toBe(false);
      expect(stateMachine.isTerminalState(ConversationState.INFORMATION_GATHERING)).toBe(false);
      expect(stateMachine.isTerminalState(ConversationState.EXTRACTION)).toBe(false);
    });
  });

  describe('State Transition History', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should track state transitions with timestamps', () => {
      const beforeTransition = new Date();
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const afterTransition = new Date();

      const history = stateMachine.getStateHistory(testConversationId);
      expect(history).toHaveLength(1);
      expect(history[0].fromState).toBe(ConversationState.IDLE);
      expect(history[0].toState).toBe(ConversationState.INITIAL_CONTACT);
      expect(history[0].reason).toBe('start_conversation');
      expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime());
      expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(afterTransition.getTime());
    });

    it('should track multiple transitions in order', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });

      const history = stateMachine.getStateHistory(testConversationId);
      expect(history).toHaveLength(3);
      
      expect(history[0].fromState).toBe(ConversationState.IDLE);
      expect(history[0].toState).toBe(ConversationState.INITIAL_CONTACT);
      
      expect(history[1].fromState).toBe(ConversationState.INITIAL_CONTACT);
      expect(history[1].toState).toBe(ConversationState.ENGAGEMENT);
      
      expect(history[2].fromState).toBe(ConversationState.ENGAGEMENT);
      expect(history[2].toState).toBe(ConversationState.INFORMATION_GATHERING);
    });

    it('should return empty history for conversation with no transitions', () => {
      const history = stateMachine.getStateHistory(testConversationId);
      expect(history).toHaveLength(0);
    });

    it('should return empty history for non-existent conversation', () => {
      const history = stateMachine.getStateHistory('non-existent');
      expect(history).toHaveLength(0);
    });
  });

  describe('Valid Transitions Query', () => {
    it('should return valid transitions for IDLE state', () => {
      const validTransitions = stateMachine.getValidTransitions(ConversationState.IDLE);
      expect(validTransitions).toEqual([ConversationState.INITIAL_CONTACT]);
    });

    it('should return valid transitions for INITIAL_CONTACT state', () => {
      const validTransitions = stateMachine.getValidTransitions(ConversationState.INITIAL_CONTACT);
      expect(validTransitions).toContain(ConversationState.ENGAGEMENT);
      expect(validTransitions).toContain(ConversationState.TERMINATION);
      expect(validTransitions).toHaveLength(2);
    });

    it('should return valid transitions for ENGAGEMENT state', () => {
      const validTransitions = stateMachine.getValidTransitions(ConversationState.ENGAGEMENT);
      expect(validTransitions).toContain(ConversationState.INFORMATION_GATHERING);
      expect(validTransitions).toContain(ConversationState.TERMINATION);
      expect(validTransitions).toHaveLength(2);
    });

    it('should return valid transitions for INFORMATION_GATHERING state', () => {
      const validTransitions = stateMachine.getValidTransitions(ConversationState.INFORMATION_GATHERING);
      expect(validTransitions).toContain(ConversationState.EXTRACTION);
      expect(validTransitions).toContain(ConversationState.TERMINATION);
      expect(validTransitions).toHaveLength(2);
    });

    it('should return valid transitions for EXTRACTION state', () => {
      const validTransitions = stateMachine.getValidTransitions(ConversationState.EXTRACTION);
      expect(validTransitions).toContain(ConversationState.INFORMATION_GATHERING);
      expect(validTransitions).toContain(ConversationState.TERMINATION);
      expect(validTransitions).toHaveLength(2);
    });

    it('should return empty array for TERMINATION state', () => {
      const validTransitions = stateMachine.getValidTransitions(ConversationState.TERMINATION);
      expect(validTransitions).toEqual([]);
    });
  });

  describe('Conversation Management', () => {
    it('should track multiple conversations independently', () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';

      stateMachine.initializeConversation(conv1);
      stateMachine.initializeConversation(conv2);

      stateMachine.transition(conv1, { type: 'start_conversation' });
      stateMachine.transition(conv2, { type: 'start_conversation' });
      stateMachine.transition(conv2, { type: 'build_trust' });

      expect(stateMachine.getCurrentState(conv1)).toBe(ConversationState.INITIAL_CONTACT);
      expect(stateMachine.getCurrentState(conv2)).toBe(ConversationState.ENGAGEMENT);

      const history1 = stateMachine.getStateHistory(conv1);
      const history2 = stateMachine.getStateHistory(conv2);
      expect(history1).toHaveLength(1);
      expect(history2).toHaveLength(2);
    });

    it('should remove conversation and clean up state', () => {
      stateMachine.initializeConversation(testConversationId);
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      
      stateMachine.removeConversation(testConversationId);
      
      expect(() => {
        stateMachine.getCurrentState(testConversationId);
      }).toThrow('not found');
      
      const history = stateMachine.getStateHistory(testConversationId);
      expect(history).toHaveLength(0);
    });

    it('should list all active conversations', () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';
      const conv3 = 'conversation-3';

      stateMachine.initializeConversation(conv1);
      stateMachine.initializeConversation(conv2);
      stateMachine.initializeConversation(conv3);

      const activeConversations = stateMachine.getActiveConversations();
      expect(activeConversations).toHaveLength(3);
      expect(activeConversations).toContain(conv1);
      expect(activeConversations).toContain(conv2);
      expect(activeConversations).toContain(conv3);
    });
  });

  describe('Event Types', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
    });

    it('should handle goal_achieved event to terminate', () => {
      const event: StateEvent = { type: 'goal_achieved' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.TERMINATION);
    });

    it('should handle unproductive event to terminate', () => {
      const event: StateEvent = { type: 'unproductive' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.TERMINATION);
    });

    it('should handle timeout event to terminate', () => {
      const event: StateEvent = { type: 'timeout' };
      const newState = stateMachine.transition(testConversationId, event);
      expect(newState).toBe(ConversationState.TERMINATION);
    });
  });

  // ============================================================================
  // Edge Case Tests - Task 2.3
  // ============================================================================

  describe('Edge Cases - Invalid Transitions', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should reject transition from IDLE to ENGAGEMENT (skipping INITIAL_CONTACT)', () => {
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.ENGAGEMENT },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition from idle to engagement');
    });

    it('should reject transition from IDLE to INFORMATION_GATHERING', () => {
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.INFORMATION_GATHERING },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from IDLE to EXTRACTION', () => {
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.EXTRACTION },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from IDLE to TERMINATION', () => {
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.TERMINATION },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from INITIAL_CONTACT to INFORMATION_GATHERING (skipping ENGAGEMENT)', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.INFORMATION_GATHERING },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from INITIAL_CONTACT to EXTRACTION', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.EXTRACTION },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from ENGAGEMENT to EXTRACTION (skipping INFORMATION_GATHERING)', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.EXTRACTION },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from ENGAGEMENT to INITIAL_CONTACT (backward)', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.INITIAL_CONTACT },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from INFORMATION_GATHERING to ENGAGEMENT (backward)', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.ENGAGEMENT },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from EXTRACTION to ENGAGEMENT', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      stateMachine.transition(testConversationId, { type: 'extract_entities' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.ENGAGEMENT },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });

    it('should reject transition from EXTRACTION to INITIAL_CONTACT', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      stateMachine.transition(testConversationId, { type: 'extract_entities' });
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.INITIAL_CONTACT },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Invalid transition');
    });
  });

  describe('Edge Cases - Terminal State Behavior', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should not allow transition from TERMINATION to IDLE', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const event: StateEvent = {
        type: 'custom',
        data: { targetState: ConversationState.IDLE },
      };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Cannot transition from terminal state');
    });

    it('should not allow transition from TERMINATION to INITIAL_CONTACT', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const event: StateEvent = { type: 'start_conversation' };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Cannot transition from terminal state');
    });

    it('should not allow transition from TERMINATION to ENGAGEMENT', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const event: StateEvent = { type: 'build_trust' };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Cannot transition from terminal state');
    });

    it('should not allow transition from TERMINATION to INFORMATION_GATHERING', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const event: StateEvent = { type: 'gather_information' };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Cannot transition from terminal state');
    });

    it('should not allow transition from TERMINATION to EXTRACTION', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const event: StateEvent = { type: 'extract_entities' };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Cannot transition from terminal state');
    });

    it('should not allow transition from TERMINATION to TERMINATION (self-loop)', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const event: StateEvent = { type: 'terminate' };
      expect(() => {
        stateMachine.transition(testConversationId, event);
      }).toThrow('Cannot transition from terminal state');
    });

    it('should preserve state history after reaching terminal state', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      const history = stateMachine.getStateHistory(testConversationId);
      expect(history).toHaveLength(3);
      expect(history[2].toState).toBe(ConversationState.TERMINATION);
      
      // Attempt invalid transition
      try {
        stateMachine.transition(testConversationId, { type: 'start_conversation' });
      } catch (error) {
        // Expected error
      }
      
      // History should remain unchanged
      const historyAfter = stateMachine.getStateHistory(testConversationId);
      expect(historyAfter).toHaveLength(3);
      expect(historyAfter).toEqual(history);
    });

    it('should maintain terminal state after failed transition attempt', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      expect(stateMachine.getCurrentState(testConversationId)).toBe(
        ConversationState.TERMINATION
      );
      
      // Attempt invalid transition
      try {
        stateMachine.transition(testConversationId, { type: 'start_conversation' });
      } catch (error) {
        // Expected error
      }
      
      // State should still be TERMINATION
      expect(stateMachine.getCurrentState(testConversationId)).toBe(
        ConversationState.TERMINATION
      );
    });
  });

  describe('Edge Cases - Unknown Conversation IDs', () => {
    it('should throw error when transitioning unknown conversation', () => {
      const event: StateEvent = { type: 'start_conversation' };
      expect(() => {
        stateMachine.transition('unknown-conversation-id', event);
      }).toThrow('Conversation unknown-conversation-id not found');
    });

    it('should throw error when getting state of unknown conversation', () => {
      expect(() => {
        stateMachine.getCurrentState('unknown-conversation-id');
      }).toThrow('Conversation unknown-conversation-id not found');
    });

    it('should return empty history for unknown conversation', () => {
      const history = stateMachine.getStateHistory('unknown-conversation-id');
      expect(history).toEqual([]);
    });

    it('should not throw when removing unknown conversation', () => {
      expect(() => {
        stateMachine.removeConversation('unknown-conversation-id');
      }).not.toThrow();
    });

    it('should handle empty string as conversation ID', () => {
      expect(() => {
        stateMachine.getCurrentState('');
      }).toThrow('not found');
    });

    it('should handle special characters in conversation ID', () => {
      const specialId = 'conv-@#$%^&*()';
      stateMachine.initializeConversation(specialId);
      expect(stateMachine.getCurrentState(specialId)).toBe(ConversationState.IDLE);
      stateMachine.removeConversation(specialId);
    });

    it('should handle very long conversation IDs', () => {
      const longId = 'a'.repeat(1000);
      stateMachine.initializeConversation(longId);
      expect(stateMachine.getCurrentState(longId)).toBe(ConversationState.IDLE);
      stateMachine.removeConversation(longId);
    });
  });

  describe('Edge Cases - Duplicate Initializations', () => {
    it('should throw error when initializing same conversation twice', () => {
      stateMachine.initializeConversation(testConversationId);
      expect(() => {
        stateMachine.initializeConversation(testConversationId);
      }).toThrow(`Conversation ${testConversationId} already exists`);
    });

    it('should throw error even after transitions', () => {
      stateMachine.initializeConversation(testConversationId);
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      
      expect(() => {
        stateMachine.initializeConversation(testConversationId);
      }).toThrow('already exists');
    });

    it('should throw error even in terminal state', () => {
      stateMachine.initializeConversation(testConversationId);
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'terminate' });
      
      expect(() => {
        stateMachine.initializeConversation(testConversationId);
      }).toThrow('already exists');
    });

    it('should allow re-initialization after removal', () => {
      stateMachine.initializeConversation(testConversationId);
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.removeConversation(testConversationId);
      
      expect(() => {
        stateMachine.initializeConversation(testConversationId);
      }).not.toThrow();
      
      expect(stateMachine.getCurrentState(testConversationId)).toBe(
        ConversationState.IDLE
      );
      expect(stateMachine.getStateHistory(testConversationId)).toHaveLength(0);
    });
  });

  describe('Edge Cases - State Transition Validation', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should validate transitions at each step of a complex flow', () => {
      // IDLE -> INITIAL_CONTACT
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'start_conversation' });
      }).not.toThrow();
      
      // INITIAL_CONTACT -> ENGAGEMENT
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'build_trust' });
      }).not.toThrow();
      
      // ENGAGEMENT -> INFORMATION_GATHERING
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'gather_information' });
      }).not.toThrow();
      
      // INFORMATION_GATHERING -> EXTRACTION
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'extract_entities' });
      }).not.toThrow();
      
      // EXTRACTION -> INFORMATION_GATHERING (valid cycle)
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'gather_information' });
      }).not.toThrow();
      
      // INFORMATION_GATHERING -> TERMINATION
      expect(() => {
        stateMachine.transition(testConversationId, { type: 'terminate' });
      }).not.toThrow();
      
      expect(stateMachine.getCurrentState(testConversationId)).toBe(
        ConversationState.TERMINATION
      );
    });

    it('should handle rapid state transitions correctly', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      stateMachine.transition(testConversationId, { type: 'extract_entities' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      stateMachine.transition(testConversationId, { type: 'extract_entities' });
      
      const history = stateMachine.getStateHistory(testConversationId);
      expect(history).toHaveLength(6);
      expect(stateMachine.getCurrentState(testConversationId)).toBe(
        ConversationState.EXTRACTION
      );
    });

    it('should handle termination from different states', () => {
      const conversations = [
        'conv-terminate-from-initial',
        'conv-terminate-from-engagement',
        'conv-terminate-from-info-gathering',
        'conv-terminate-from-extraction',
      ];
      
      // Terminate from INITIAL_CONTACT
      stateMachine.initializeConversation(conversations[0]);
      stateMachine.transition(conversations[0], { type: 'start_conversation' });
      stateMachine.transition(conversations[0], { type: 'terminate' });
      expect(stateMachine.getCurrentState(conversations[0])).toBe(
        ConversationState.TERMINATION
      );
      
      // Terminate from ENGAGEMENT
      stateMachine.initializeConversation(conversations[1]);
      stateMachine.transition(conversations[1], { type: 'start_conversation' });
      stateMachine.transition(conversations[1], { type: 'build_trust' });
      stateMachine.transition(conversations[1], { type: 'terminate' });
      expect(stateMachine.getCurrentState(conversations[1])).toBe(
        ConversationState.TERMINATION
      );
      
      // Terminate from INFORMATION_GATHERING
      stateMachine.initializeConversation(conversations[2]);
      stateMachine.transition(conversations[2], { type: 'start_conversation' });
      stateMachine.transition(conversations[2], { type: 'build_trust' });
      stateMachine.transition(conversations[2], { type: 'gather_information' });
      stateMachine.transition(conversations[2], { type: 'terminate' });
      expect(stateMachine.getCurrentState(conversations[2])).toBe(
        ConversationState.TERMINATION
      );
      
      // Terminate from EXTRACTION
      stateMachine.initializeConversation(conversations[3]);
      stateMachine.transition(conversations[3], { type: 'start_conversation' });
      stateMachine.transition(conversations[3], { type: 'build_trust' });
      stateMachine.transition(conversations[3], { type: 'gather_information' });
      stateMachine.transition(conversations[3], { type: 'extract_entities' });
      stateMachine.transition(conversations[3], { type: 'terminate' });
      expect(stateMachine.getCurrentState(conversations[3])).toBe(
        ConversationState.TERMINATION
      );
      
      // Clean up
      conversations.forEach(id => stateMachine.removeConversation(id));
    });
  });

  describe('Edge Cases - Conversation Isolation', () => {
    it('should maintain independent states for multiple conversations', () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';
      const conv3 = 'conversation-3';
      
      stateMachine.initializeConversation(conv1);
      stateMachine.initializeConversation(conv2);
      stateMachine.initializeConversation(conv3);
      
      // Advance each conversation to different states
      stateMachine.transition(conv1, { type: 'start_conversation' });
      
      stateMachine.transition(conv2, { type: 'start_conversation' });
      stateMachine.transition(conv2, { type: 'build_trust' });
      
      stateMachine.transition(conv3, { type: 'start_conversation' });
      stateMachine.transition(conv3, { type: 'build_trust' });
      stateMachine.transition(conv3, { type: 'gather_information' });
      
      // Verify states are independent
      expect(stateMachine.getCurrentState(conv1)).toBe(ConversationState.INITIAL_CONTACT);
      expect(stateMachine.getCurrentState(conv2)).toBe(ConversationState.ENGAGEMENT);
      expect(stateMachine.getCurrentState(conv3)).toBe(ConversationState.INFORMATION_GATHERING);
      
      // Verify histories are independent
      expect(stateMachine.getStateHistory(conv1)).toHaveLength(1);
      expect(stateMachine.getStateHistory(conv2)).toHaveLength(2);
      expect(stateMachine.getStateHistory(conv3)).toHaveLength(3);
      
      // Clean up
      stateMachine.removeConversation(conv1);
      stateMachine.removeConversation(conv2);
      stateMachine.removeConversation(conv3);
    });

    it('should not affect other conversations when one is removed', () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';
      
      stateMachine.initializeConversation(conv1);
      stateMachine.initializeConversation(conv2);
      
      stateMachine.transition(conv1, { type: 'start_conversation' });
      stateMachine.transition(conv2, { type: 'start_conversation' });
      stateMachine.transition(conv2, { type: 'build_trust' });
      
      // Remove conv1
      stateMachine.removeConversation(conv1);
      
      // conv2 should be unaffected
      expect(stateMachine.getCurrentState(conv2)).toBe(ConversationState.ENGAGEMENT);
      expect(stateMachine.getStateHistory(conv2)).toHaveLength(2);
      
      // conv1 should be gone
      expect(() => {
        stateMachine.getCurrentState(conv1);
      }).toThrow('not found');
      
      // Clean up
      stateMachine.removeConversation(conv2);
    });

    it('should handle concurrent transitions on different conversations', () => {
      const conversations = Array.from({ length: 10 }, (_, i) => `conv-${i}`);
      
      // Initialize all conversations
      conversations.forEach(id => stateMachine.initializeConversation(id));
      
      // Transition each to different states
      conversations.forEach((id, index) => {
        stateMachine.transition(id, { type: 'start_conversation' });
        if (index % 2 === 0) {
          stateMachine.transition(id, { type: 'build_trust' });
        }
        if (index % 3 === 0 && index % 2 === 0) {
          // Only transition to info gathering if already in engagement
          stateMachine.transition(id, { type: 'gather_information' });
        }
      });
      
      // Verify each conversation is in the expected state
      conversations.forEach((id, index) => {
        const state = stateMachine.getCurrentState(id);
        if (index % 3 === 0 && index % 2 === 0) {
          expect(state).toBe(ConversationState.INFORMATION_GATHERING);
        } else if (index % 2 === 0) {
          expect(state).toBe(ConversationState.ENGAGEMENT);
        } else {
          expect(state).toBe(ConversationState.INITIAL_CONTACT);
        }
      });
      
      // Clean up
      conversations.forEach(id => stateMachine.removeConversation(id));
    });
  });

  describe('Edge Cases - State History Integrity', () => {
    beforeEach(() => {
      stateMachine.initializeConversation(testConversationId);
    });

    it('should maintain chronological order in state history', () => {
      const startTime = Date.now();
      
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'gather_information' });
      
      const history = stateMachine.getStateHistory(testConversationId);
      
      // Verify timestamps are in chronological order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].timestamp.getTime()
        );
      }
      
      // Verify all timestamps are after start time
      history.forEach(transition => {
        expect(transition.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
      });
    });

    it('should include correct reason in state transitions', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      stateMachine.transition(testConversationId, { type: 'goal_achieved' });
      
      const history = stateMachine.getStateHistory(testConversationId);
      
      expect(history[0].reason).toBe('start_conversation');
      expect(history[1].reason).toBe('build_trust');
      expect(history[2].reason).toBe('goal_achieved');
    });

    it('should not modify history after failed transition', () => {
      stateMachine.transition(testConversationId, { type: 'start_conversation' });
      stateMachine.transition(testConversationId, { type: 'build_trust' });
      
      const historyBefore = stateMachine.getStateHistory(testConversationId);
      const historyLength = historyBefore.length;
      
      // Attempt invalid transition
      try {
        const event: StateEvent = {
          type: 'custom',
          data: { targetState: ConversationState.EXTRACTION },
        };
        stateMachine.transition(testConversationId, event);
      } catch (error) {
        // Expected error
      }
      
      const historyAfter = stateMachine.getStateHistory(testConversationId);
      expect(historyAfter).toHaveLength(historyLength);
      expect(historyAfter).toEqual(historyBefore);
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    stateMachine = new StateMachine();
  });

  /**
   * Feature: scam-intelligence-system, Property 6: Valid State Transitions
   * Validates: Requirements 2.2
   * 
   * Property: For any conversation state transition, the transition should only use
   * states from the defined set (idle, initial_contact, engagement, information_gathering,
   * extraction, termination) and should follow valid transition rules.
   */
  describe('Property 6: Valid State Transitions', () => {
    const fc = require('fast-check');

    // Define all valid states
    const validStates = [
      ConversationState.IDLE,
      ConversationState.INITIAL_CONTACT,
      ConversationState.ENGAGEMENT,
      ConversationState.INFORMATION_GATHERING,
      ConversationState.EXTRACTION,
      ConversationState.TERMINATION,
    ];

    // Define valid transition rules
    const validTransitionRules: Record<ConversationState, ConversationState[]> = {
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
      [ConversationState.TERMINATION]: [], // Terminal state
    };

    // Generator for valid state transitions
    const validTransitionArbitrary = fc
      .constantFrom(...validStates.filter(s => s !== ConversationState.TERMINATION))
      .chain((fromState: ConversationState) => {
        const possibleTargets = validTransitionRules[fromState];
        if (possibleTargets.length === 0) {
          // Should not happen for non-terminal states, but handle gracefully
          return fc.constant({ fromState, toState: fromState });
        }
        return fc
          .constantFrom(...possibleTargets)
          .map((toState: ConversationState) => ({ fromState, toState }));
      });

    it('should only allow transitions between states in the defined set', () => {
      fc.assert(
        fc.property(
          validTransitionArbitrary,
          fc.string({ minLength: 1, maxLength: 20 }),
          ({ fromState, toState }: { fromState: ConversationState; toState: ConversationState }, conversationId: string) => {
            // Initialize conversation in the fromState
            stateMachine.initializeConversation(conversationId);
            
            // Manually set the state to fromState (if not IDLE)
            if (fromState !== ConversationState.IDLE) {
              // We need to transition through valid states to reach fromState
              const path = getPathToState(fromState);
              for (const targetState of path) {
                const event: StateEvent = {
                  type: 'test_transition',
                  data: { targetState },
                };
                stateMachine.transition(conversationId, event);
              }
            }

            // Now attempt the transition to toState
            const event: StateEvent = {
              type: 'test_transition',
              data: { targetState: toState },
            };

            const resultState = stateMachine.transition(conversationId, event);

            // Verify the result state is in the valid set
            expect(validStates).toContain(resultState);
            
            // Verify the transition followed valid rules
            expect(validTransitionRules[fromState]).toContain(toState);
            
            // Verify the current state matches the target
            expect(stateMachine.getCurrentState(conversationId)).toBe(toState);

            // Clean up
            stateMachine.removeConversation(conversationId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject transitions that violate transition rules', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validStates.filter(s => s !== ConversationState.TERMINATION)),
          fc.constantFrom(...validStates),
          fc.string({ minLength: 1, maxLength: 20 }),
          (fromState: ConversationState, toState: ConversationState, conversationId: string) => {
            // Skip if this is a valid transition
            if (validTransitionRules[fromState].includes(toState)) {
              return true;
            }

            // Initialize conversation and navigate to fromState
            stateMachine.initializeConversation(conversationId);
            
            if (fromState !== ConversationState.IDLE) {
              const path = getPathToState(fromState);
              for (const targetState of path) {
                const event: StateEvent = {
                  type: 'test_transition',
                  data: { targetState },
                };
                stateMachine.transition(conversationId, event);
              }
            }

            // Attempt invalid transition
            const event: StateEvent = {
              type: 'test_transition',
              data: { targetState: toState },
            };

            // Should throw an error for invalid transition
            expect(() => {
              stateMachine.transition(conversationId, event);
            }).toThrow('Invalid transition');

            // Clean up
            stateMachine.removeConversation(conversationId);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow any transitions from terminal state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validStates),
          fc.string({ minLength: 1, maxLength: 20 }),
          (targetState: ConversationState, conversationId: string) => {
            // Initialize and transition to TERMINATION
            stateMachine.initializeConversation(conversationId);
            const path = getPathToState(ConversationState.TERMINATION);
            for (const state of path) {
              const event: StateEvent = {
                type: 'test_transition',
                data: { targetState: state },
              };
              stateMachine.transition(conversationId, event);
            }

            // Verify we're in TERMINATION state
            expect(stateMachine.getCurrentState(conversationId)).toBe(
              ConversationState.TERMINATION
            );

            // Attempt to transition from TERMINATION
            const event: StateEvent = {
              type: 'test_transition',
              data: { targetState },
            };

            // Should throw error
            expect(() => {
              stateMachine.transition(conversationId, event);
            }).toThrow('Cannot transition from terminal state');

            // Clean up
            stateMachine.removeConversation(conversationId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record all valid transitions in state history', () => {
      fc.assert(
        fc.property(
          fc.array(validTransitionArbitrary, { minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (transitions: Array<{ fromState: ConversationState; toState: ConversationState }>, conversationId: string) => {
            stateMachine.initializeConversation(conversationId);
            let currentState: ConversationState = ConversationState.IDLE;
            let successfulTransitions = 0;

            for (const { toState } of transitions) {
              // Check if we're in a terminal state
              if (currentState === ConversationState.TERMINATION) {
                break; // Can't transition from terminal state
              }

              // Check if transition is valid from current state
              if (!validTransitionRules[currentState].includes(toState)) {
                continue; // Skip invalid transitions
              }

              const event: StateEvent = {
                type: 'test_transition',
                data: { targetState: toState },
              };

              stateMachine.transition(conversationId, event);
              currentState = toState;
              successfulTransitions++;
            }

            // Verify history length matches successful transitions
            const history = stateMachine.getStateHistory(conversationId);
            expect(history).toHaveLength(successfulTransitions);

            // Verify each transition in history is valid
            for (const transition of history) {
              expect(validStates).toContain(transition.fromState);
              expect(validStates).toContain(transition.toState);
              expect(validTransitionRules[transition.fromState]).toContain(
                transition.toState
              );
            }

            // Clean up
            stateMachine.removeConversation(conversationId);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Helper function to get a valid path from IDLE to a target state
     */
    function getPathToState(targetState: ConversationState): ConversationState[] {
      const paths: Record<ConversationState, ConversationState[]> = {
        [ConversationState.IDLE]: [],
        [ConversationState.INITIAL_CONTACT]: [ConversationState.INITIAL_CONTACT],
        [ConversationState.ENGAGEMENT]: [
          ConversationState.INITIAL_CONTACT,
          ConversationState.ENGAGEMENT,
        ],
        [ConversationState.INFORMATION_GATHERING]: [
          ConversationState.INITIAL_CONTACT,
          ConversationState.ENGAGEMENT,
          ConversationState.INFORMATION_GATHERING,
        ],
        [ConversationState.EXTRACTION]: [
          ConversationState.INITIAL_CONTACT,
          ConversationState.ENGAGEMENT,
          ConversationState.INFORMATION_GATHERING,
          ConversationState.EXTRACTION,
        ],
        [ConversationState.TERMINATION]: [
          ConversationState.INITIAL_CONTACT,
          ConversationState.TERMINATION,
        ],
      };
      return paths[targetState] || [];
    }
  });
});
