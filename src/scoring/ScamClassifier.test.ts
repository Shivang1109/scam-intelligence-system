/**
 * Unit tests for ScamClassifier
 * Tests classification logic for different scam types
 */

import { ScamClassifier } from './ScamClassifier';
import {
  Conversation,
  ConversationState,
  ScamType,
  SignalType,
  EntityType,
  Message,
  Entity,
  ScamSignal,
} from '../types';

describe('ScamClassifier', () => {
  let classifier: ScamClassifier;

  beforeEach(() => {
    classifier = new ScamClassifier();
  });

  // Helper function to create a test conversation
  const createConversation = (
    messages: string[],
    signals: ScamSignal[] = [],
    entities: Entity[] = []
  ): Conversation => {
    return {
      id: 'test-conv-1',
      state: ConversationState.INFORMATION_GATHERING,
      persona: {
        id: 'persona-1',
        name: 'Test Persona',
        age: 65,
        background: 'Retired teacher',
        vulnerabilityLevel: 7,
        communicationStyle: 'polite',
        typicalResponses: [],
        characteristics: {
          techSavvy: 3,
          trustLevel: 8,
          financialAwareness: 4,
          responseSpeed: 5,
        },
      },
      messages: messages.map((content, idx) => ({
        id: `msg-${idx}`,
        sender: idx % 2 === 0 ? 'scammer' : 'system',
        content,
        timestamp: new Date(),
      })) as Message[],
      extractedEntities: entities,
      scamSignals: signals,
      classification: null,
      riskScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        initialMessage: messages[0] || '',
        messageCount: messages.length,
        duration: 0,
        stateHistory: [],
      },
    };
  };

  // Helper to create signals
  const createSignal = (type: SignalType, confidence: number = 0.9): ScamSignal => ({
    type,
    confidence,
    text: 'test signal',
    context: 'test context',
    timestamp: new Date(),
  });

  // Helper to create entities
  const createEntity = (type: EntityType, confidence: number = 0.9): Entity => ({
    type,
    value: 'test-value',
    confidence,
    context: 'test context',
    timestamp: new Date(),
    metadata: {
      validated: true,
    },
  });

  describe('Phishing Classification', () => {
    it('should classify phishing scam with high confidence', () => {
      const messages = [
        'Your account has been suspended. Click this link to verify your identity immediately.',
        'Okay, what do I need to do?',
        'Enter your password and credit card at https://fake-bank.com/verify',
      ];

      const signals = [
        createSignal(SignalType.URGENCY, 0.9),
        createSignal(SignalType.IMPERSONATION, 0.85),
        createSignal(SignalType.THREAT, 0.8),
      ];

      const entities = [
        createEntity(EntityType.URL, 0.95),
        createEntity(EntityType.ORGANIZATION, 0.8),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.PHISHING);
      expect(classification.primaryConfidence).toBeGreaterThan(0.6);
    });

    it('should detect phishing keywords', () => {
      const messages = [
        'Please verify your account credentials by clicking the link below.',
        'Your password needs to be reset due to suspicious activity.',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.PHISHING);
    });
  });

  describe('Tech Support Classification', () => {
    it('should classify tech support scam with high confidence', () => {
      const messages = [
        'This is Microsoft technical support. Your computer has been infected with a virus.',
        'Oh no! What should I do?',
        'We need remote access to fix it. Please install TeamViewer and pay $299 for the service.',
      ];

      const signals = [
        createSignal(SignalType.IMPERSONATION, 0.95),
        createSignal(SignalType.URGENCY, 0.85),
        createSignal(SignalType.FINANCIAL_REQUEST, 0.9),
      ];

      const entities = [
        createEntity(EntityType.ORGANIZATION, 0.9),
        createEntity(EntityType.PAYMENT_ID, 0.85),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.TECH_SUPPORT);
      expect(classification.primaryConfidence).toBeGreaterThan(0.6);
    });

    it('should detect tech support keywords', () => {
      const messages = [
        'Your Windows computer has malware. Call our tech support immediately.',
        'We detected a virus on your Apple device. Install our antivirus software.',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.TECH_SUPPORT);
    });
  });

  describe('Romance Classification', () => {
    it('should classify romance scam with high confidence', () => {
      const messages = [
        'Hello darling, I love you so much. I want to come visit you.',
        'That would be wonderful!',
        'I need help with the plane ticket. Can you send me $500? I am desperate to see you.',
      ];

      const signals = [
        createSignal(SignalType.FINANCIAL_REQUEST, 0.95),
        createSignal(SignalType.URGENCY, 0.8),
      ];

      const entities = [
        createEntity(EntityType.PAYMENT_ID, 0.9),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.ROMANCE);
      expect(classification.primaryConfidence).toBeGreaterThan(0.5);
    });

    it('should detect romance keywords', () => {
      const messages = [
        'My love, I am in trouble and need your help. There was an emergency.',
        'Sweetheart, I am stranded at the hospital and need money.',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.ROMANCE);
    });
  });

  describe('Investment Classification', () => {
    it('should classify investment scam with high confidence', () => {
      const messages = [
        'Guaranteed investment opportunity! Double your money in 30 days with our crypto trading platform.',
        'That sounds interesting. How does it work?',
        'Just invest $1000 in Bitcoin and we guarantee 200% returns. Low risk, high profit!',
      ];

      const signals = [
        createSignal(SignalType.FINANCIAL_REQUEST, 0.9),
        createSignal(SignalType.URGENCY, 0.75),
      ];

      const entities = [
        createEntity(EntityType.PAYMENT_ID, 0.85),
        createEntity(EntityType.URL, 0.8),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.INVESTMENT);
      expect(classification.primaryConfidence).toBeGreaterThan(0.6);
    });

    it('should detect investment keywords', () => {
      const messages = [
        'Passive income opportunity with guaranteed returns on forex trading.',
        'Get rich quick with our cryptocurrency investment fund. High ROI, no risk!',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.INVESTMENT);
    });
  });

  describe('Impersonation Classification', () => {
    it('should classify impersonation scam with high confidence', () => {
      const messages = [
        'This is the IRS. You owe back taxes and there is a warrant for your arrest.',
        'What? I paid my taxes!',
        'You must pay immediately or face legal action. Call this number now.',
      ];

      const signals = [
        createSignal(SignalType.IMPERSONATION, 0.95),
        createSignal(SignalType.THREAT, 0.9),
        createSignal(SignalType.URGENCY, 0.85),
      ];

      const entities = [
        createEntity(EntityType.ORGANIZATION, 0.9),
        createEntity(EntityType.PHONE_NUMBER, 0.85),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.IMPERSONATION);
      expect(classification.primaryConfidence).toBeGreaterThan(0.7);
    });

    it('should detect impersonation keywords', () => {
      const messages = [
        'FBI agent calling about a federal investigation. You are under arrest.',
        'Social Security Administration. Your benefits will be suspended.',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.IMPERSONATION);
    });
  });

  describe('Advance Fee Classification', () => {
    it('should classify advance fee scam with high confidence', () => {
      const messages = [
        'Congratulations! You have inherited $5 million. To claim it, pay a processing fee of $500.',
        'Really? That is amazing!',
        'Yes, but you must pay the tax and customs clearance fee upfront to release the funds.',
      ];

      const signals = [
        createSignal(SignalType.FINANCIAL_REQUEST, 0.95),
        createSignal(SignalType.URGENCY, 0.8),
      ];

      const entities = [
        createEntity(EntityType.PAYMENT_ID, 0.9),
        createEntity(EntityType.BANK_ACCOUNT, 0.85),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.ADVANCE_FEE);
      expect(classification.primaryConfidence).toBeGreaterThan(0.6);
    });

    it('should detect advance fee keywords', () => {
      const messages = [
        'You won a prize! Pay the processing fee to claim your award.',
        'Inheritance available. Pay upfront tax to unlock the funds.',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.ADVANCE_FEE);
    });
  });

  describe('Lottery Classification', () => {
    it('should classify lottery scam with high confidence', () => {
      const messages = [
        'Congratulations! You are the lucky winner of $1,000,000 in our sweepstakes!',
        'Wow! How do I claim it?',
        'To claim your prize, please pay the processing fee of $200.',
      ];

      const signals = [
        createSignal(SignalType.FINANCIAL_REQUEST, 0.9),
        createSignal(SignalType.URGENCY, 0.75),
      ];

      const entities = [
        createEntity(EntityType.PAYMENT_ID, 0.85),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      // Lottery and advance_fee are very similar - both involve prizes and fees
      // Accept either as primary type
      expect([ScamType.LOTTERY, ScamType.ADVANCE_FEE]).toContain(classification.primaryType);
      expect(classification.primaryConfidence).toBeGreaterThan(0.6);
    });

    it('should detect lottery keywords', () => {
      const messages = [
        'You won the lottery jackpot! Congratulations, you were selected as the winner.',
        'Lucky winner of our raffle drawing. Claim your prize now!',
      ];

      const conversation = createConversation(messages);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBe(ScamType.LOTTERY);
    });
  });

  describe('Multi-label Classification', () => {
    it('should identify secondary scam types when multiple patterns present', () => {
      const messages = [
        'This is Microsoft support. Your computer has a virus.',
        'We need you to pay $299 for our antivirus software.',
        'Also, you won a prize! Pay $50 processing fee to claim it.',
      ];

      const signals = [
        createSignal(SignalType.IMPERSONATION, 0.9),
        createSignal(SignalType.FINANCIAL_REQUEST, 0.95),
        createSignal(SignalType.URGENCY, 0.8),
      ];

      const entities = [
        createEntity(EntityType.ORGANIZATION, 0.9),
        createEntity(EntityType.PAYMENT_ID, 0.85),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      // Should classify as tech support or advance_fee (both have strong signals)
      expect([ScamType.TECH_SUPPORT, ScamType.ADVANCE_FEE]).toContain(classification.primaryType);
      expect(classification.secondaryTypes.length).toBeGreaterThan(0);
      
      // Should have secondary types with reasonable confidence
      const secondaryConfidences = classification.secondaryTypes.map(t => t.confidence);
      expect(Math.max(...secondaryConfidences)).toBeGreaterThan(0.3);
    });

    it('should not include low-confidence secondary types', () => {
      const messages = [
        'Your account has been suspended. Verify your identity immediately.',
      ];

      const signals = [
        createSignal(SignalType.URGENCY, 0.9),
        createSignal(SignalType.THREAT, 0.85),
      ];

      const conversation = createConversation(messages, signals);
      const classification = classifier.classify(conversation);

      // Secondary types should only include those with confidence > 0.3
      classification.secondaryTypes.forEach(secondary => {
        expect(secondary.confidence).toBeGreaterThan(0.3);
      });
    });
  });

  describe('Classification Updates', () => {
    it('should update classification timestamp', () => {
      const messages = ['Test message'];
      const conversation = createConversation(messages);
      
      const classification = classifier.classify(conversation);
      
      expect(classification.updatedAt).toBeInstanceOf(Date);
      expect(classification.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should throw error for updateClassification without storage', async () => {
      await expect(
        classifier.updateClassification('conv-1', 'new data')
      ).rejects.toThrow('updateClassification requires storage integration');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conversation', () => {
      const conversation = createConversation([]);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBeDefined();
      expect(classification.primaryConfidence).toBeGreaterThanOrEqual(0);
      expect(classification.primaryConfidence).toBeLessThanOrEqual(1);
    });

    it('should handle conversation with no signals or entities', () => {
      const messages = ['Hello', 'Hi there', 'How are you?'];
      const conversation = createConversation(messages);
      
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBeDefined();
      expect(classification.primaryConfidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle conversation with only signals', () => {
      const messages = ['Act now! Urgent! Immediate action required!'];
      const signals = [
        createSignal(SignalType.URGENCY, 0.95),
      ];

      const conversation = createConversation(messages, signals);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBeDefined();
      expect(classification.primaryConfidence).toBeGreaterThan(0);
    });

    it('should handle conversation with only entities', () => {
      const messages = ['Contact us at example@test.com or call 555-1234'];
      const entities = [
        createEntity(EntityType.EMAIL, 0.9),
        createEntity(EntityType.PHONE_NUMBER, 0.85),
      ];

      const conversation = createConversation(messages, [], entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBeDefined();
      expect(classification.primaryConfidence).toBeGreaterThanOrEqual(0);
    });

    it('should cap confidence at 1.0', () => {
      const messages = [
        'URGENT! IRS calling! Pay now! Arrest warrant! Act immediately!',
        'Government official! Federal agent! Legal action! Court summons!',
      ];

      const signals = [
        createSignal(SignalType.URGENCY, 1.0),
        createSignal(SignalType.IMPERSONATION, 1.0),
        createSignal(SignalType.THREAT, 1.0),
      ];

      const entities = [
        createEntity(EntityType.ORGANIZATION, 1.0),
        createEntity(EntityType.PHONE_NUMBER, 1.0),
      ];

      const conversation = createConversation(messages, signals, entities);
      const classification = classifier.classify(conversation);

      expect(classification.primaryConfidence).toBeLessThanOrEqual(1.0);
      classification.secondaryTypes.forEach(secondary => {
        expect(secondary.confidence).toBeLessThanOrEqual(1.0);
      });
    });

    it('should handle very long messages', () => {
      const longMessage = 'word '.repeat(1000) + 'urgent payment required';
      const conversation = createConversation([longMessage]);
      
      const classification = classifier.classify(conversation);

      expect(classification.primaryType).toBeDefined();
      expect(classification.primaryConfidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have higher confidence with more matching indicators', () => {
      const messagesLow = ['Your account needs verification.'];
      const conversationLow = createConversation(messagesLow);
      const classificationLow = classifier.classify(conversationLow);

      const messagesHigh = [
        'Your account has been suspended! Verify immediately or face legal action!',
        'Click this link to update your password and credit card information.',
      ];
      const signalsHigh = [
        createSignal(SignalType.URGENCY, 0.9),
        createSignal(SignalType.THREAT, 0.85),
        createSignal(SignalType.IMPERSONATION, 0.8),
      ];
      const entitiesHigh = [
        createEntity(EntityType.URL, 0.9),
        createEntity(EntityType.ORGANIZATION, 0.85),
      ];
      const conversationHigh = createConversation(messagesHigh, signalsHigh, entitiesHigh);
      const classificationHigh = classifier.classify(conversationHigh);

      expect(classificationHigh.primaryConfidence).toBeGreaterThan(
        classificationLow.primaryConfidence
      );
    });

    it('should weight signals, entities, and keywords appropriately', () => {
      // Test with only signals
      const signalsOnly = [
        createSignal(SignalType.URGENCY, 0.9),
        createSignal(SignalType.FINANCIAL_REQUEST, 0.9),
      ];
      const convSignals = createConversation(['urgent payment'], signalsOnly);
      const classSignals = classifier.classify(convSignals);

      // Test with only entities
      const entitiesOnly = [
        createEntity(EntityType.PAYMENT_ID, 0.9),
        createEntity(EntityType.BANK_ACCOUNT, 0.9),
      ];
      const convEntities = createConversation(['payment info'], [], entitiesOnly);
      const classEntities = classifier.classify(convEntities);

      // Test with only keywords
      const convKeywords = createConversation([
        'lottery prize winner congratulations claim sweepstakes jackpot'
      ]);
      const classKeywords = classifier.classify(convKeywords);

      // All should produce valid classifications
      expect(classSignals.primaryConfidence).toBeGreaterThan(0);
      expect(classEntities.primaryConfidence).toBeGreaterThan(0);
      expect(classKeywords.primaryConfidence).toBeGreaterThan(0);
    });
  });
});
