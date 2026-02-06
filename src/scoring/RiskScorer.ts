/**
 * Risk Scorer Implementation
 * Calculates risk scores (0-100) based on conversation analysis
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { Conversation, RiskScore, ScoreBreakdown, ScamType, SignalType, EntityType } from '../types';
import { RiskScorer as IRiskScorer } from './interfaces';

/**
 * Weights for different risk factors
 * These determine how much each factor contributes to the overall risk score
 */
interface RiskWeights {
  sophistication: number;
  financialImpact: number;
  entityVolume: number;
  socialEngineering: number;
  impersonation: number;
}

export class RiskScorer implements IRiskScorer {
  // Default weights for risk factors (must sum to 1.0)
  private readonly weights: RiskWeights = {
    sophistication: 0.20,      // 20% - Technical sophistication of the scam
    financialImpact: 0.30,     // 30% - Potential financial damage
    entityVolume: 0.15,        // 15% - Number and variety of entities extracted
    socialEngineering: 0.20,   // 20% - Aggression of social engineering tactics
    impersonation: 0.15,       // 15% - Severity of impersonation attempts
  };

  /**
   * Calculate risk score for a conversation
   * Analyzes multiple factors and normalizes to 0-100 range
   * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  calculateScore(conversation: Conversation): RiskScore {
    // Calculate individual factor scores (0-100 range)
    const sophisticationScore = this.calculateSophisticationScore(conversation);
    const financialScore = this.calculateFinancialImpactScore(conversation);
    const entityScore = this.calculateEntityVolumeScore(conversation);
    const socialEngineeringScore = this.calculateSocialEngineeringScore(conversation);
    const impersonationScore = this.calculateImpersonationScore(conversation);

    // Calculate weighted overall score
    const overallScore = 
      sophisticationScore * this.weights.sophistication +
      financialScore * this.weights.financialImpact +
      entityScore * this.weights.entityVolume +
      socialEngineeringScore * this.weights.socialEngineering +
      impersonationScore * this.weights.impersonation;

    // Apply minimum threshold for high-value financial transactions (Requirement 6.3)
    const finalScore = this.applyFinancialThreshold(overallScore, conversation);

    // Ensure score is within bounds [0, 100]
    const boundedScore = Math.max(0, Math.min(100, finalScore));

    const breakdown: ScoreBreakdown = {
      signalScore: socialEngineeringScore,
      entityScore: entityScore,
      classificationScore: sophisticationScore,
      urgencyScore: this.calculateUrgencyScore(conversation),
      financialScore: financialScore,
    };

    return {
      score: Math.round(boundedScore * 100) / 100, // Round to 2 decimal places
      breakdown,
      calculatedAt: new Date(),
    };
  }

  /**
   * Update score for a conversation (requires storage integration)
   * Validates Requirements: 6.5
   */
  async updateScore(conversationId: string): Promise<RiskScore> {
    // In a real implementation, this would:
    // 1. Fetch the conversation from storage
    // 2. Recalculate the risk score
    // 3. Update the stored score
    // 4. Return the new score
    
    throw new Error(
      `updateScore requires storage integration. ` +
      `ConversationId: ${conversationId}`
    );
  }

  /**
   * Get detailed score breakdown for a conversation (requires storage integration)
   * Validates Requirements: 6.6
   */
  async getScoreBreakdown(conversationId: string): Promise<ScoreBreakdown> {
    // In a real implementation, this would:
    // 1. Fetch the conversation from storage
    // 2. Calculate the risk score
    // 3. Return the breakdown
    
    throw new Error(
      `getScoreBreakdown requires storage integration. ` +
      `ConversationId: ${conversationId}`
    );
  }

