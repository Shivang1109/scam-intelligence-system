/**
 * Conversation API Routes
 * Implements REST endpoints for conversation management
 * 
 * Validates Requirements: 8.1, 8.4
 */

import { Router, Response } from 'express';
import { AgentController } from '../../agents/AgentController';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { APIError } from '../middleware/errorHandler';
import { ConversationRequest, ConversationResponse, ConversationStatus, TerminationResponse } from '../../types';

/**
 * Create conversation routes
 * @param agentController - The agent controller instance
 * @returns Express router with conversation endpoints
 */
export function createConversationRoutes(agentController: AgentController): Router {
  const router = Router();

  /**
   * POST /api/v1/conversations
   * Create a new conversation
   * 
   * Request body:
   * {
   *   "initialMessage": "string",
   *   "context": {} // optional
   * }
   * 
   * Response:
   * {
   *   "conversationId": "string",
   *   "status": "string",
   *   "message": "string"
   * }
   */
  router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request body
      const { initialMessage } = req.body as ConversationRequest;

      if (!initialMessage || typeof initialMessage !== 'string') {
        throw new APIError('initialMessage is required and must be a string', 400);
      }

      if (initialMessage.trim().length === 0) {
        throw new APIError('initialMessage cannot be empty', 400);
      }

      // Create conversation through agent controller
      const conversation = await agentController.createConversation(initialMessage);

      // Build response
      const response: ConversationResponse = {
        conversationId: conversation.id,
        status: 'created',
        message: 'Conversation created successfully',
      };

      // Return 201 Created with conversation ID
      res.status(201).json(response);
    } catch (error) {
      // Re-throw APIError to be handled by error middleware
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to create conversation', 500);
    }
  });

  /**
   * GET /api/v1/conversations/:id
   * Get conversation details
   * 
   * Response:
   * {
   *   "id": "string",
   *   "state": "string",
   *   "persona": {...},
   *   "messages": [...],
   *   "extractedEntities": [...],
   *   "scamSignals": [...],
   *   "classification": {...},
   *   "riskScore": number,
   *   "createdAt": "ISO date",
   *   "updatedAt": "ISO date",
   *   "metadata": {...}
   * }
   */
  router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversationId = String(req.params.id);

      if (!conversationId) {
        throw new APIError('Conversation ID is required', 400);
      }

      // Get conversation from agent controller
      const conversation = await agentController.getConversation(conversationId);

      // Return conversation details
      res.status(200).json(conversation);
    } catch (error) {
      // Handle not found errors
      if (error instanceof Error && error.message.includes('not found')) {
        throw new APIError(`Conversation not found: ${req.params.id}`, 404);
      }
      // Re-throw APIError
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to retrieve conversation', 500);
    }
  });

  /**
   * GET /api/v1/conversations/:id/status
   * Get conversation status (lightweight version without full details)
   * 
   * Response:
   * {
   *   "conversationId": "string",
   *   "state": "string",
   *   "messageCount": number,
   *   "riskScore": number,
   *   "classification": {...},
   *   "createdAt": "ISO date",
   *   "updatedAt": "ISO date"
   * }
   */
  router.get('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversationId = String(req.params.id);

      if (!conversationId) {
        throw new APIError('Conversation ID is required', 400);
      }

      // Get conversation from agent controller
      const conversation = await agentController.getConversation(conversationId);

      // Build status response (lightweight)
      const status: ConversationStatus = {
        conversationId: conversation.id,
        state: conversation.state,
        messageCount: conversation.messages.length,
        riskScore: conversation.riskScore,
        classification: conversation.classification,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };

      // Return status
      res.status(200).json(status);
    } catch (error) {
      // Handle not found errors
      if (error instanceof Error && error.message.includes('not found')) {
        throw new APIError(`Conversation not found: ${req.params.id}`, 404);
      }
      // Re-throw APIError
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to retrieve conversation status', 500);
    }
  });

  /**
   * POST /api/v1/conversations/:id/messages
   * Send a message to an existing conversation
   * 
   * Request body:
   * {
   *   "message": "string"
   * }
   * 
   * Response:
   * {
   *   "content": "string",
   *   "delay": number,
   *   "metadata": {...}
   * }
   */
  router.post('/:id/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversationId = String(req.params.id);
      const { message } = req.body;

      if (!conversationId) {
        throw new APIError('Conversation ID is required', 400);
      }

      if (!message || typeof message !== 'string') {
        throw new APIError('message is required and must be a string', 400);
      }

      if (message.trim().length === 0) {
        throw new APIError('message cannot be empty', 400);
      }

      // Process message through agent controller
      const response = await agentController.processMessage(conversationId, message);

      // Return agent response
      res.status(200).json(response);
    } catch (error) {
      // Handle not found errors
      if (error instanceof Error && error.message.includes('not found')) {
        throw new APIError(`Conversation not found: ${req.params.id}`, 404);
      }
      // Handle terminated conversation errors
      if (error instanceof Error && error.message.includes('already terminated')) {
        throw new APIError(`Conversation already terminated: ${req.params.id}`, 400);
      }
      // Re-throw APIError
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to process message', 500);
    }
  });

  /**
   * DELETE /api/v1/conversations/:id
   * Terminate a conversation
   * 
   * Response:
   * {
   *   "conversationId": "string",
   *   "status": "string",
   *   "message": "string"
   * }
   */
  router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversationId = String(req.params.id);

      if (!conversationId) {
        throw new APIError('Conversation ID is required', 400);
      }

      // Terminate conversation through agent controller
      await agentController.terminateConversation(conversationId);

      // Build response
      const response: TerminationResponse = {
        conversationId,
        status: 'terminated',
        message: 'Conversation terminated successfully',
      };

      // Return success response
      res.status(200).json(response);
    } catch (error) {
      // Handle not found errors
      if (error instanceof Error && error.message.includes('not found')) {
        throw new APIError(`Conversation not found: ${req.params.id}`, 404);
      }
      // Re-throw APIError
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to terminate conversation', 500);
    }
  });

  return router;
}
