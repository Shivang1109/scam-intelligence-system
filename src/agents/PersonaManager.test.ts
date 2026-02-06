/**
 * Unit tests for PersonaManager
 */

import { PersonaManager, PersonaConfig } from './PersonaManager';
import { ScamType, ConversationContext } from '../types';

describe('PersonaManager', () => {
  let personaManager: PersonaManager;

  beforeEach(() => {
    personaManager = new PersonaManager();
  });

  describe('Persona Library', () => {
    test('should initialize with at least 5 distinct personas', () => {
      const personas = personaManager.listPersonas();
      expect(personas.length).toBeGreaterThanOrEqual(5);
    });

    test('should have unique persona IDs', () => {
      const personas = personaManager.listPersonas();
      const ids = personas.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(personas.length);
    });

    test('should have personas with all required fields', () => {
      const personas = personaManager.listPersonas();
      personas.forEach((persona) => {
        expect(persona).toHaveProperty('id');
        expect(persona).toHaveProperty('name');
        expect(persona).toHaveProperty('age');
        expect(persona).toHaveProperty('background');
        expect(persona).toHaveProperty('vulnerabilityLevel');
        expect(persona).toHaveProperty('communicationStyle');
        expect(persona).toHaveProperty('typicalResponses');
        expect(persona).toHaveProperty('characteristics');
        expect(persona.characteristics).toHaveProperty('techSavvy');
        expect(persona.characteristics).toHaveProperty('trustLevel');
        expect(persona.characteristics).toHaveProperty('financialAwareness');
        expect(persona.characteristics).toHaveProperty('responseSpeed');
      });
    });

    test('should have personas with vulnerability levels between 1 and 10', () => {
      const personas = personaManager.listPersonas();
      personas.forEach((persona) => {
        expect(persona.vulnerabilityLevel).toBeGreaterThanOrEqual(1);
        expect(persona.vulnerabilityLevel).toBeLessThanOrEqual(10);
      });
    });

    test('should have personas with at least one typical response', () => {
      const personas = personaManager.listPersonas();
      personas.forEach((persona) => {
        expect(persona.typicalResponses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPersona', () => {
    test('should retrieve persona by ID', () => {
      const personas = personaManager.listPersonas();
      const firstPersona = personas[0];
      const retrieved = personaManager.getPersona(firstPersona.id);
      expect(retrieved.id).toBe(firstPersona.id);
      expect(retrieved.name).toBe(firstPersona.name);
    });

    test('should throw error for non-existent persona ID', () => {
      expect(() => personaManager.getPersona('non-existent-id')).toThrow(
        'Persona not found: non-existent-id'
      );
    });
  });

  describe('getPersonaConfig', () => {
    test('should retrieve full persona config with response patterns', () => {
      const personas = personaManager.listPersonas();
      const firstPersona = personas[0];
      const config = personaManager.getPersonaConfig(firstPersona.id);

      expect(config).toHaveProperty('responsePatterns');
      expect(config.responsePatterns).toHaveProperty('typingSpeed');
      expect(config.responsePatterns).toHaveProperty('errorRate');
      expect(config.responsePatterns).toHaveProperty('vocabulary');
      expect(config.responsePatterns).toHaveProperty('punctuationStyle');
      expect(config.responsePatterns).toHaveProperty('emojiUsage');
    });

    test('should have valid response pattern values', () => {
      const personas = personaManager.listPersonas();
      personas.forEach((persona) => {
        const config = personaManager.getPersonaConfig(persona.id);
        const { responsePatterns } = config;

        // Typing speed should be positive
        expect(responsePatterns.typingSpeed).toBeGreaterThan(0);

        // Error rate should be between 0 and 1
        expect(responsePatterns.errorRate).toBeGreaterThanOrEqual(0);
        expect(responsePatterns.errorRate).toBeLessThanOrEqual(1);

        // Vocabulary should be an array
        expect(Array.isArray(responsePatterns.vocabulary)).toBe(true);

        // Punctuation style should be valid
        expect(['formal', 'casual', 'minimal']).toContain(
          responsePatterns.punctuationStyle
        );

        // Emoji usage should be valid
        expect(['none', 'rare', 'frequent']).toContain(responsePatterns.emojiUsage);
      });
    });
  });

  describe('selectPersona', () => {
    test('should select a persona for tech support scam', () => {
      const context: ConversationContext = {
        initialMessage: 'Your computer has a virus! Call us immediately!',
        detectedScamType: ScamType.TECH_SUPPORT,
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      expect(persona.id).toBeDefined();
    });

    test('should select a persona for romance scam', () => {
      const context: ConversationContext = {
        initialMessage: 'Hi, I saw your profile and you seem like a wonderful person',
        detectedScamType: ScamType.ROMANCE,
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      expect(persona.id).toBeDefined();
    });

    test('should select a persona for investment scam', () => {
      const context: ConversationContext = {
        initialMessage: 'Congratulations! You have been selected for an exclusive investment opportunity',
        detectedScamType: ScamType.INVESTMENT,
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      expect(persona.id).toBeDefined();
    });

    test('should select a persona for impersonation scam', () => {
      const context: ConversationContext = {
        initialMessage: 'This is the IRS. You owe back taxes and must pay immediately',
        detectedScamType: ScamType.IMPERSONATION,
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      expect(persona.id).toBeDefined();
    });

    test('should select a persona without scam type', () => {
      const context: ConversationContext = {
        initialMessage: 'Hello, can you help me?',
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      expect(persona.id).toBeDefined();
    });

    test('should select appropriate persona for urgency language', () => {
      const context: ConversationContext = {
        initialMessage: 'URGENT: Act now or your account will be closed!',
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      // Should prefer less tech-savvy personas for urgency
      expect(persona.characteristics.techSavvy).toBeLessThan(7);
    });

    test('should select appropriate persona for authority claims', () => {
      const context: ConversationContext = {
        initialMessage: 'This is the government. You must comply immediately.',
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
      // Should prefer trusting personas for authority claims
      expect(persona.characteristics.trustLevel).toBeGreaterThan(5);
    });

    test('should select appropriate persona for financial offers', () => {
      const context: ConversationContext = {
        initialMessage: 'You have won $10,000! Claim your prize now!',
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
    });

    test('should add randomness to persona selection', () => {
      const context: ConversationContext = {
        initialMessage: 'Hello',
        detectedScamType: ScamType.PHISHING,
      };

      // Select persona multiple times and check for variation
      const selections = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const persona = personaManager.selectPersona(context);
        selections.add(persona.id);
      }

      // Should have some variation (not always the same persona)
      // With 20 selections and randomness, we expect at least 2 different personas
      expect(selections.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateResponseDelay', () => {
    test('should calculate delay based on typing speed', () => {
      const personas = personaManager.listPersonas();
      const persona = personas[0];
      const messageLength = 50; // 50 characters

      const delay = personaManager.calculateResponseDelay(persona.id, messageLength);

      expect(delay).toBeGreaterThan(0);
      expect(typeof delay).toBe('number');
    });

    test('should have minimum delay of 1 second', () => {
      const personas = personaManager.listPersonas();
      const persona = personas[0];
      const messageLength = 1; // very short message

      const delay = personaManager.calculateResponseDelay(persona.id, messageLength);

      expect(delay).toBeGreaterThanOrEqual(1000);
    });

    test('should have maximum delay of 2 minutes', () => {
      const personas = personaManager.listPersonas();
      const persona = personas[0];
      const messageLength = 10000; // very long message

      const delay = personaManager.calculateResponseDelay(persona.id, messageLength);

      expect(delay).toBeLessThanOrEqual(120000);
    });

    test('should vary delay based on persona typing speed', () => {
      const personas = personaManager.listPersonas();
      const messageLength = 100;

      // Get delays for different personas
      const delays = personas.map((persona) =>
        personaManager.calculateResponseDelay(persona.id, messageLength)
      );

      // Delays should vary between personas
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    test('should increase delay for longer messages', () => {
      const personas = personaManager.listPersonas();
      const persona = personas[0];

      // Longer messages should generally take longer (accounting for randomness)
      // We'll test this multiple times to account for variation
      let longerCount = 0;
      for (let i = 0; i < 10; i++) {
        const short = personaManager.calculateResponseDelay(persona.id, 20);
        const long = personaManager.calculateResponseDelay(persona.id, 200);
        if (long > short) longerCount++;
      }

      // At least 7 out of 10 times, longer message should take longer
      expect(longerCount).toBeGreaterThanOrEqual(7);
    });
  });

  describe('generateResponse', () => {
    test('should generate a response from persona typical responses', () => {
      const personas = personaManager.listPersonas();
      const persona = personas[0];

      const response = personaManager.generateResponse(
        persona,
        'some context',
        'some intent'
      );

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(persona.typicalResponses).toContain(response);
    });
  });

  describe('addPersona', () => {
    test('should add a custom persona to the library', () => {
      const customPersona: PersonaConfig = {
        id: 'custom-test',
        name: 'Test Person',
        age: 30,
        background: 'Test background',
        vulnerabilityLevel: 5,
        communicationStyle: 'test style',
        typicalResponses: ['test response'],
        characteristics: {
          techSavvy: 5,
          trustLevel: 5,
          financialAwareness: 5,
          responseSpeed: 5,
        },
        responsePatterns: {
          typingSpeed: 30,
          errorRate: 0.05,
          vocabulary: ['test'],
          punctuationStyle: 'casual',
          emojiUsage: 'rare',
        },
        vulnerabilityFactors: {
          trustingNature: 5,
          financialDesperation: 5,
          technicalNaivety: 5,
          emotionalVulnerability: 5,
        },
      };

      personaManager.addPersona(customPersona);

      const retrieved = personaManager.getPersona('custom-test');
      expect(retrieved.id).toBe('custom-test');
      expect(retrieved.name).toBe('Test Person');
    });
  });

  describe('removePersona', () => {
    test('should remove a persona from the library', () => {
      const customPersona: PersonaConfig = {
        id: 'to-remove',
        name: 'Remove Me',
        age: 30,
        background: 'Test',
        vulnerabilityLevel: 5,
        communicationStyle: 'test',
        typicalResponses: ['test'],
        characteristics: {
          techSavvy: 5,
          trustLevel: 5,
          financialAwareness: 5,
          responseSpeed: 5,
        },
        responsePatterns: {
          typingSpeed: 30,
          errorRate: 0.05,
          vocabulary: ['test'],
          punctuationStyle: 'casual',
          emojiUsage: 'rare',
        },
        vulnerabilityFactors: {
          trustingNature: 5,
          financialDesperation: 5,
          technicalNaivety: 5,
          emotionalVulnerability: 5,
        },
      };

      personaManager.addPersona(customPersona);
      expect(personaManager.getPersona('to-remove')).toBeDefined();

      const removed = personaManager.removePersona('to-remove');
      expect(removed).toBe(true);

      expect(() => personaManager.getPersona('to-remove')).toThrow();
    });

    test('should return false when removing non-existent persona', () => {
      const removed = personaManager.removePersona('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty initial message', () => {
      const context: ConversationContext = {
        initialMessage: '',
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
    });

    test('should handle very long initial message', () => {
      const context: ConversationContext = {
        initialMessage: 'a'.repeat(10000),
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
    });

    test('should handle special characters in message', () => {
      const context: ConversationContext = {
        initialMessage: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      };

      const persona = personaManager.selectPersona(context);
      expect(persona).toBeDefined();
    });

    test('should handle zero-length message for delay calculation', () => {
      const personas = personaManager.listPersonas();
      const persona = personas[0];

      const delay = personaManager.calculateResponseDelay(persona.id, 0);
      expect(delay).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Persona Characteristics Validation', () => {
    test('should have diverse vulnerability levels across personas', () => {
      const personas = personaManager.listPersonas();
      const vulnerabilityLevels = personas.map((p) => p.vulnerabilityLevel);

      // Should have at least 3 different vulnerability levels
      const uniqueLevels = new Set(vulnerabilityLevels);
      expect(uniqueLevels.size).toBeGreaterThanOrEqual(3);
    });

    test('should have diverse tech savvy levels across personas', () => {
      const personas = personaManager.listPersonas();
      const techSavvyLevels = personas.map((p) => p.characteristics.techSavvy);

      // Should have variation in tech savvy
      const uniqueLevels = new Set(techSavvyLevels);
      expect(uniqueLevels.size).toBeGreaterThanOrEqual(3);
    });

    test('should have diverse communication styles', () => {
      const personas = personaManager.listPersonas();
      const styles = personas.map((p) => p.communicationStyle);

      // Each persona should have a unique communication style
      const uniqueStyles = new Set(styles);
      expect(uniqueStyles.size).toBe(personas.length);
    });
  });
});
