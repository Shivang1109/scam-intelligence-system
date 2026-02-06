/**
 * Scam Classifier Implementation
 * Classifies scam types based on conversation content
 * 
 * Validates Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { Conversation, ScamClassification, ScamType, SignalType, EntityType } from '../types';
import { ScamClassifier as IScamClassifier } from './interfaces';

/**
 * Pattern-based scam type indicators
 * Each scam type has characteristic patterns in signals, entities, and keywords
 */
interface ScamTypeIndicators {
  signals: SignalType[];
  entities: EntityType[];
  keywords: RegExp[];
  weight: number;
}

export class ScamClassifier implements IScamClassifier {
  // Scam type indicators for classification
  private readonly scamIndicators: Record<ScamType, ScamTypeIndicators> = {
    [ScamType.PHISHING]: {
      signals: [SignalType.URGENCY, SignalType.IMPERSONATION, SignalType.THREAT],
      entities: [EntityType.URL, EntityType.EMAIL, EntityType.ORGANIZATION],
      keywords: [
        /\b(verify|confirm|update|suspend|account|password|login|credentials|click|link)\b/gi,
        /\b(security (alert|warning|notice)|unauthorized (access|activity))\b/gi,
        /\b(reset (your )?password|update (your )?(account|information))\b/gi,
      ],
      weight: 1.0,
    },
    [ScamType.TECH_SUPPORT]: {
      signals: [SignalType.URGENCY, SignalType.IMPERSONATION, SignalType.THREAT, SignalType.FINANCIAL_REQUEST],
      entities: [EntityType.PHONE_NUMBER, EntityType.PAYMENT_ID, EntityType.ORGANIZATION],
      keywords: [
        /\b(microsoft|apple|windows|computer|virus|malware|infected|tech support|technical support)\b/gi,
        /\b(remote access|teamviewer|anydesk|error|warning|pop-?up)\b/gi,
        /\b(refund|subscription|renewal|antivirus|security software)\b/gi,
      ],
      weight: 1.0,
    },
    [ScamType.ROMANCE]: {
      signals: [SignalType.URGENCY, SignalType.FINANCIAL_REQUEST],
      entities: [EntityType.PAYMENT_ID, EntityType.BANK_ACCOUNT, EntityType.PHONE_NUMBER],
      keywords: [
        /\b(love|darling|honey|sweetheart|baby|dear|relationship|feelings)\b/gi,
        /\b(meet|visit|come see|emergency|hospital|accident|stranded)\b/gi,
        /\b(help me|need (your )?help|desperate|trouble|crisis)\b/gi,
      ],
      weight: 1.0,
    },
    [ScamType.INVESTMENT]: {
      signals: [SignalType.URGENCY, SignalType.FINANCIAL_REQUEST],
      entities: [EntityType.PAYMENT_ID, EntityType.BANK_ACCOUNT, EntityType.URL],
      keywords: [
        /\b(invest(ment)?|profit|return|roi|guaranteed|crypto|bitcoin|trading|forex)\b/gi,
        /\b(opportunity|wealth|rich|millionaire|passive income|financial freedom)\b/gi,
        /\b(stock|shares|portfolio|fund|asset|dividend)\b/gi,
        /\b(double (your )?money|high return|low risk|no risk)\b/gi,
      ],
      weight: 1.0,
    },
    [ScamType.IMPERSONATION]: {
      signals: [SignalType.IMPERSONATION, SignalType.URGENCY, SignalType.THREAT, SignalType.AUTHORITY_CLAIM],
      entities: [EntityType.ORGANIZATION, EntityType.PHONE_NUMBER, EntityType.EMAIL],
      keywords: [
        /\b(irs|fbi|social security|government|police|officer|agent|official)\b/gi,
        /\b(bank|credit card|account|fraud department|security team)\b/gi,
        /\b(warrant|arrest|legal action|court|lawsuit|investigation)\b/gi,
      ],
      weight: 1.0,
    },
    [ScamType.ADVANCE_FEE]: {
      signals: [SignalType.URGENCY, SignalType.FINANCIAL_REQUEST],
      entities: [EntityType.PAYMENT_ID, EntityType.BANK_ACCOUNT, EntityType.PHONE_NUMBER],
      keywords: [
        /\b(fee|tax|charge|processing|handling|transfer|customs|clearance)\b/gi,
        /\b(upfront|advance|deposit|payment required|pay first)\b/gi,
        /\b(prize|lottery|inheritance|award|grant|compensation)\b/gi,
        /\b(claim|release|process|unlock|receive)\b/gi,
      ],
      weight: 1.0,
    },
    [ScamType.LOTTERY]: {
      signals: [SignalType.URGENCY, SignalType.FINANCIAL_REQUEST],
      entities: [EntityType.PAYMENT_ID, EntityType.BANK_ACCOUNT, EntityType.PHONE_NUMBER],
      keywords: [
        /\b(won|winner|congratulations|selected|chosen|lucky)\b/gi,
        /\b(lottery|prize|sweepstakes|jackpot|drawing|raffle)\b/gi,
        /\b(claim (your )?prize|collect (your )?winnings)\b/gi,
        /\b(\$?\d+[\d,]* (dollars?|usd|pounds?|euros?))\b/gi,
      ],
      weight: 1.0,
    },
  };

