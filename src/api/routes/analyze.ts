/**
 * Instant Analysis API Routes
 * Provides instant scam analysis for any message
 */

import { Router, Request, Response } from 'express';
import { HybridAnalyzer } from '../../ai/HybridAnalyzer';
import { authenticate } from '../middleware/auth';
import { APIError } from '../middleware/errorHandler';

export function createAnalyzeRoutes(hybridAnalyzer?: HybridAnalyzer): Router {
  const router = Router();

  /**
   * POST /api/v1/analyze
   * Instant scam analysis for any message
   * Perfect for live demos and quick testing
   */
  router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        throw new APIError('Message is required and must be a string', 400);
      }

      if (message.length === 0) {
        throw new APIError('Message cannot be empty', 400);
      }

      if (message.length > 10000) {
        throw new APIError('Message too long (max 10000 characters)', 400);
      }

      // Use HybridAnalyzer if available, otherwise return error
      if (!hybridAnalyzer) {
        throw new APIError('Analysis service not available', 503);
      }

      // Perform instant analysis
      const analysis = await hybridAnalyzer.analyze(message);

      // Format response
      const response = {
        message,
        analysis: {
          isScam: analysis.riskScore > 50,
          riskScore: analysis.riskScore,
          confidence: analysis.classification.primaryConfidence,
          scamType: analysis.classification.primaryType,
          aiEnhanced: analysis.aiEnhanced,
          aiReasoning: analysis.aiReasoning,
        },
        entities: analysis.entities.map(e => ({
          type: e.type,
          value: e.value,
          confidence: e.confidence,
          source: e.metadata?.source || 'unknown',
        })),
        signals: analysis.signals.map(s => ({
          type: s.type,
          confidence: s.confidence,
          evidence: s.text,
        })),
        classification: {
          primaryType: analysis.classification.primaryType,
          primaryConfidence: analysis.classification.primaryConfidence,
          secondaryTypes: analysis.classification.secondaryTypes,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Analysis error:', error);
      throw new APIError('Analysis failed', 500);
    }
  });

  /**
   * POST /api/v1/analyze/batch
   * Analyze multiple messages at once
   */
  router.post('/batch', authenticate, async (req: Request, res: Response) => {
    try {
      const { messages } = req.body;

      if (!Array.isArray(messages)) {
        throw new APIError('Messages must be an array', 400);
      }

      if (messages.length === 0) {
        throw new APIError('Messages array cannot be empty', 400);
      }

      if (messages.length > 10) {
        throw new APIError('Maximum 10 messages per batch', 400);
      }

      if (!hybridAnalyzer) {
        throw new APIError('Analysis service not available', 503);
      }

      // Analyze all messages
      const results = await Promise.all(
        messages.map(async (message: string) => {
          if (typeof message !== 'string') {
            return {
              message,
              error: 'Invalid message format',
            };
          }

          try {
            const analysis = await hybridAnalyzer.analyze(message);
            return {
              message,
              analysis: {
                isScam: analysis.riskScore > 50,
                riskScore: analysis.riskScore,
                confidence: analysis.classification.primaryConfidence,
                scamType: analysis.classification.primaryType,
                aiEnhanced: analysis.aiEnhanced,
              },
              entities: analysis.entities.length,
              signals: analysis.signals.length,
            };
          } catch (error) {
            return {
              message,
              error: 'Analysis failed',
            };
          }
        })
      );

      res.json({
        results,
        total: messages.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Batch analysis error:', error);
      throw new APIError('Batch analysis failed', 500);
    }
  });

  return router;
}
