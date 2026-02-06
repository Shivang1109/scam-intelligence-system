/**
 * Scam Classifier and Risk Scorer Interfaces
 */

import { Conversation, ScamClassification, RiskScore, ScoreBreakdown } from '../types';

export interface ScamClassifier {
  classify(conversation: Conversation): ScamClassification;
  updateClassification(conversationId: string, newData: string): Promise<ScamClassification>;
}

export interface RiskScorer {
  calculateScore(conversation: Conversation): RiskScore;
  updateScore(conversationId: string): Promise<RiskScore>;
  getScoreBreakdown(conversationId: string): Promise<ScoreBreakdown>;
}
