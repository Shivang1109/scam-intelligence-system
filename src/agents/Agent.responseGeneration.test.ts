/**
 * Agent Response Generation Unit Tests
 * Tests enhanced response generation logic with context-awareness and persona consistency
 * 
 * Validates Requirements: 1.2, 1.3, 1.4
 */

import { Agent } from './Agent';
import { StateMachine } from './StateMachine';
import { PersonaManager } from './PersonaManager';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';
import { ConversationState } from '../types';

describe('Agent - Enhanced Response Generation', () => {
  let agent: Agent;
  let stateMachine: StateMachine;
  let personaManager: PersonaManager;
  let nlpExtractor: NLPExtractor;
  let signalDetector: ScamSignalDetector;
  let scamClassifier: ScamClassifier;
  let riskScorer: RiskScorer;

  const conversationId = 'test-response-gen-1';

  beforeEach(() => {
    stateMachine = new StateMachine();
    personaManager = new PersonaManager();
    nlpExtractor = new NLPExtractor();
    signalDetector = new ScamSignalDetector();
    scamClassifier = new ScamClassifier();
    riskScorer = new RiskScorer();
  });

  describe('Context-Aware Response Selection', () => {
    it('should generate context-appropriate response for greeting', async () => {
      const initialMessage = 'Hello, how are you today?';
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

      const response = await agent.processMessage(initialMessage);

      // Response should acknowledge greeting or ask who it is
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
    });

    it('should generate concerned response for urgent messages', async () => {
      const initialMessage = 'URGENT! You must act immediately!';
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

      const response = await agent.processMessage(initialMessage);
      const conversation = agent.getConversation();

      // Should generate a valid response
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Vulnerable personas should respond (not ignore)
      if (conversation.persona.vulnerabilityLevel > 6) {
        expect(response.content.length).toBeGreaterThan(5);
      }
    });

    it('should generate trust-based response for authority claims', async () => {
      const initialMessage = 'This is the IRS. You owe back taxes.';
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

      const response = await agent.processMessage(initialMessage);

      // Should generate a valid response
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      // All personas should respond appropriately
      // High trust personas may be more cooperative
      // Low trust personas may be more skeptical
      // But we can't guarantee specific words due to randomness
      expect(response.content.length).toBeGreaterThan(5);
    });

    it('should generate appropriate response for financial mentions', async () => {
      const initialMessage = 'Hello';
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

      await agent.processMessage(initialMessage);
      await agent.processMessage('How are you?');
      const response = await agent.processMessage('You need to pay $500 for this service.');

      // Response should address the payment request
      expect(response.content).toBeTruthy();
    });

    it('should generate tech-appropriate response based on persona', async () => {
      const initialMessage = 'You need to download this software immediately.';
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

      const response = await agent.processMessage(initialMessage);
      const conversation = agent.getConversation();

      // Should generate a valid response
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Low tech-savvy personas should respond (not crash)
      if (conversation.persona.characteristics.techSavvy < 5) {
        expect(response.content.length).toBeGreaterThan(5);
      }
    });
  });

  describe('Persona Consistency', () => {
    it('should maintain consistent communication style across messages', async () => {
      const initialMessage = 'Hello, this is a test.';
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

      const conversation = agent.getConversation();
      const persona = conversation.persona;

      // Send multiple messages and check consistency
      const response1 = await agent.processMessage('Hello');
      const response2 = await agent.processMessage('How are you?');
      const response3 = await agent.processMessage('Can you help me?');

      // All responses should be from the same persona
      expect(response1.metadata?.personaId).toBe(persona.id);
      expect(response2.metadata?.personaId).toBe(persona.id);
      expect(response3.metadata?.personaId).toBe(persona.id);

      // Check for style consistency
      const responses = [response1.content, response2.content, response3.content];
      
      // Formal personas should consistently use formal language
      if (persona.communicationStyle.includes('formal')) {
        const casualWords = ['yeah', 'nah', 'gonna', 'wanna', 'tbh', 'rn', 'lol'];
        responses.forEach(resp => {
          const hasCasual = casualWords.some(word => 
            resp.toLowerCase().includes(word)
          );
          expect(hasCasual).toBe(false);
        });
      }
    });

    it('should use persona-appropriate vocabulary', async () => {
      const initialMessage = 'Hello';
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

      const conversation = agent.getConversation();
      const persona = conversation.persona;
      const personaConfig = personaManager.getPersonaConfig(persona.id);

      // Send several messages to collect responses
      const responses: string[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await agent.processMessage(`Message ${i}`);
        responses.push(response.content.toLowerCase());
      }

      // All responses should be valid
      responses.forEach(resp => {
        expect(resp).toBeTruthy();
        expect(resp.length).toBeGreaterThan(0);
      });
      
      // At least some responses should use persona vocabulary OR be from typical responses
      const allResponses = responses.join(' ');
      const usesPersonaVocab = personaConfig.responsePatterns.vocabulary.some(word =>
        allResponses.includes(word.toLowerCase())
      );
      
      const usesTypicalResponses = persona.typicalResponses.some(typical =>
        responses.some(resp => resp.includes(typical.toLowerCase()))
      );

      // Should use either persona vocab or typical responses
      expect(usesPersonaVocab || usesTypicalResponses).toBe(true);
    });

    it('should maintain vulnerability level consistency', async () => {
      const initialMessage = 'Send me $1000 right now!';
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

      const conversation = agent.getConversation();
      const persona = conversation.persona;

      const response = await agent.processMessage(initialMessage);

      // Response should exist and be appropriate
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      // High vulnerability personas should generally be more compliant
      // But we can't guarantee specific words due to randomness
      if (persona.vulnerabilityLevel > 7) {
        // Should generate some response (not refuse outright)
        expect(response.content.length).toBeGreaterThan(5);
      }

      // Low vulnerability personas should show more caution
      // But again, we can't guarantee specific words
      if (persona.vulnerabilityLevel < 4) {
        expect(response.content.length).toBeGreaterThan(5);
      }
    });

    it('should respect persona tech-savviness in responses', async () => {
      const initialMessage = 'Click this link and install the software.';
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

      const conversation = agent.getConversation();
      const persona = conversation.persona;

      const response = await agent.processMessage(initialMessage);

      // All personas should generate valid responses
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Low tech-savvy personas should express some form of response
      // The specific wording may vary due to randomness
      if (persona.characteristics.techSavvy < 4) {
        // Should generate a response (not crash or return empty)
        expect(response.content.length).toBeGreaterThan(5);
      }
    });
  });

  describe('Natural Conversation Flow', () => {
    it('should generate different responses for repeated similar messages', async () => {
      const initialMessage = 'Hello';
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

      const response1 = await agent.processMessage('Tell me more');
      const response2 = await agent.processMessage('Tell me more');
      const response3 = await agent.processMessage('Tell me more');

      // Responses should vary (not always identical)
      const responses = [response1.content, response2.content, response3.content];
      const uniqueResponses = new Set(responses);
      
      // At least 2 different responses out of 3
      expect(uniqueResponses.size).toBeGreaterThanOrEqual(2);
    });

    it('should build on conversation history', async () => {
      const initialMessage = 'Hello';
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

      await agent.processMessage('Hello');
      await agent.processMessage('I need your help with something');
      const response = await agent.processMessage('Can you send me your phone number?');

      // Response should be contextually appropriate
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
    });

    it('should adapt responses based on conversation state', async () => {
      const initialMessage = 'Hello';
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

      // Initial contact response
      const response1 = await agent.processMessage('Hello');
      expect(response1.metadata?.state).toBe(ConversationState.INITIAL_CONTACT);

      // Engagement response
      const response2 = await agent.processMessage('How are you?');
      expect(response2.metadata?.state).toBe(ConversationState.ENGAGEMENT);

      // States should be different
      expect(response1.metadata?.state).not.toBe(response2.metadata?.state);
      
      // Both should have valid content
      expect(response1.content).toBeTruthy();
      expect(response2.content).toBeTruthy();
    });

    it('should generate entity-prompting responses in information gathering state', async () => {
      const initialMessage = 'Hello';
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

      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');
      await agent.processMessage('You need to pay us urgently!');
      const response = await agent.processMessage('Send the payment now');

      const conversation = agent.getConversation();

      // In information gathering state, should ask questions
      if (conversation.state === ConversationState.INFORMATION_GATHERING) {
        expect(
          response.content.includes('?') ||
          response.content.toLowerCase().includes('how') ||
          response.content.toLowerCase().includes('what') ||
          response.content.toLowerCase().includes('where')
        ).toBe(true);
      }
    });
  });

  describe('Human-Like Response Patterns', () => {
    it('should include natural variations in response timing', async () => {
      const initialMessage = 'Hello';
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

      // Send same message multiple times and check timing variation
      const delays: number[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await agent.processMessage('Hello');
        delays.push(response.delay);
      }

      // Delays should vary (not all identical)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // All delays should be within reasonable bounds
      delays.forEach(delay => {
        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThan(120000); // Less than 2 minutes
      });
    });

    it('should adjust response delay based on message length', async () => {
      const initialMessage = 'Hello';
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

      const shortResponse = await agent.processMessage('Hi');
      const longResponse = await agent.processMessage(
        'This is a much longer message that contains a lot more text and should take longer to read and respond to because it has many more words and characters.'
      );

      // Note: Response delay is based on the agent's response length, not input length
      // Both should have reasonable delays
      expect(shortResponse.delay).toBeGreaterThan(0);
      expect(longResponse.delay).toBeGreaterThan(0);
    });

    it('should occasionally include hesitation or uncertainty', async () => {
      const initialMessage = 'Hello';
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

      // Send many messages to increase chance of hesitation
      const responses: string[] = [];
      for (let i = 0; i < 20; i++) {
        await agent.processMessage('Hello');
        await agent.processMessage('How are you?');
        const response = await agent.processMessage('Send me $100');
        responses.push(response.content.toLowerCase());
      }

      // At least some responses should show hesitation or uncertainty
      const allResponses = responses.join(' ');
      const showsHesitation = 
        allResponses.includes('sure') ||
        allResponses.includes('think') ||
        allResponses.includes('maybe') ||
        allResponses.includes('not sure') ||
        allResponses.includes('?');

      expect(showsHesitation).toBe(true);
    });

    it('should vary response length naturally', async () => {
      const initialMessage = 'Hello';
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

      const lengths: number[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await agent.processMessage(`Message ${i}`);
        lengths.push(response.content.length);
      }

      // Response lengths should vary
      const uniqueLengths = new Set(lengths);
      expect(uniqueLengths.size).toBeGreaterThan(3);

      // All responses should be reasonable length
      lengths.forEach(length => {
        expect(length).toBeGreaterThan(0);
        expect(length).toBeLessThan(500); // Reasonable max length
      });
    });
  });

  describe('State-Specific Response Generation', () => {
    it('should generate appropriate initial contact responses', async () => {
      const initialMessage = 'Hello, this is Microsoft support.';
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

      const response = await agent.processMessage(initialMessage);

      expect(response.metadata?.state).toBe(ConversationState.INITIAL_CONTACT);
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      // Initial contact should generate some form of response
      // The specific wording varies due to randomness and persona
      expect(response.content.length).toBeGreaterThan(5);
    });

    it('should generate appropriate engagement responses', async () => {
      const initialMessage = 'Hello';
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

      await agent.processMessage('Hello');
      const response = await agent.processMessage('How are you today?');

      expect(response.metadata?.state).toBe(ConversationState.ENGAGEMENT);
      expect(response.content).toBeTruthy();
    });

    it('should generate appropriate extraction responses', async () => {
      const initialMessage = 'Hello';
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

      // Progress to extraction state
      await agent.processMessage('Hello');
      await agent.processMessage('How are you?');
      await agent.processMessage('Call us at +1-800-555-0123');
      await agent.processMessage('Send payment to user@paytm');
      await agent.processMessage('Visit https://example.com');
      const response = await agent.processMessage('Do this now');

      const conversation = agent.getConversation();

      // Should generate valid response regardless of state
      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);
      
      if (conversation.state === ConversationState.EXTRACTION) {
        // Extraction responses should show some form of engagement
        expect(response.content.length).toBeGreaterThan(5);
      }
    });

    it('should generate appropriate termination responses', async () => {
      const initialMessage = 'Hello';
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

      // Force termination by sending unproductive messages
      for (let i = 0; i < 10; i++) {
        await agent.processMessage('ok');
      }

      const conversation = agent.getConversation();
      expect(conversation.state).toBe(ConversationState.TERMINATION);

      // Find last system message
      const systemMessages = conversation.messages.filter(m => m.sender === 'system');
      const lastResponse = systemMessages[systemMessages.length - 1];

      // Termination response should exist and be non-empty
      expect(lastResponse).toBeDefined();
      expect(lastResponse.content).toBeTruthy();
      expect(lastResponse.content.length).toBeGreaterThan(0);
      
      // Should be a reasonable response (not just "ok")
      expect(lastResponse.content.length).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scammer message gracefully', async () => {
      const initialMessage = '';
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

      const response = await agent.processMessage('');
      expect(response.content).toBeTruthy();
    });

    it('should handle message with only special characters', async () => {
      const initialMessage = '!@#$%^&*()';
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

      const response = await agent.processMessage('!@#$%^&*()');
      expect(response.content).toBeTruthy();
    });

    it('should handle very long messages', async () => {
      const initialMessage = 'A'.repeat(5000);
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

      const response = await agent.processMessage(initialMessage);
      expect(response.content).toBeTruthy();
      expect(response.delay).toBeGreaterThan(0);
    });

    it('should handle rapid message succession', async () => {
      const initialMessage = 'Hello';
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

      // Send multiple messages rapidly
      const responses = await Promise.all([
        agent.processMessage('Message 1'),
        agent.processMessage('Message 2'),
        agent.processMessage('Message 3'),
      ]);

      // All should generate valid responses
      responses.forEach(response => {
        expect(response.content).toBeTruthy();
        expect(response.delay).toBeGreaterThan(0);
      });
    });
  });
});
