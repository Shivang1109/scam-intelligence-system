/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Custom API Error class
 */
export class APIError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Catches all errors and formats them consistently
 */
export function errorHandler(
  err: Error | APIError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Check if it's our custom APIError
  if (err instanceof APIError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    isOperational = true;
  } else if (err.message) {
    message = err.message;
  }

  // Log error details
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    message,
    stack: err.stack,
    isOperational,
  });

  // Send error response
  const errorResponse: any = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
