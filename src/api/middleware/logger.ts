/**
 * Request Logging Middleware
 * Logs all incoming API requests with details
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Request logger middleware
 * Logs request details for monitoring and debugging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Log API request with structured logger
    logger.apiRequest(req.method, req.path, res.statusCode, duration);

    return originalSend.call(this, data);
  };

  next();
}
