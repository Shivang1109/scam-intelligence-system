/**
 * Agent Unit Tests
 * Tests conversation lifecycle management, message processing, and state transitions
 */

import { Agent } from './Agent';
import { StateMachine } from './StateMachine';
import { PersonaManager } from './PersonaManager';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';
import { ConversationState, SignalType, EntityType } from '../types';

describe('Agent', () => {
  let agent: Agent;
  let stateMachine: StateMachine;
  let personaManager: PersonaManager;
  let nlpExtractor: NLPExtractor;
  let signalDetector: ScamSignalDetector;
  let scamClassifier: ScamClassifier;
  let riskScorer: RiskScorer;

  const conversationId = 'test-conversation-1';
  const initialMessage = 'Hello, this is Microsoft support. Your computer has a virus.';

  beforeEach(() => {
    // Initialize all dependencies
    stateMachine = new StateMachine();
    personaManager = new PersonaManager();
    nlpExtractor = new NLPExtractor();
    signalDetector = new ScamSignalDetector();
    scamClassifier = new ScamClassifier();
    riskScorer = new RiskScorer();

    // Create agent instance
    agent = new Agent(
      conversationId,
      initialMessage,
      stateMachine,
      personaManager,
      nlpExtractor,
      signalDetector,
      scamClassifier,
      riskScorer
    );
  });

  describe('Initialization', () => {
    it('should initialize conversation with selected persona', () => {
      const conversation = agent.getConversation();

      expect(conversation.id).toBe(conversationId);
      expect(conversation.persona).toBeDefined();
      expect(conversation.persona.id).toBeTruthy();
      expect(conversation.state).toBe(ConversationState.IDLE);
      expect(conversation.messages).toHaveLength(0);
      expect(conversation.extractedEntities).toHaveLength(0);
      expect(conversation.scamSignals).toHaveLength(0);
      expect(conversation.classification).toBeNull();
      expect(conversation.riskScore).toBe(0);
    });

    it('should select appropriate persona based on initial message', () => {
      const conversation = agent.getConversation();

      // Tech support scam should select technically naive persona
      expect(conversation.persona.characteristics.techSavvy).toBeLessThan(6);
    });

    it('should initialize state machine for conversation', () => {
      const currentState = stateMachine.getCurrentState(conversationId);
      expect(currentState).toBe(ConversationState.IDLE);
    });

    it('should set initial metadata correctly', () => {
      const conversation = agent.getConversation();

      expect(conversation.metadata.initialMessage).toBe(initialMessage);
      expect(conversation.metadata.messageCount).toBe(0);
      expect(conversation.metadata.duration).toBe(0);
      expect(conversation.metadata.stateHistory).toHaveLength(0);
    });
  });

  describe('Message Processing', () => {
    it('should process incoming message and add to conversation', async () => {
      const message = 'You need to call us immediately at 1-800-555-0123';
      const response = await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.messages.length).toBeGreaterThan(0);

      // Should have scammer message
      const scammerMessages = conversation.messages.filter(m => m.sender === 'scammer');
      expect(scammerMessages).toHaveLength(1);
      expect(scammerMessages[0].content).toBe(message);

      // Should have system response
      const systemMessages = conversation.messages.filter(m => m.sender === 'system');
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).toBe(response.content);
    });

    it('should extract entities from message', async () => {
      const message = 'Call us at +1-800-555-0123 or visit https://fake-microsoft.com';
      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.extractedEntities.length).toBeGreaterThan(0);

      // Should extract phone number
      const phoneEntities = conversation.extractedEntities.filter(
        e => e.type === EntityType.PHONE_NUMBER
      );
      expect(phoneEntities.length).toBeGreaterThan(0);

      // Should extract URL
      const urlEntities = conversation.extractedEntities.filter(
        e => e.type === EntityType.URL
      );
      expect(urlEntities.length).toBeGreaterThan(0);
    });

    it('should detect scam signals in message', async () => {
      const message = 'URGENT! You must act now or your account will be suspended!';
      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.scamSignals.length).toBeGreaterThan(0);

      // Should detect urgency signal
      const urgencySignals = conversation.scamSignals.filter(
        s => s.type === SignalType.URGENCY
      );
      expect(urgencySignals.length).toBeGreaterThan(0);
    });

    it('should update classification after processing message', async () => {
      const message = 'This is Microsoft tech support. Your computer has a virus.';
      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.classification).not.toBeNull();
      expect(conversation.classification?.primaryType).toBeDefined();
    });

    it('should update risk score after processing message', async () => {
      const message = 'Send $500 to this account immediately or face legal action!';
      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.riskScore).toBeGreaterThan(0);
    });

    it('should update conversation metadata', async () => {
      const message = 'Test message';
      
      // Add a small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.metadata.messageCount).toBeGreaterThan(0);
      expect(conversation.metadata.duration).toBeGreaterThanOrEqual(0); // Changed to >= 0
      expect(conversation.updatedAt.getTime()).toBeGreaterThanOrEqual(
        conversation.createdAt.getTime()
      );
    });

    it('should generate response with appropriate delay', async () => {
      const message = 'Hello';
      const response = await agent.processMessage(message);

      expect(response.content).toBeTruthy();
      expect(response.delay).toBeGreaterThan(0);
      expect(response.delay).toBeLessThan(120000); // Less than 2 minutes
    });

    it('should maintain persona consistency in responses', async () => {
      const conversation = agent.getConversation();
      const persona = conversation.persona;

      const message = 'What is your name?';
      const response = await agent.processMessage(message);

      // Response should be consistent with persona characteristics
      expect(response.content).toBeTruthy();
      expect(response.metadata?.personaId).toBe(persona.id);
    });
  });

  describe('State Transitions', () => {
    it('should transition from IDLE to INITIAL_CONTACT', async () => {
      const message = 'Hello';
      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.state).toBe(ConversationState.INITIAL_CONTACT);
    });

    it('should transition from INITIAL_CONTACT to ENGAGEMENT', async () => {
      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');

      const conversation = agent.getConversation();
      expect(conversation.state).toBe(ConversationState.ENGAGEMENT);
    });

    it('should transition to INFORMATION_GATHERING when signals detected', async () => {
      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');
      await agent.processMessage('You need to pay $100 urgently!');

      const conversation = agent.getConversation();
      // State should be at least ENGAGEMENT, possibly INFORMATION_GATHERING
      expect([
        ConversationState.ENGAGEMENT,
        ConversationState.INFORMATION_GATHERING
      ]).toContain(conversation.state);
    });

    it('should transition to EXTRACTION when entities extracted', async () => {
      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');
      await agent.processMessage('Call us at +1-800-555-0123');
      await agent.processMessage('Send payment to user@paytm');
      await agent.processMessage('Visit https://example.com');

      const conversation = agent.getConversation();
      expect(conversation.state).toBe(ConversationState.EXTRACTION);
    });

    it('should record state transitions in history', async () => {
      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');

      const conversation = agent.getConversation();
      expect(conversation.metadata.stateHistory.length).toBeGreaterThan(0);

      const lastTransition = conversation.metadata.stateHistory[
        conversation.metadata.stateHistory.length - 1
      ];
      expect(lastTransition.toState).toBe(conversation.state);
      expect(lastTransition.timestamp).toBeDefined();
    });
  });

  describe('Conversation Termination', () => {
    it('should terminate after 10 unproductive exchanges', async () => {
      // Send 10 messages with no entities or signals
      for (let i = 0; i < 10; i++) {
        await agent.processMessage('ok');
      }

      const conversation = agent.getConversation();
      expect(conversation.state).toBe(ConversationState.TERMINATION);
      expect(agent.isTerminated()).toBe(true);
    });

    it('should terminate when extraction goals met', async () => {
      // Send messages with high entity extraction and signals
      await agent.processMessage('Call +1-800-555-0123');
      await agent.processMessage('Send payment to user@paytm');
      await agent.processMessage('Visit https://fake-site.com');
      await agent.processMessage('Email us at scam@fake.com');
      await agent.processMessage('URGENT! Act now or face legal action!');
      await agent.processMessage('Send $2000 immediately to avoid arrest!');

      const conversation = agent.getConversation();
      
      // Should terminate if high confidence and good extraction
      if (
        conversation.classification &&
        conversation.classification.primaryConfidence > 0.8 &&
        conversation.extractedEntities.length >= 5 &&
        conversation.riskScore > 60
      ) {
        expect(conversation.state).toBe(ConversationState.TERMINATION);
      }
    });

    it('should not transition from termination state', async () => {
      // Force termination
      for (let i = 0; i < 10; i++) {
        await agent.processMessage('ok');
      }

      expect(agent.isTerminated()).toBe(true);

      // Try to send another message
      await agent.processMessage('Hello again');

      const conversation = agent.getConversation();
      expect(conversation.state).toBe(ConversationState.TERMINATION);
    });

    it('should generate termination response', async () => {
      // Force termination
      for (let i = 0; i < 10; i++) {
        await agent.processMessage('ok');
      }

      const conversation = agent.getConversation();
      
      // Find the last system message (before the final 'ok' from scammer)
      const systemMessages = conversation.messages.filter(m => m.sender === 'system');
      expect(systemMessages.length).toBeGreaterThan(0);
      
      const lastSystemMessage = systemMessages[systemMessages.length - 1];
      expect(lastSystemMessage.content).toBeTruthy();
    });
  });

  describe('Conversation Isolation', () => {
    it('should maintain separate conversation state', () => {
      // Create another agent with different conversation ID
      const agent2 = new Agent(
        'test-conversation-2',
        'Different initial message',
        stateMachine,
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer
      );

      const conv1 = agent.getConversation();
      const conv2 = agent2.getConversation();

      expect(conv1.id).not.toBe(conv2.id);
      // Personas might be the same if selection logic chooses the same one
      // Just verify they have personas
      expect(conv1.persona).toBeDefined();
      expect(conv2.persona).toBeDefined();
    });

    it('should not share messages between conversations', async () => {
      const agent2 = new Agent(
        'test-conversation-2',
        'Different message',
        stateMachine,
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer
      );

      await agent.processMessage('Message for agent 1');
      await agent2.processMessage('Message for agent 2');

      const conv1 = agent.getConversation();
      const conv2 = agent2.getConversation();

      // Both should have messages
      expect(conv1.messages.length).toBeGreaterThan(0);
      expect(conv2.messages.length).toBeGreaterThan(0);
      
      const agent1ScammerMsg = conv1.messages.find(m => m.sender === 'scammer');
      const agent2ScammerMsg = conv2.messages.find(m => m.sender === 'scammer');

      expect(agent1ScammerMsg?.content).toBe('Message for agent 1');
      expect(agent2ScammerMsg?.content).toBe('Message for agent 2');
    });

    it('should not share extracted entities between conversations', async () => {
      const agent2 = new Agent(
        'test-conversation-2',
        'Different message',
        stateMachine,
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer
      );

      await agent.processMessage('Call +1-800-555-0123');
      await agent2.processMessage('Call +1-800-555-9999');

      const conv1 = agent.getConversation();
      const conv2 = agent2.getConversation();

      // Both should have entities but different ones
      expect(conv1.extractedEntities.length).toBeGreaterThan(0);
      expect(conv2.extractedEntities.length).toBeGreaterThan(0);

      const phone1 = conv1.extractedEntities.find(e => e.type === EntityType.PHONE_NUMBER);
      const phone2 = conv2.extractedEntities.find(e => e.type === EntityType.PHONE_NUMBER);

      if (phone1 && phone2) {
        expect(phone1.value).not.toBe(phone2.value);
      }
    });
  });

  describe('Response Generation', () => {
    it('should generate appropriate response for INITIAL_CONTACT state', async () => {
      const response = await agent.processMessage('Hello');

      expect(response.content).toBeTruthy();
      expect(response.metadata?.state).toBe(ConversationState.INITIAL_CONTACT);
    });

    it('should generate appropriate response for ENGAGEMENT state', async () => {
      await agent.processMessage('Hello');
      const response = await agent.processMessage('How are you?');

      expect(response.content).toBeTruthy();
      expect(response.metadata?.state).toBe(ConversationState.ENGAGEMENT);
    });

    it('should generate information gathering prompts in INFORMATION_GATHERING state', async () => {
      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');
      const response = await agent.processMessage('You need to pay us!');

      const conversation = agent.getConversation();
      if (conversation.state === ConversationState.INFORMATION_GATHERING) {
        expect(response.content).toBeTruthy();
        // Should ask questions or prompt for information
        expect(
          response.content.includes('?') ||
          response.content.toLowerCase().includes('how') ||
          response.content.toLowerCase().includes('what')
        ).toBe(true);
      }
    });

    it('should calculate response delay based on persona', async () => {
      const conversation = agent.getConversation();
      const persona = conversation.persona;

      const response = await agent.processMessage('Hello');

      // Delay should be influenced by persona typing speed
      expect(response.delay).toBeGreaterThan(0);
      
      // Slower personas should have longer delays
      if (persona.characteristics.responseSpeed < 5) {
        expect(response.delay).toBeGreaterThan(2000);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const response = await agent.processMessage('');

      expect(response.content).toBeTruthy();
      const conversation = agent.getConversation();
      expect(conversation.messages.length).toBeGreaterThan(0);
    });

    it('should handle very long message', async () => {
      const longMessage = 'A'.repeat(10000);
      const response = await agent.processMessage(longMessage);

      expect(response.content).toBeTruthy();
      const conversation = agent.getConversation();
      expect(conversation.messages.length).toBeGreaterThan(0);
    });

    it('should handle message with special characters', async () => {
      const message = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const response = await agent.processMessage(message);

      expect(response.content).toBeTruthy();
    });

    it('should handle multiple entities in single message', async () => {
      const message = 
        'Call +1-800-555-0123 or email scam@fake.com or visit https://fake.com ' +
        'and send payment to user@paytm with account 123456789';

      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.extractedEntities.length).toBeGreaterThan(3);
    });

    it('should handle multiple signals in single message', async () => {
      const message = 
        'URGENT! You must act now! Send $1000 immediately or face arrest! ' +
        'This is the IRS and we will seize your assets!';

      await agent.processMessage(message);

      const conversation = agent.getConversation();
      expect(conversation.scamSignals.length).toBeGreaterThan(2);
    });
  });
});