  /**
   * Classify a conversation into scam types
   * Analyzes signals, entities, and message content to determine scam type
   * Validates Requirements: 5.1, 5.2, 5.3
   */
  classify(conversation: Conversation): ScamClassification {
    const scores: Record<ScamType, number> = {
      [ScamType.PHISHING]: 0,
      [ScamType.TECH_SUPPORT]: 0,
      [ScamType.ROMANCE]: 0,
      [ScamType.INVESTMENT]: 0,
      [ScamType.IMPERSONATION]: 0,
      [ScamType.ADVANCE_FEE]: 0,
      [ScamType.LOTTERY]: 0,
    };

    // Combine all message content for analysis
    const allText = conversation.messages
      .map(m => m.content)
      .join(' ');

    // Score each scam type based on indicators
    for (const [scamType, indicators] of Object.entries(this.scamIndicators)) {
      let score = 0;

      // Score based on signals (40% weight)
      const signalScore = this.calculateSignalScore(
        conversation.scamSignals,
        indicators.signals
      );
      score += signalScore * 0.4;

      // Score based on entities (30% weight)
      const entityScore = this.calculateEntityScore(
        conversation.extractedEntities,
        indicators.entities
      );
      score += entityScore * 0.3;

      // Score based on keywords (30% weight)
      const keywordScore = this.calculateKeywordScore(
        allText,
        indicators.keywords
      );
      score += keywordScore * 0.3;

      scores[scamType as ScamType] = score;
    }

    // Find primary type (highest score)
    const sortedTypes = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);

    const primaryType = sortedTypes[0][0] as ScamType;
    const primaryConfidence = Math.min(sortedTypes[0][1], 1.0);

    // Find secondary types (score > 0.3 and not primary)
    const secondaryTypes = sortedTypes
      .slice(1)
      .filter(([, score]) => score > 0.3)
      .map(([type, score]) => ({
        type: type as ScamType,
        confidence: Math.min(score, 1.0),
      }));

    return {
      primaryType,
      primaryConfidence,
      secondaryTypes,
      updatedAt: new Date(),
    };
  }

  /**
   * Update classification with new conversation data
   * Re-classifies the conversation with updated information
   * Validates Requirements: 5.4
   * 
   * Note: This is a simplified implementation that re-classifies the entire conversation.
   * In a production system, this would fetch the conversation from storage.
   */
  async updateClassification(
    conversationId: string,
    newData: string
  ): Promise<ScamClassification> {
    // In a real implementation, this would:
    // 1. Fetch the conversation from storage
    // 2. Add the new data to the conversation
    // 3. Re-run classification
    // 4. Update the stored classification
    
    // For now, we throw an error indicating this needs storage integration
    throw new Error(
      `updateClassification requires storage integration. ` +
      `ConversationId: ${conversationId}, NewData: ${newData}`
    );
  }

  /**
   * Calculate score based on detected signals
   * Higher score if conversation has signals matching the scam type
   */
  private calculateSignalScore(
    detectedSignals: Conversation['scamSignals'],
    expectedSignals: SignalType[]
  ): number {
    if (expectedSignals.length === 0) {
      return 0;
    }

    // Count matching signals weighted by confidence
    let matchScore = 0;
    let totalWeight = 0;

    for (const signal of detectedSignals) {
      if (expectedSignals.includes(signal.type)) {
        matchScore += signal.confidence;
        totalWeight += 1;
      }
    }

    // Normalize by expected signals count
    if (totalWeight === 0) {
      return 0;
    }

    // Average confidence of matching signals
    const avgConfidence = matchScore / totalWeight;
    
    // Coverage: what percentage of expected signals were found
    const coverage = Math.min(totalWeight / expectedSignals.length, 1.0);

    // Combine confidence and coverage
    return avgConfidence * 0.7 + coverage * 0.3;
  }

  /**
   * Calculate score based on extracted entities
   * Higher score if conversation has entities matching the scam type
   */
  private calculateEntityScore(
    extractedEntities: Conversation['extractedEntities'],
    expectedEntities: EntityType[]
  ): number {
    if (expectedEntities.length === 0) {
      return 0;
    }

    // Count matching entities weighted by confidence
    let matchScore = 0;
    let totalWeight = 0;

    for (const entity of extractedEntities) {
      if (expectedEntities.includes(entity.type)) {
        matchScore += entity.confidence;
        totalWeight += 1;
      }
    }

    // Normalize by expected entities count
    if (totalWeight === 0) {
      return 0;
    }

    // Average confidence of matching entities
    const avgConfidence = matchScore / totalWeight;
    
    // Coverage: what percentage of expected entity types were found
    const uniqueTypes = new Set(
      extractedEntities
        .filter(e => expectedEntities.includes(e.type))
        .map(e => e.type)
    );
    const coverage = Math.min(uniqueTypes.size / expectedEntities.length, 1.0);

    // Combine confidence and coverage
    return avgConfidence * 0.7 + coverage * 0.3;
  }

  /**
   * Calculate score based on keyword matches
   * Higher score if conversation contains keywords associated with the scam type
   */
  private calculateKeywordScore(
    text: string,
    keywords: RegExp[]
  ): number {
    if (keywords.length === 0) {
      return 0;
    }

    let matchCount = 0;
    let totalMatches = 0;

    for (const keyword of keywords) {
      const matches = text.match(keyword);
      if (matches && matches.length > 0) {
        matchCount += 1;
        totalMatches += matches.length;
      }
    }

    if (matchCount === 0) {
      return 0;
    }

    // Coverage: what percentage of keyword patterns matched
    const coverage = matchCount / keywords.length;
    
    // Density: how many total matches (normalized by text length)
    const textWords = text.split(/\s+/).length;
    const density = Math.min(totalMatches / Math.max(textWords / 100, 1), 1.0);

    // Combine coverage and density
    return coverage * 0.7 + density * 0.3;
  }
}
