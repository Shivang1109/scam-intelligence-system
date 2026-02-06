/**
 * Persona Manager Implementation
 * Manages persona profiles and selection logic for scam engagement
 */

import { Persona, ConversationContext, ScamType } from '../types';
import { PersonaManager as IPersonaManager } from './interfaces';

/**
 * Extended persona configuration with response patterns
 */
export interface PersonaConfig extends Persona {
  responsePatterns: {
    typingSpeed: number; // words per minute
    errorRate: number; // 0-1, probability of typos
    vocabulary: string[]; // common words/phrases this persona uses
    punctuationStyle: 'formal' | 'casual' | 'minimal';
    emojiUsage: 'none' | 'rare' | 'frequent';
  };
  vulnerabilityFactors: {
    trustingNature: number; // 1-10
    financialDesperation: number; // 1-10
    technicalNaivety: number; // 1-10
    emotionalVulnerability: number; // 1-10
  };
}

/**
 * Persona Manager class
 * Maintains library of personas and handles selection logic
 */
export class PersonaManager implements IPersonaManager {
  private personas: Map<string, PersonaConfig>;

  constructor() {
    this.personas = new Map();
    this.initializeDefaultPersonas();
  }

  /**
   * Initialize the default persona library with at least 5 distinct profiles
   */
  private initializeDefaultPersonas(): void {
    const defaultPersonas: PersonaConfig[] = [
      {
        id: 'elderly-retiree',
        name: 'Margaret',
        age: 72,
        background: 'Retired teacher living on pension, widow, limited tech experience',
        vulnerabilityLevel: 8,
        communicationStyle: 'polite, formal, trusting, slow to respond',
        typicalResponses: [
          'Oh my, I\'m not sure I understand...',
          'That sounds very official. Should I be worried?',
          'My grandson usually helps me with these things.',
          'I don\'t want any trouble with the authorities.',
          'How do I do that? I\'m not very good with computers.',
        ],
        characteristics: {
          techSavvy: 2,
          trustLevel: 9,
          financialAwareness: 4,
          responseSpeed: 3,
        },
        responsePatterns: {
          typingSpeed: 15, // very slow typing
          errorRate: 0.08, // occasional typos
          vocabulary: [
            'dear',
            'please',
            'thank you',
            'I appreciate',
            'goodness',
            'oh my',
            'I see',
            'alright',
          ],
          punctuationStyle: 'formal',
          emojiUsage: 'none',
        },
        vulnerabilityFactors: {
          trustingNature: 9,
          financialDesperation: 5,
          technicalNaivety: 9,
          emotionalVulnerability: 7,
        },
      },
      {
        id: 'young-professional',
        name: 'Alex',
        age: 28,
        background: 'Marketing professional, tech-comfortable but busy, moderate savings',
        vulnerabilityLevel: 5,
        communicationStyle: 'casual, quick responses, somewhat skeptical but can be convinced',
        typicalResponses: [
          'Wait, what? Can you explain that again?',
          'Is this legit? Seems kinda sus',
          'How did you get my number?',
          'I\'m at work rn, can this wait?',
          'Ok but I need to verify this first',
        ],
        characteristics: {
          techSavvy: 7,
          trustLevel: 5,
          financialAwareness: 6,
          responseSpeed: 8,
        },
        responsePatterns: {
          typingSpeed: 45, // fast typing
          errorRate: 0.03, // few typos
          vocabulary: [
            'tbh',
            'rn',
            'kinda',
            'yeah',
            'nah',
            'ok',
            'sure',
            'wait',
            'lol',
            'idk',
          ],
          punctuationStyle: 'casual',
          emojiUsage: 'frequent',
        },
        vulnerabilityFactors: {
          trustingNature: 5,
          financialDesperation: 4,
          technicalNaivety: 3,
          emotionalVulnerability: 4,
        },
      },
      {
        id: 'struggling-parent',
        name: 'Sarah',
        age: 35,
        background: 'Single parent, working two jobs, financially stressed, desperate for opportunities',
        vulnerabilityLevel: 9,
        communicationStyle: 'anxious, hopeful, eager for financial relief, emotional',
        typicalResponses: [
          'Really? This could really help me right now',
          'I\'ve been so worried about money lately',
          'Is this for real? I can\'t afford to lose anything',
          'What do I need to do? I need this',
          'Please tell me this isn\'t a scam, I really need help',
        ],
        characteristics: {
          techSavvy: 5,
          trustLevel: 7,
          financialAwareness: 4,
          responseSpeed: 6,
        },
        responsePatterns: {
          typingSpeed: 35, // moderate typing
          errorRate: 0.05, // some typos due to stress
          vocabulary: [
            'please',
            'really',
            'need',
            'worried',
            'help',
            'kids',
            'bills',
            'struggling',
            'hope',
          ],
          punctuationStyle: 'casual',
          emojiUsage: 'rare',
        },
        vulnerabilityFactors: {
          trustingNature: 7,
          financialDesperation: 10,
          technicalNaivety: 6,
          emotionalVulnerability: 9,
        },
      },
      {
        id: 'immigrant-worker',
        name: 'Raj',
        age: 42,
        background: 'Recent immigrant, limited English, unfamiliar with local systems, works in service industry',
        vulnerabilityLevel: 8,
        communicationStyle: 'cautious, limited English, fearful of authorities, eager to comply',
        typicalResponses: [
          'I am sorry, my English not so good',
          'I do not want problem with government',
          'Please, I am legal here, I have papers',
          'What I must do? I will do',
          'I do not understand, but I will try',
        ],
        characteristics: {
          techSavvy: 4,
          trustLevel: 6,
          financialAwareness: 3,
          responseSpeed: 4,
        },
        responsePatterns: {
          typingSpeed: 20, // slower due to language barrier
          errorRate: 0.12, // more errors due to language
          vocabulary: [
            'please',
            'sorry',
            'I do not',
            'understand',
            'yes',
            'ok',
            'thank you',
            'help',
          ],
          punctuationStyle: 'minimal',
          emojiUsage: 'none',
        },
        vulnerabilityFactors: {
          trustingNature: 6,
          financialDesperation: 7,
          technicalNaivety: 8,
          emotionalVulnerability: 8,
        },
      },
      {
        id: 'college-student',
        name: 'Jake',
        age: 20,
        background: 'College student, tech-savvy but inexperienced with scams, limited funds, seeking opportunities',
        vulnerabilityLevel: 6,
        communicationStyle: 'casual, confident online, curious, can be impulsive',
        typicalResponses: [
          'Yo, is this for real?',
          'That sounds pretty cool actually',
          'How much can I make?',
          'My roommate got something like this before',
          'Bet, let\'s do it',
        ],
        characteristics: {
          techSavvy: 8,
          trustLevel: 6,
          financialAwareness: 4,
          responseSpeed: 9,
        },
        responsePatterns: {
          typingSpeed: 50, // very fast typing
          errorRate: 0.04, // occasional typos from speed
          vocabulary: [
            'yo',
            'dude',
            'bet',
            'cool',
            'nice',
            'bruh',
            'fr',
            'ngl',
            'lowkey',
            'facts',
          ],
          punctuationStyle: 'minimal',
          emojiUsage: 'frequent',
        },
        vulnerabilityFactors: {
          trustingNature: 6,
          financialDesperation: 6,
          technicalNaivety: 5,
          emotionalVulnerability: 5,
        },
      },
      {
        id: 'lonely-senior',
        name: 'Robert',
        age: 68,
        background: 'Widower, isolated, seeking companionship, comfortable financially but lonely',
        vulnerabilityLevel: 7,
        communicationStyle: 'friendly, eager to chat, shares personal details, trusting',
        typicalResponses: [
          'It\'s so nice to hear from someone',
          'I don\'t get many messages these days',
          'My wife passed away three years ago',
          'I\'d be happy to help if I can',
          'You seem like a very nice person',
        ],
        characteristics: {
          techSavvy: 3,
          trustLevel: 8,
          financialAwareness: 5,
          responseSpeed: 4,
        },
        responsePatterns: {
          typingSpeed: 18, // slow, deliberate typing
          errorRate: 0.06,
          vocabulary: [
            'nice',
            'wonderful',
            'appreciate',
            'thank you',
            'certainly',
            'of course',
            'happy to',
          ],
          punctuationStyle: 'formal',
          emojiUsage: 'rare',
        },
        vulnerabilityFactors: {
          trustingNature: 9,
          financialDesperation: 3,
          technicalNaivety: 8,
          emotionalVulnerability: 10,
        },
      },
    ];

    defaultPersonas.forEach((persona) => {
      this.personas.set(persona.id, persona);
    });
  }

