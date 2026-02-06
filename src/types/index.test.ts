/**
 * Basic tests to verify type definitions and project setup
 */

import {
  ConversationState,
  EntityType,
  SignalType,
  ScamType,
  Persona,
  Entity,
  ScamSignal,
  Conversation,
} from './index';

describe('Type Definitions', () => {
  describe('Enums', () => {
    test('ConversationState enum has all required states', () => {
      expect(ConversationState.IDLE).toBe('idle');
      expect(ConversationState.INITIAL_CONTACT).toBe('initial_contact');
      expect(ConversationState.ENGAGEMENT).toBe('engagement');
      expect(ConversationState.INFORMATION_GATHERING).toBe('information_gathering');
      expect(ConversationState.EXTRACTION).toBe('extraction');
      expect(ConversationState.TERMINATION).toBe('termination');
    });

    test('EntityType enum has all required types', () => {
      expect(EntityType.PHONE_NUMBER).toBe('phone_number');
      expect(EntityType.PAYMENT_ID).toBe('payment_id');
      expect(EntityType.URL).toBe('url');
      expect(EntityType.ORGANIZATION).toBe('organization');
      expect(EntityType.BANK_ACCOUNT).toBe('bank_account');
      expect(EntityType.EMAIL).toBe('email');
    });

    test('SignalType enum has all required types', () => {
      expect(SignalType.URGENCY).toBe('urgency');
      expect(SignalType.FINANCIAL_REQUEST).toBe('financial_request');
      expect(SignalType.IMPERSONATION).toBe('impersonation');
      expect(SignalType.THREAT).toBe('threat');
      expect(SignalType.AUTHORITY_CLAIM).toBe('authority_claim');
    });

    test('ScamType enum has all required types', () => {
      expect(ScamType.PHISHING).toBe('phishing');
      expect(ScamType.ROMANCE).toBe('romance');
      expect(ScamType.INVESTMENT).toBe('investment');
      expect(ScamType.TECH_SUPPORT).toBe('tech_support');
      expect(ScamType.IMPERSONATION).toBe('impersonation');
      expect(ScamType.ADVANCE_FEE).toBe('advance_fee');
      expect(ScamType.LOTTERY).toBe('lottery');
    });
  });

  describe('Type Structure', () => {
    test('Persona type has required fields', () => {
      const persona: Persona = {
        id: 'test-persona',
        name: 'Test User',
        age: 65,
        background: 'Retired teacher',
        vulnerabilityLevel: 7,
        communicationStyle: 'polite and trusting',
        typicalResponses: ['Oh my!', 'Really?'],
        characteristics: {
          techSavvy: 3,
          trustLevel: 8,
          financialAwareness: 4,
          responseSpeed: 5,
        },
      };

      expect(persona.id).toBe('test-persona');
      expect(persona.vulnerabilityLevel).toBe(7);
      expect(persona.characteristics.techSavvy).toBe(3);
    });

    test('Entity type has required fields', () => {
      const entity: Entity = {
        type: EntityType.PHONE_NUMBER,
        value: '+1234567890',
        confidence: 0.95,
        context: 'Please call me at +1234567890',
        timestamp: new Date(),
        metadata: {
          format: 'E.164',
          validated: true,
          countryCode: '+1',
        },
      };

      expect(entity.type).toBe(EntityType.PHONE_NUMBER);
      expect(entity.confidence).toBe(0.95);
      expect(entity.metadata.validated).toBe(true);
    });

    test('ScamSignal type has required fields', () => {
      const signal: ScamSignal = {
        type: SignalType.URGENCY,
        confidence: 0.85,
        text: 'Act now or lose your account!',
        context: 'Full message context',
        timestamp: new Date(),
      };

      expect(signal.type).toBe(SignalType.URGENCY);
      expect(signal.confidence).toBe(0.85);
    });

    test('Conversation type has required fields', () => {
      const conversation: Conversation = {
        id: 'conv-123',
        state: ConversationState.INITIAL_CONTACT,
        persona: {
          id: 'persona-1',
          name: 'Test User',
          age: 65,
          background: 'Retired',
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
      };

      expect(conversation.id).toBe('conv-123');
      expect(conversation.state).toBe(ConversationState.INITIAL_CONTACT);
      expect(conversation.messages).toHaveLength(0);
    });
  });
});
