/**
 * Report API Routes
 * Implements REST endpoints for intelligence report retrieval
 * 
 * Validates Requirements: 8.2, 8.3, 8.7
 */

import { Router, Response } from 'express';
import { ReportRepository } from '../../persistence/interfaces';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { APIError } from '../middleware/errorHandler';

/**
 * Create report routes
 * @param reportRepository - The report repository instance
 * @returns Express router with report endpoints
 */
export function createReportRoutes(reportRepository: ReportRepository): Router {
  const router = Router();

  /**
   * GET /api/v1/reports/:id
   * Get report by conversation ID
   * 
   * Response:
   * {
   *   "conversationId": "string",
   *   "timestamp": "ISO date",
   *   "persona": {...},
   *   "scamClassification": {...},
   *   "riskScore": {...},
   *   "extractedEntities": [...],
   *   "scamSignals": [...],
   *   "conversationMetadata": {...},
   *   "transcript": [...]
   * }
   */
  router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportId = String(req.params.id);

      if (!reportId) {
        throw new APIError('Report ID is required', 400);
      }

      // Get report from repository
      const report = await reportRepository.findById(reportId);

      if (!report) {
        throw new APIError(`Report not found: ${reportId}`, 404);
      }

      // Return report
      res.status(200).json(report);
    } catch (error) {
      // Re-throw APIError
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to retrieve report', 500);
    }
  });

  /**
   * GET /api/v1/reports
   * Query reports with pagination
   * 
   * Query parameters:
   * - page: Page number (default: 1)
   * - pageSize: Items per page (default: 10, max: 100)
   * 
   * Response:
   * {
   *   "reports": [...],
   *   "pagination": {
   *     "page": number,
   *     "pageSize": number,
   *     "totalCount": number,
   *     "totalPages": number
   *   }
   * }
   */
  router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Parse pagination parameters
      const page = parseInt(String(req.query.page || '1'), 10);
      const pageSize = Math.min(
        parseInt(String(req.query.pageSize || '10'), 10),
        100 // Max page size
      );

      // Validate parameters
      if (isNaN(page) || page < 1) {
        throw new APIError('Invalid page number. Must be >= 1', 400);
      }

      if (isNaN(pageSize) || pageSize < 1) {
        throw new APIError('Invalid page size. Must be >= 1', 400);
      }

      // Get reports and total count
      const [reports, totalCount] = await Promise.all([
        reportRepository.findAll(page, pageSize),
        reportRepository.count(),
      ]);

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / pageSize);

      // Build response
      const response = {
        reports,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      // Re-throw APIError
      if (error instanceof APIError) {
        throw error;
      }
      // Wrap other errors
      throw new APIError('Failed to query reports', 500);
    }
  });

  return router;
}
