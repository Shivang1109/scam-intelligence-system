/**
 * Unit tests for RiskScorer
 * Tests risk score calculation and factor breakdown
 */

import { RiskScorer } from './RiskScorer';
import { 
  Conversation, 
  ConversationState, 
  ScamType, 
  SignalType, 
  EntityType,
  ScamSignal,
  Entity,
  ScamClassification,
  Message,
  Persona
} from '../types';

describe('RiskScorer', () => {
  let scorer: RiskScorer;

  beforeEach(() => {
    scorer = new RiskScorer();
  });

  // Helper function to create a minimal conversation
  const createConversation = (overrides?: Partial<Conversation>): Conversation => {
    const defaultPersona: Persona = {
      id: 'test-persona',
      name: 'Test User',
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
    };

    return {
      id: 'test-conv-1',
      state: ConversationState.INFORMATION_GATHERING,
      persona: defaultPersona,
      messages: [],
      extractedEntities: [],
      scamSignals: [],
      classification: null,
      riskScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        initialMessage: 'Hello',
        messageCount: 0,
        duration: 0,
        stateHistory: [],
      },
      ...overrides,
    };
  };

  const createMessage = (content: string, sender: 'system' | 'scammer' = 'scammer'): Message => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    sender,
    content,
    timestamp: new Date(),
  });

  const createSignal = (type: SignalType, confidence: number = 0.8): ScamSignal => ({
    type,
    confidence,
    text: 'test signal',
    context: 'test context',
    timestamp: new Date(),
  });

  const createEntity = (type: EntityType, value: string, confidence: number = 0.9): Entity => ({
    type,
    value,
    confidence,
    context: 'test context',
    timestamp: new Date(),
    metadata: {
      validated: true,
    },
  });

  const createClassification = (
    primaryType: ScamType,
    primaryConfidence: number = 0.85
  ): ScamClassification => ({
    primaryType,
    primaryConfidence,
    secondaryTypes: [],
    updatedAt: new Date(),
  });

  describe('calculateScore', () => {
    test('should return score of 0 for empty conversation', () => {
      const conversation = createConversation();
      const result = scorer.calculateScore(conversation);

      expect(result.score).toBe(0);
      expect(result.breakdown).toBeDefined();
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    test('should return score between 0 and 100', () => {
      const conversation = createConversation({
        messages: [createMessage('Send $500 now!')],
        scamSignals: [
          createSignal(SignalType.URGENCY, 0.9),
          createSignal(SignalType.FINANCIAL_REQUEST, 0.85),
        ],
        extractedEntities: [
          createEntity(EntityType.PAYMENT_ID, 'test@upi', 0.9),
        ],
        classification: createClassification(ScamType.ADVANCE_FEE, 0.8),
      });

      const result = scorer.calculateScore(conversation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should include complete breakdown', () => {
      const conversation = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY)],
        classification: createClassification(ScamType.PHISHING),
      });

      const result = scorer.calculateScore(conversation);

      expect(result.breakdown).toHaveProperty('signalScore');
      expect(result.breakdown).toHaveProperty('entityScore');
      expect(result.breakdown).toHaveProperty('classificationScore');
      expect(result.breakdown).toHaveProperty('urgencyScore');
      expect(result.breakdown).toHaveProperty('financialScore');
    });

    test('should apply minimum score of 70 for transactions above $1000', () => {
      const conversation = createConversation({
        messages: [createMessage('Please send $5000 immediately')],
        scamSignals: [
          createSignal(SignalType.FINANCIAL_REQUEST, 0.9),
          createSignal(SignalType.URGENCY, 0.8),
        ],
        extractedEntities: [
          createEntity(EntityType.PAYMENT_ID, 'test@upi', 0.9),
        ],
        classification: createClassification(ScamType.ADVANCE_FEE, 0.8),
      });

      const result = scorer.calculateScore(conversation);

      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    test('should increase score with more high-confidence signals', () => {
      const lowSignalConv = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY, 0.5)],
        classification: createClassification(ScamType.PHISHING, 0.7),
      });

      const highSignalConv = createConversation({
        scamSignals: [
          createSignal(SignalType.URGENCY, 0.9),
          createSignal(SignalType.THREAT, 0.9),
          createSignal(SignalType.FINANCIAL_REQUEST, 0.9),
        ],
        classification: createClassification(ScamType.PHISHING, 0.7),
      });

      const lowScore = scorer.calculateScore(lowSignalConv);
      const highScore = scorer.calculateScore(highSignalConv);

      expect(highScore.score).toBeGreaterThan(lowScore.score);
    });

    test('should increase score with more extracted entities', () => {
      const fewEntitiesConv = createConversation({
        extractedEntities: [
          createEntity(EntityType.PHONE_NUMBER, '+1234567890', 0.9),
        ],
        classification: createClassification(ScamType.TECH_SUPPORT, 0.8),
      });

      const manyEntitiesConv = createConversation({
        extractedEntities: [
          createEntity(EntityType.PHONE_NUMBER, '+1234567890', 0.9),
          createEntity(EntityType.PAYMENT_ID, 'test@upi', 0.9),
          createEntity(EntityType.URL, 'http://scam.com', 0.9),
          createEntity(EntityType.EMAIL, 'scam@test.com', 0.9),
        ],
        classification: createClassification(ScamType.TECH_SUPPORT, 0.8),
      });

      const fewScore = scorer.calculateScore(fewEntitiesConv);
      const manyScore = scorer.calculateScore(manyEntitiesConv);

      expect(manyScore.score).toBeGreaterThan(fewScore.score);
    });

    test('should score impersonation scams highly', () => {
      const impersonationConv = createConversation({
        messages: [createMessage('This is the IRS. You owe taxes.')],
        scamSignals: [
          createSignal(SignalType.IMPERSONATION, 0.9),
          createSignal(SignalType.AUTHORITY_CLAIM, 0.9),
        ],
        extractedEntities: [
          createEntity(EntityType.ORGANIZATION, 'IRS', 0.95),
        ],
        classification: createClassification(ScamType.IMPERSONATION, 0.9),
      });

      const result = scorer.calculateScore(impersonationConv);

      expect(result.score).toBeGreaterThan(40);
      expect(result.breakdown.classificationScore).toBeGreaterThan(0);
    });

    test('should handle conversations with no classification', () => {
      const conversation = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY)],
        extractedEntities: [createEntity(EntityType.PHONE_NUMBER, '+1234567890')],
        classification: null,
      });

      const result = scorer.calculateScore(conversation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should round score to 2 decimal places', () => {
      const conversation = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY, 0.333)],
        classification: createClassification(ScamType.PHISHING, 0.777),
      });

      const result = scorer.calculateScore(conversation);

      // Check that score has at most 2 decimal places
      const decimalPlaces = (result.score.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('sophistication scoring', () => {
    test('should score investment scams as highly sophisticated', () => {
      const investmentConv = createConversation({
        classification: createClassification(ScamType.INVESTMENT, 0.9),
        extractedEntities: [
          createEntity(EntityType.URL, 'http://invest.com', 0.9),
          createEntity(EntityType.PAYMENT_ID, 'crypto-wallet', 0.9),
        ],
      });

      const result = scorer.calculateScore(investmentConv);

      expect(result.breakdown.classificationScore).toBeGreaterThan(50);
    });

    test('should give bonus for multi-label classification', () => {
      const singleLabelConv = createConversation({
        classification: {
          primaryType: ScamType.PHISHING,
          primaryConfidence: 0.8,
          secondaryTypes: [],
          updatedAt: new Date(),
        },
      });

      const multiLabelConv = createConversation({
        classification: {
          primaryType: ScamType.PHISHING,
          primaryConfidence: 0.8,
          secondaryTypes: [
            { type: ScamType.IMPERSONATION, confidence: 0.6 },
          ],
          updatedAt: new Date(),
        },
      });

      const singleScore = scorer.calculateScore(singleLabelConv);
      const multiScore = scorer.calculateScore(multiLabelConv);

      expect(multiScore.breakdown.classificationScore).toBeGreaterThan(
        singleScore.breakdown.classificationScore
      );
    });
  });

  describe('financial impact scoring', () => {
    test('should score zero when no financial signals present', () => {
      const conversation = createConversation({
        messages: [createMessage('Hello, how are you?')],
        scamSignals: [createSignal(SignalType.URGENCY)],
      });

      const result = scorer.calculateScore(conversation);

      expect(result.breakdown.financialScore).toBe(0);
    });

    test('should detect dollar amounts in various formats', () => {
      const testCases = [
        '$1,000',
        '$1000',
        '1000 dollars',
        '1,000 USD',
      ];

      for (const amount of testCases) {
        const conversation = createConversation({
          messages: [createMessage(`Send ${amount} now`)],
          scamSignals: [createSignal(SignalType.FINANCIAL_REQUEST, 0.9)],
        });

        const result = scorer.calculateScore(conversation);

        expect(result.breakdown.financialScore).toBeGreaterThan(0);
      }
    });

    test('should score higher for larger amounts', () => {
      const smallAmountConv = createConversation({
        messages: [createMessage('Send $100')],
        scamSignals: [createSignal(SignalType.FINANCIAL_REQUEST, 0.9)],
      });

      const largeAmountConv = createConversation({
        messages: [createMessage('Send $10,000')],
        scamSignals: [createSignal(SignalType.FINANCIAL_REQUEST, 0.9)],
      });

      const smallScore = scorer.calculateScore(smallAmountConv);
      const largeScore = scorer.calculateScore(largeAmountConv);

      expect(largeScore.breakdown.financialScore).toBeGreaterThan(
        smallScore.breakdown.financialScore
      );
    });

    test('should give bonus for payment entities', () => {
      const noPaymentConv = createConversation({
        messages: [createMessage('Send $500')],
        scamSignals: [createSignal(SignalType.FINANCIAL_REQUEST, 0.9)],
      });

      const withPaymentConv = createConversation({
        messages: [createMessage('Send $500')],
        scamSignals: [createSignal(SignalType.FINANCIAL_REQUEST, 0.9)],
        extractedEntities: [
          createEntity(EntityType.PAYMENT_ID, 'test@upi', 0.9),
          createEntity(EntityType.BANK_ACCOUNT, '123456789', 0.9),
        ],
      });

      const noPaymentScore = scorer.calculateScore(noPaymentConv);
      const withPaymentScore = scorer.calculateScore(withPaymentConv);

      expect(withPaymentScore.breakdown.financialScore).toBeGreaterThan(
        noPaymentScore.breakdown.financialScore
      );
    });
  });

  describe('entity volume scoring', () => {
    test('should score zero when no entities extracted', () => {
      const conversation = createConversation({
        extractedEntities: [],
      });

      const result = scorer.calculateScore(conversation);

      expect(result.breakdown.entityScore).toBe(0);
    });

    test('should increase score with entity diversity', () => {
      const singleTypeConv = createConversation({
        extractedEntities: [
          createEntity(EntityType.PHONE_NUMBER, '+1111111111', 0.9),
          createEntity(EntityType.PHONE_NUMBER, '+2222222222', 0.9),
        ],
      });

      const diverseTypeConv = createConversation({
        extractedEntities: [
          createEntity(EntityType.PHONE_NUMBER, '+1111111111', 0.9),
          createEntity(EntityType.EMAIL, 'test@test.com', 0.9),
        ],
      });

      const singleScore = scorer.calculateScore(singleTypeConv);
      const diverseScore = scorer.calculateScore(diverseTypeConv);

      expect(diverseScore.breakdown.entityScore).toBeGreaterThan(
        singleScore.breakdown.entityScore
      );
    });

    test('should consider entity confidence in scoring', () => {
      const lowConfidenceConv = createConversation({
        extractedEntities: [
          createEntity(EntityType.PHONE_NUMBER, '+1234567890', 0.3),
        ],
      });

      const highConfidenceConv = createConversation({
        extractedEntities: [
          createEntity(EntityType.PHONE_NUMBER, '+1234567890', 0.9),
        ],
      });

      const lowScore = scorer.calculateScore(lowConfidenceConv);
      const highScore = scorer.calculateScore(highConfidenceConv);

      expect(highScore.breakdown.entityScore).toBeGreaterThan(
        lowScore.breakdown.entityScore
      );
    });
  });

  describe('social engineering scoring', () => {
    test('should score zero when no signals present', () => {
      const conversation = createConversation({
        scamSignals: [],
      });

      const result = scorer.calculateScore(conversation);

      expect(result.breakdown.signalScore).toBe(0);
    });

    test('should weight threat signals heavily', () => {
      const urgencyConv = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY, 0.9)],
      });

      const threatConv = createConversation({
        scamSignals: [createSignal(SignalType.THREAT, 0.9)],
      });

      const urgencyScore = scorer.calculateScore(urgencyConv);
      const threatScore = scorer.calculateScore(threatConv);

      expect(threatScore.breakdown.signalScore).toBeGreaterThanOrEqual(
        urgencyScore.breakdown.signalScore
      );
    });

    test('should increase score with more signals', () => {
      const fewSignalsConv = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY, 0.8)],
      });

      const manySignalsConv = createConversation({
        scamSignals: [
          createSignal(SignalType.URGENCY, 0.8),
          createSignal(SignalType.THREAT, 0.8),
          createSignal(SignalType.FINANCIAL_REQUEST, 0.8),
        ],
      });

      const fewScore = scorer.calculateScore(fewSignalsConv);
      const manyScore = scorer.calculateScore(manySignalsConv);

      expect(manyScore.breakdown.signalScore).toBeGreaterThan(
        fewScore.breakdown.signalScore
      );
    });
  });

  describe('urgency scoring', () => {
    test('should score zero when no urgency signals', () => {
      const conversation = createConversation({
        scamSignals: [createSignal(SignalType.FINANCIAL_REQUEST)],
      });

      const result = scorer.calculateScore(conversation);

      expect(result.breakdown.urgencyScore).toBe(0);
    });

    test('should increase with multiple urgency signals', () => {
      const singleUrgencyConv = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY, 0.8)],
      });

      const multipleUrgencyConv = createConversation({
        scamSignals: [
          createSignal(SignalType.URGENCY, 0.8),
          createSignal(SignalType.URGENCY, 0.8),
          createSignal(SignalType.URGENCY, 0.8),
        ],
      });

      const singleScore = scorer.calculateScore(singleUrgencyConv);
      const multipleScore = scorer.calculateScore(multipleUrgencyConv);

      expect(multipleScore.breakdown.urgencyScore).toBeGreaterThan(
        singleScore.breakdown.urgencyScore
      );
    });
  });

  describe('edge cases', () => {
    test('should handle extremely high values gracefully', () => {
      const conversation = createConversation({
        messages: [createMessage('Send $999,999,999 now!')],
        scamSignals: Array(100).fill(null).map(() => createSignal(SignalType.THREAT, 1.0)),
        extractedEntities: Array(100).fill(null).map((_, i) => 
          createEntity(EntityType.PHONE_NUMBER, `+${i}`, 1.0)
        ),
        classification: createClassification(ScamType.IMPERSONATION, 1.0),
      });

      const result = scorer.calculateScore(conversation);

      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty messages array', () => {
      const conversation = createConversation({
        messages: [],
        scamSignals: [createSignal(SignalType.URGENCY)],
      });

      const result = scorer.calculateScore(conversation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should handle zero confidence values', () => {
      const conversation = createConversation({
        scamSignals: [createSignal(SignalType.URGENCY, 0)],
        extractedEntities: [createEntity(EntityType.PHONE_NUMBER, '+1234567890', 0)],
        classification: createClassification(ScamType.PHISHING, 0),
      });

      const result = scorer.calculateScore(conversation);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('async methods', () => {
    test('updateScore should throw error (requires storage)', async () => {
      await expect(scorer.updateScore('test-id')).rejects.toThrow(
        'updateScore requires storage integration'
      );
    });

    test('getScoreBreakdown should throw error (requires storage)', async () => {
      await expect(scorer.getScoreBreakdown('test-id')).rejects.toThrow(
        'getScoreBreakdown requires storage integration'
      );
    });
  });
});
