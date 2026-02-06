/**
 * Rate Limiting Middleware
 * Implements per-client rate limiting for API requests
 * 
 * Requirements:
 * - Maximum 100 requests per minute per API key (Requirement 8.7)
 * - Return HTTP 429 for rate limit violations
 * - Track request counts per API key
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { APIError } from './errorHandler';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
}

/**
 * Request tracking entry
 */
interface RequestTracker {
  count: number;
  windowStart: number;
}

/**
 * Rate limiter class
 * Tracks requests per client and enforces limits
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private requestTrackers: Map<string, RequestTracker>;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
    this.config = config;
    this.requestTrackers = new Map();
  }

  /**
   * Check if a client has exceeded the rate limit
   * @param clientId - Client identifier (API key or IP address)
   * @returns true if rate limit exceeded, false otherwise
   */
  public isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const tracker = this.requestTrackers.get(clientId);

    // No previous requests from this client
    if (!tracker) {
      this.requestTrackers.set(clientId, {
        count: 1,
        windowStart: now,
      });
      return false;
    }

    // Check if we're still in the same time window
    const windowElapsed = now - tracker.windowStart;
    
    if (windowElapsed >= this.config.windowMs) {
      // Window has expired, start a new window
      tracker.count = 1;
      tracker.windowStart = now;
      return false;
    }

    // Still in the same window, increment count
    tracker.count++;

    // Check if limit exceeded
    return tracker.count > this.config.maxRequests;
  }

  /**
   * Get current request count for a client
   * @param clientId - Client identifier
   * @returns Current request count and window info
   */
  public getRequestInfo(clientId: string): {
    count: number;
    limit: number;
    remaining: number;
    resetAt: number;
  } {
    const tracker = this.requestTrackers.get(clientId);
    
    if (!tracker) {
      return {
        count: 0,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: Date.now() + this.config.windowMs,
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - tracker.count);
    const resetAt = tracker.windowStart + this.config.windowMs;

    return {
      count: tracker.count,
      limit: this.config.maxRequests,
      remaining,
      resetAt,
    };
  }

  /**
   * Reset rate limit for a specific client
   * Useful for testing or manual intervention
   * @param clientId - Client identifier
   */
  public reset(clientId: string): void {
    this.requestTrackers.delete(clientId);
  }

  /**
   * Reset all rate limits
   * Useful for testing
   */
  public resetAll(): void {
    this.requestTrackers.clear();
  }

  /**
   * Clean up expired tracking entries
   * Should be called periodically to prevent memory leaks
   */
  public cleanup(): void {
    const now = Date.now();
    const expiredClients: string[] = [];

    this.requestTrackers.forEach((tracker, clientId) => {
      const windowElapsed = now - tracker.windowStart;
      if (windowElapsed >= this.config.windowMs) {
        expiredClients.push(clientId);
      }
    });

    expiredClients.forEach((clientId) => {
      this.requestTrackers.delete(clientId);
    });
  }

  /**
   * Get configuration
   */
  public getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Get number of tracked clients
   */
  public getTrackedClientCount(): number {
    return this.requestTrackers.size;
  }
}

/**
 * Global rate limiter instance
 * Default: 100 requests per minute
 */
const globalRateLimiter = new RateLimiter({
  windowMs: 60000,      // 60 seconds
  maxRequests: 100,     // 100 requests per minute
});

/**
 * Rate limiting middleware
 * Enforces rate limits per API key
 * 
 * Must be used after authentication middleware to access clientId
 */
export function rateLimit(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Get client identifier (API key or IP address as fallback)
  const clientId = req.clientId || req.apiKey || req.ip || 'anonymous';

  // Check rate limit
  if (globalRateLimiter.isRateLimited(clientId)) {
    const info = globalRateLimiter.getRequestInfo(clientId);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(info.resetAt).toISOString(),
      'Retry-After': Math.ceil((info.resetAt - Date.now()) / 1000).toString(),
    });

    throw new APIError(
      'Rate limit exceeded. Please try again later.',
      429
    );
  }

  // Get request info and set headers
  const info = globalRateLimiter.getRequestInfo(clientId);
  res.set({
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': new Date(info.resetAt).toISOString(),
  });

  next();
}

/**
 * Create a custom rate limiter middleware with specific configuration
 * @param config - Rate limit configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const clientId = req.clientId || req.apiKey || req.ip || 'anonymous';

    if (limiter.isRateLimited(clientId)) {
      const info = limiter.getRequestInfo(clientId);
      
      res.set({
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(info.resetAt).toISOString(),
        'Retry-After': Math.ceil((info.resetAt - Date.now()) / 1000).toString(),
      });

      throw new APIError(
        'Rate limit exceeded. Please try again later.',
        429
      );
    }

    const info = limiter.getRequestInfo(clientId);
    res.set({
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': new Date(info.resetAt).toISOString(),
    });

    next();
  };
}

/**
 * Get the global rate limiter instance
 * Useful for testing and monitoring
 */
export function getGlobalRateLimiter(): RateLimiter {
  return globalRateLimiter;
}

// Set up periodic cleanup (every 5 minutes)
setInterval(() => {
  globalRateLimiter.cleanup();
}, 5 * 60 * 1000);
