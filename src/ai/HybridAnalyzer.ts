/**
 * Hybrid Analyzer
 * Combines rule-based detection with AI-powered analysis
 */

import { OpenAIAnalyzer, AIAnalysisResult } from './OpenAIAnalyzer';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';
import { Entity, ScamSignal, ScamClassification, ConversationState } from '../types';

export interface HybridAnalysisResult {
  entities: Entity[];
  signals: ScamSignal[];
  classification: ScamClassification;
  riskScore: number;
  aiEnhanced: boolean;
  aiReasoning?: string;
}

export class HybridAnalyzer {
  private aiAnalyzer: OpenAIAnalyzer;
  private nlpExtractor: NLPExtractor;
  private signalDetector: ScamSignalDetector;
  private classifier: ScamClassifier;
  private riskScorer: RiskScorer;

  constructor(openAIKey?: string) {
    this.aiAnalyzer = new OpenAIAnalyzer(openAIKey);
    this.nlpExtractor = new NLPExtractor();
    this.signalDetector = new ScamSignalDetector();
    this.classifier = new ScamClassifier();
    this.riskScorer = new RiskScorer();
  }

  /**
   * Analyze message using both rule-based and AI methods
   */
  async analyze(message: string): Promise<HybridAnalysisResult> {
    // Always run rule-based analysis
    const ruleBasedResult = this.runRuleBasedAnalysis(message);

    // Try AI analysis if available
    if (this.aiAnalyzer.isEnabled()) {
      try {
        const aiResult = await this.aiAnalyzer.analyzeMessage(message);

        if (aiResult) {
          // Merge AI and rule-based results
          return this.mergeResults(ruleBasedResult, aiResult);
        }
      } catch (error) {
        console.error('AI analysis failed, using rule-based only:', error);
      }
    }

    // Return rule-based results if AI is not available or failed
    return {
      ...ruleBasedResult,
      aiEnhanced: false,
    };
  }

  /**
   * Run traditional rule-based analysis
   */
  private runRuleBasedAnalysis(message: string): Omit<HybridAnalysisResult, 'aiEnhanced'> {
    const entities = this.nlpExtractor.extractEntities(message);
    const signals = this.signalDetector.detectSignals(message);
    
    // Create a minimal conversation object for classification
    const tempConversation = {
      id: 'temp',
      state: ConversationState.IDLE,
      persona: {
        id: 'temp-persona',
        name: 'Temp',
        age: 0,
        background: '',
        vulnerabilityLevel: 5,
        communicationStyle: '',
        typicalResponses: [],
        characteristics: {
          techSavvy: 5,
          trustLevel: 5,
          financialAwareness: 5,
          responseSpeed: 5
        }
      },
      messages: [{
        id: 'temp-msg',
        content: message,
        sender: 'scammer' as const,
        timestamp: new Date()
      }],
      extractedEntities: entities,
      scamSignals: signals,
      classification: null,
      riskScore: 0,
      metadata: {
        initialMessage: message,
        messageCount: 1,
        duration: 0,
        stateHistory: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const classification = this.classifier.classify(tempConversation);
    const riskScoreResult = this.riskScorer.calculateScore(tempConversation);

    return {
      entities,
      signals,
      classification,
      riskScore: riskScoreResult.score,
    };
  }

  /**
   * Merge AI and rule-based results
   */
  private mergeResults(
    ruleBasedResult: Omit<HybridAnalysisResult, 'aiEnhanced'>,
    aiResult: AIAnalysisResult
  ): HybridAnalysisResult {
    // Merge entities (prefer AI entities, add rule-based ones not found by AI)
    const mergedEntities = this.mergeEntities(ruleBasedResult.entities, aiResult.extractedEntities);

    // Merge signals (combine both sources)
    const mergedSignals = this.mergeSignals(ruleBasedResult.signals, aiResult.signals);

    // Use AI classification if confidence is high, otherwise use rule-based
    const classification =
      aiResult.confidence > 0.7 && aiResult.scamType
        ? {
            primaryType: aiResult.scamType,
            primaryConfidence: aiResult.confidence,
            secondaryTypes: ruleBasedResult.classification.secondaryTypes,
            updatedAt: new Date(),
          }
        : ruleBasedResult.classification;

    // Weighted average of AI and rule-based risk scores
    const riskScore = aiResult.confidence > 0.7
      ? aiResult.riskScore * 0.7 + ruleBasedResult.riskScore * 0.3
      : ruleBasedResult.riskScore;

    return {
      entities: mergedEntities,
      signals: mergedSignals,
      classification,
      riskScore,
      aiEnhanced: true,
      aiReasoning: aiResult.reasoning,
    };
  }

  /**
   * Merge entities from both sources
   */
  private mergeEntities(
    ruleBasedEntities: Entity[],
    aiEntities: Array<{ type: any; value: string; confidence: number }>
  ): Entity[] {
    const merged: Entity[] = [];
    const seen = new Set<string>();

    // Add AI entities first (higher priority)
    for (const aiEntity of aiEntities) {
      const key = `${aiEntity.type}:${aiEntity.value}`;
      if (!seen.has(key)) {
        merged.push({
          type: aiEntity.type,
          value: aiEntity.value,
          confidence: aiEntity.confidence,
          context: '',
          timestamp: new Date(),
          metadata: {
            validated: false,
            source: 'ai',
          },
        });
        seen.add(key);
      }
    }

    // Add rule-based entities not found by AI
    for (const entity of ruleBasedEntities) {
      const key = `${entity.type}:${entity.value}`;
      if (!seen.has(key)) {
        merged.push({
          ...entity,
          metadata: {
            ...entity.metadata,
            source: 'rules',
          },
        });
        seen.add(key);
      }
    }

    return merged;
  }

  /**
   * Merge signals from both sources
   */
  private mergeSignals(
    ruleBasedSignals: ScamSignal[],
    aiSignals: Array<{ type: any; confidence: number; evidence: string }>
  ): ScamSignal[] {
    const signalMap = new Map<string, ScamSignal>();

    // Add rule-based signals
    for (const signal of ruleBasedSignals) {
      signalMap.set(signal.type, signal);
    }

    // Merge or add AI signals
    for (const aiSignal of aiSignals) {
      const existing = signalMap.get(aiSignal.type);
      if (existing) {
        // Average the confidence if both detected the same signal
        signalMap.set(aiSignal.type, {
          ...existing,
          confidence: (existing.confidence + aiSignal.confidence) / 2,
          text: `${existing.text}; ${aiSignal.evidence}`,
        });
      } else {
        signalMap.set(aiSignal.type, {
          type: aiSignal.type,
          confidence: aiSignal.confidence,
          text: aiSignal.evidence,
          context: '',
          timestamp: new Date(),
        });
      }
    }

    return Array.from(signalMap.values());
  }

  /**
   * Check if AI is enabled
   */
  isAIEnabled(): boolean {
    return this.aiAnalyzer.isEnabled();
  }

  /**
   * Generate AI-powered persona response
   */
  async generateResponse(
    persona: any,
    scammerMessage: string,
    conversationContext: string[],
    intent: string
  ): Promise<string | null> {
    if (!this.aiAnalyzer.isEnabled()) {
      return null;
    }

    try {
      return await this.aiAnalyzer.generatePersonaResponse(
        persona,
        scammerMessage,
        conversationContext,
        intent
      );
    } catch (error) {
      console.error('AI response generation failed:', error);
      return null;
    }
  }
}