  /**
   * Get a persona by ID
   */
  getPersona(personaId: string): Persona {
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }
    return persona;
  }

  /**
   * Get full persona configuration including response patterns
   */
  getPersonaConfig(personaId: string): PersonaConfig {
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }
    return persona;
  }

  /**
   * Select an appropriate persona based on scam context
   * Uses scam type and context to match persona vulnerability factors
   */
  selectPersona(context: ConversationContext): Persona {
    const { initialMessage, detectedScamType } = context;

    // Score each persona based on appropriateness for the scam type
    const scoredPersonas = Array.from(this.personas.values()).map((persona) => {
      let score = 0;

      // Base score on vulnerability level
      score += persona.vulnerabilityLevel * 10;

      // Adjust score based on scam type and persona characteristics
      if (detectedScamType) {
        score += this.calculateScamTypeMatch(detectedScamType, persona);
      }

      // Adjust based on message content
      score += this.calculateMessageMatch(initialMessage, persona);

      return { persona, score };
    });

    // Sort by score (highest first) and select the best match
    scoredPersonas.sort((a, b) => b.score - a.score);

    // Add some randomness to avoid always selecting the same persona
    // Select from top 3 matches with weighted probability
    const topMatches = scoredPersonas.slice(0, 3);
    const totalScore = topMatches.reduce((sum, item) => sum + item.score, 0);
    const random = Math.random() * totalScore;

    let cumulativeScore = 0;
    for (const match of topMatches) {
      cumulativeScore += match.score;
      if (random <= cumulativeScore) {
        return match.persona;
      }
    }

    // Fallback to best match
    return scoredPersonas[0].persona;
  }

  /**
   * Calculate how well a persona matches a scam type
   */
  private calculateScamTypeMatch(scamType: ScamType, persona: PersonaConfig): number {
    let score = 0;

    switch (scamType) {
      case ScamType.TECH_SUPPORT:
        // Tech support scams work best on technically naive personas
        score += persona.vulnerabilityFactors.technicalNaivety * 5;
        score += (10 - persona.characteristics.techSavvy) * 3;
        break;

      case ScamType.ROMANCE:
        // Romance scams target emotionally vulnerable and lonely personas
        score += persona.vulnerabilityFactors.emotionalVulnerability * 5;
        score += persona.vulnerabilityFactors.trustingNature * 3;
        break;

      case ScamType.INVESTMENT:
      case ScamType.LOTTERY:
      case ScamType.ADVANCE_FEE:
        // Financial scams target financially desperate personas
        score += persona.vulnerabilityFactors.financialDesperation * 5;
        score += (10 - persona.characteristics.financialAwareness) * 3;
        break;

      case ScamType.IMPERSONATION:
      case ScamType.PHISHING:
        // Impersonation works on trusting and authority-respecting personas
        score += persona.vulnerabilityFactors.trustingNature * 4;
        score += persona.vulnerabilityFactors.technicalNaivety * 3;
        break;

      default:
        // Default: prefer higher vulnerability
        score += persona.vulnerabilityLevel * 5;
    }

    return score;
  }

  /**
   * Calculate how well a persona matches the initial message content
   */
  private calculateMessageMatch(message: string, persona: PersonaConfig): number {
    let score = 0;
    const lowerMessage = message.toLowerCase();

    // Check for urgency indicators - less tech-savvy personas are more susceptible
    if (
      lowerMessage.includes('urgent') ||
      lowerMessage.includes('immediately') ||
      lowerMessage.includes('act now')
    ) {
      score += (10 - persona.characteristics.techSavvy) * 2;
    }

    // Check for authority claims - trusting personas are more susceptible
    if (
      lowerMessage.includes('government') ||
      lowerMessage.includes('police') ||
      lowerMessage.includes('bank') ||
      lowerMessage.includes('irs') ||
      lowerMessage.includes('tax')
    ) {
      score += persona.vulnerabilityFactors.trustingNature * 2;
    }

    // Check for financial offers - financially desperate personas are more susceptible
    if (
      lowerMessage.includes('money') ||
      lowerMessage.includes('prize') ||
      lowerMessage.includes('won') ||
      lowerMessage.includes('refund') ||
      lowerMessage.includes('payment')
    ) {
      score += persona.vulnerabilityFactors.financialDesperation * 2;
    }

    // Check for technical terms - technically naive personas are more susceptible
    if (
      lowerMessage.includes('virus') ||
      lowerMessage.includes('computer') ||
      lowerMessage.includes('account') ||
      lowerMessage.includes('password') ||
      lowerMessage.includes('security')
    ) {
      score += persona.vulnerabilityFactors.technicalNaivety * 2;
    }

    return score;
  }

  /**
   * List all available personas
   */
  listPersonas(): Persona[] {
    return Array.from(this.personas.values());
  }

  /**
   * Generate a response based on persona characteristics
   * This is a placeholder - actual response generation would integrate with LLM
   */
  generateResponse(persona: Persona, _context: string, _intent: string): string {
    // This would typically integrate with an LLM to generate persona-consistent responses
    // For now, return a typical response from the persona's library
    const responses = persona.typicalResponses;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Calculate response delay based on persona typing speed and message length
   * Returns delay in milliseconds
   */
  calculateResponseDelay(personaId: string, messageLength: number): number {
    const persona = this.getPersonaConfig(personaId);
    const { typingSpeed, errorRate } = persona.responsePatterns;

    // Calculate base typing time
    // typingSpeed is in words per minute, average word length is ~5 characters
    const wordsToType = messageLength / 5;
    const baseTimeMinutes = wordsToType / typingSpeed;
    const baseTimeMs = baseTimeMinutes * 60 * 1000;

    // Add thinking time (varies by persona response speed)
    const thinkingTimeMs = (10 - persona.characteristics.responseSpeed) * 1000;

    // Add error correction time (based on error rate)
    const errorCorrectionMs = messageLength * errorRate * 200; // 200ms per error

    // Add natural variation (±20%)
    const variation = 0.8 + Math.random() * 0.4;

    const totalDelay = (baseTimeMs + thinkingTimeMs + errorCorrectionMs) * variation;

    // Ensure minimum delay of 1 second and maximum of 2 minutes
    return Math.max(1000, Math.min(120000, totalDelay));
  }

  /**
   * Add a custom persona to the library
   */
  addPersona(persona: PersonaConfig): void {
    this.personas.set(persona.id, persona);
  }

  /**
   * Remove a persona from the library
   */
  removePersona(personaId: string): boolean {
    return this.personas.delete(personaId);
  }
}
