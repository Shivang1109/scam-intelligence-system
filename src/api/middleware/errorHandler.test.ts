/**
 * Error Handler Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, APIError, asyncHandler } from './errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Suppress console.error during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('APIError', () => {
    it('should create an APIError with default values', () => {
      const error = new APIError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create an APIError with custom status code', () => {
      const error = new APIError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create an APIError with custom operational flag', () => {
      const error = new APIError('Critical error', 500, false);

      expect(error.message).toBe('Critical error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('errorHandler', () => {
    it('should handle APIError with correct status code', () => {
      const error = new APIError('Test error', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          statusCode: 400,
        })
      );
    });

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Generic error',
          statusCode: 500,
        })
      );
    });

    it('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          statusCode: 400,
        })
      );
    });

    it('should handle UnauthorizedError with 401 status', () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          statusCode: 401,
        })
      );
    });

    it('should include timestamp in error response', () => {
      const error = new APIError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('should include request path in error response', () => {
      const error = new APIError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/test',
        })
      );
    });

    it('should log error details', () => {
      const error = new APIError('Test error', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          statusCode: 400,
          message: 'Test error',
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors in async functions', async () => {
      const error = new Error('Sync error in async');
      const asyncFn = jest.fn().mockImplementation(() => {
        return Promise.reject(error);
      });
      const handler = asyncHandler(asyncFn);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