  /**
   * Calculate sophistication level score (0-100)
   * Based on scam classification and complexity indicators
   * Validates Requirements: 6.2
   */
  private calculateSophisticationScore(conversation: Conversation): number {
    if (!conversation.classification) {
      return 0;
    }

    // Base score from scam type sophistication
    const scamTypeSophistication: Record<ScamType, number> = {
      [ScamType.PHISHING]: 70,           // High sophistication
      [ScamType.TECH_SUPPORT]: 65,       // Medium-high sophistication
      [ScamType.INVESTMENT]: 75,         // High sophistication
      [ScamType.IMPERSONATION]: 80,      // Very high sophistication
      [ScamType.ROMANCE]: 60,            // Medium sophistication
      [ScamType.ADVANCE_FEE]: 55,        // Medium sophistication
      [ScamType.LOTTERY]: 50,            // Lower sophistication
    };

    const baseScore = scamTypeSophistication[conversation.classification.primaryType] || 50;
    
    // Adjust based on classification confidence
    const confidenceMultiplier = conversation.classification.primaryConfidence;
    
    // Bonus for multi-label classification (indicates complex scam)
    const multiLabelBonus = conversation.classification.secondaryTypes.length > 0 ? 10 : 0;

    // Bonus for diverse entity types (indicates sophisticated operation)
    const uniqueEntityTypes = new Set(conversation.extractedEntities.map(e => e.type));
    const entityDiversityBonus = Math.min(uniqueEntityTypes.size * 3, 15);

    const score = (baseScore * confidenceMultiplier) + multiLabelBonus + entityDiversityBonus;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate financial impact score (0-100)
   * Based on financial requests and amounts mentioned
   * Validates Requirements: 6.2, 6.3
   */
  private calculateFinancialImpactScore(conversation: Conversation): number {
    // Analyze message content for dollar amounts first
    const allText = conversation.messages.map(m => m.content).join(' ');
    const amounts = this.extractFinancialAmounts(allText);

    // Check for financial request signals
    const financialSignals = conversation.scamSignals.filter(
      s => s.type === SignalType.FINANCIAL_REQUEST
    );

    // If no financial signals and no amounts, return 0
    if (financialSignals.length === 0 && amounts.length === 0) {
      return 0;
    }

    let score = 0;

    // Base score from presence of financial requests
    if (financialSignals.length > 0) {
      score += 40;
    }

    // Score based on amounts (even without explicit financial request signal)
    if (amounts.length > 0) {
      const maxAmount = Math.max(...amounts);
      
      // Score based on amount ranges
      if (maxAmount >= 10000) {
        score += 60; // Very high impact
      } else if (maxAmount >= 5000) {
        score += 50; // High impact
      } else if (maxAmount >= 1000) {
        score += 40; // Medium-high impact
      } else if (maxAmount >= 500) {
        score += 30; // Medium impact
      } else if (maxAmount >= 100) {
        score += 20; // Low-medium impact
      } else {
        score += 10; // Low impact
      }
    }

    // Bonus for payment entities (indicates concrete payment infrastructure)
    const paymentEntities = conversation.extractedEntities.filter(
      e => e.type === EntityType.PAYMENT_ID || e.type === EntityType.BANK_ACCOUNT
    );
    score += Math.min(paymentEntities.length * 5, 20);

    return Math.min(score, 100);
  }

  /**
   * Calculate entity volume score (0-100)
   * Based on number and variety of extracted entities
   * Validates Requirements: 6.2
   */
  private calculateEntityVolumeScore(conversation: Conversation): number {
    const entities = conversation.extractedEntities;

    if (entities.length === 0) {
      return 0;
    }

    // Score based on total entity count
    const countScore = Math.min(entities.length * 8, 50);

    // Score based on entity type diversity
    const uniqueTypes = new Set(entities.map(e => e.type));
    const diversityScore = Math.min(uniqueTypes.size * 10, 30);

    // Score based on average confidence
    const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    const confidenceScore = avgConfidence * 20;

    const totalScore = countScore + diversityScore + confidenceScore;

    return Math.min(totalScore, 100);
  }

  /**
   * Calculate social engineering aggression score (0-100)
   * Based on scam signals and their intensity
   * Validates Requirements: 6.2, 6.4
   */
  private calculateSocialEngineeringScore(conversation: Conversation): number {
    const signals = conversation.scamSignals;

    if (signals.length === 0) {
      return 0;
    }

    // Weight different signal types by severity
    const signalWeights: Record<SignalType, number> = {
      [SignalType.THREAT]: 25,              // Highest severity
      [SignalType.URGENCY]: 20,             // High severity
      [SignalType.FINANCIAL_REQUEST]: 20,   // High severity
      [SignalType.IMPERSONATION]: 20,       // High severity
      [SignalType.AUTHORITY_CLAIM]: 15,     // Medium severity
    };

    // Calculate weighted score based on signals
    let weightedScore = 0;
    for (const signal of signals) {
      const weight = signalWeights[signal.type] || 10;
      weightedScore += weight * signal.confidence;
    }

    // Normalize by number of signals (more signals = higher aggression)
    const signalCountBonus = Math.min(signals.length * 5, 30);

    const totalScore = weightedScore + signalCountBonus;

    return Math.min(totalScore, 100);
  }

  /**
   * Calculate impersonation severity score (0-100)
   * Based on impersonation and authority claim signals
   * Validates Requirements: 6.2
   */
  private calculateImpersonationScore(conversation: Conversation): number {
    const impersonationSignals = conversation.scamSignals.filter(
      s => s.type === SignalType.IMPERSONATION || s.type === SignalType.AUTHORITY_CLAIM
    );

    if (impersonationSignals.length === 0) {
      return 0;
    }

    // Base score from presence of impersonation
    let score = 30;

    // Add score based on confidence of impersonation signals
    const avgConfidence = impersonationSignals.reduce((sum, s) => sum + s.confidence, 0) / 
                         impersonationSignals.length;
    score += avgConfidence * 40;

    // Bonus for organization entities (indicates specific impersonation target)
    const orgEntities = conversation.extractedEntities.filter(
      e => e.type === EntityType.ORGANIZATION
    );
    score += Math.min(orgEntities.length * 10, 30);

    // Bonus if classified as impersonation scam
    if (conversation.classification?.primaryType === ScamType.IMPERSONATION) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate urgency score (0-100)
   * Based on urgency signals
   * Validates Requirements: 6.2
   */
  private calculateUrgencyScore(conversation: Conversation): number {
    const urgencySignals = conversation.scamSignals.filter(
      s => s.type === SignalType.URGENCY
    );

    if (urgencySignals.length === 0) {
      return 0;
    }

    // Score based on number of urgency signals
    const countScore = Math.min(urgencySignals.length * 20, 60);

    // Score based on average confidence
    const avgConfidence = urgencySignals.reduce((sum, s) => sum + s.confidence, 0) / 
                         urgencySignals.length;
    const confidenceScore = avgConfidence * 40;

    return Math.min(countScore + confidenceScore, 100);
  }

  /**
   * Apply minimum threshold for high-value financial transactions
   * Validates Requirements: 6.3
   */
  private applyFinancialThreshold(score: number, conversation: Conversation): number {
    const allText = conversation.messages.map(m => m.content).join(' ');
    const amounts = this.extractFinancialAmounts(allText);

    // If any amount is above $1000, ensure minimum score of 70
    if (amounts.some(amount => amount > 1000)) {
      return Math.max(score, 70);
    }

    return score;
  }

  /**
   * Extract financial amounts from text
   * Returns array of amounts in USD
   */
  private extractFinancialAmounts(text: string): number[] {
    const amounts: number[] = [];

    // Pattern for dollar amounts: $1,000 or $1000 or 1000 dollars
    const patterns = [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,                     // $1,000 or $1000.00
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd)/gi,      // 1000 dollars
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:pounds?|gbp)/gi,       // 1000 pounds (convert to USD)
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:euros?|eur)/gi,        // 1000 euros (convert to USD)
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount)) {
          // Simple currency conversion (approximate)
          if (pattern.source.includes('pounds') || pattern.source.includes('gbp')) {
            amounts.push(amount * 1.27); // GBP to USD
          } else if (pattern.source.includes('euros') || pattern.source.includes('eur')) {
            amounts.push(amount * 1.08); // EUR to USD
          } else {
            amounts.push(amount);
          }
        }
      }
    }

    return amounts;
  }
}
