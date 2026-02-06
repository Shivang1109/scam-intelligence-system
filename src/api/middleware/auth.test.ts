/**
 * Authentication Middleware Tests
 * Tests for API key authentication and authorization
 */

import { Response, NextFunction } from 'express';
import {
  authenticate,
  authorize,
  optionalAuthenticate,
  addAPIKey,
  removeAPIKey,
  clearAPIKeys,
  getAllAPIKeys,
  AuthenticatedRequest,
} from './auth';
import { APIError } from './errorHandler';

describe('Authentication Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset API keys before each test
    clearAPIKeys();

    // Add test API keys
    addAPIKey('valid-key-123', 'client-1', 'Test Client 1', ['read', 'write']);
    addAPIKey('read-only-key', 'client-2', 'Test Client 2', ['read']);

    // Setup mock request, response, and next
    mockReq = {
      get: jest.fn(),
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid API key from X-API-Key header', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'valid-key-123';
        return undefined;
      });

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBe('valid-key-123');
      expect(mockReq.clientId).toBe('client-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate valid API key from Authorization Bearer header', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return 'Bearer valid-key-123';
        return undefined;
      });

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBe('valid-key-123');
      expect(mockReq.clientId).toBe('client-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prefer X-API-Key header over Authorization header', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'valid-key-123';
        if (header === 'Authorization') return 'Bearer read-only-key';
        return undefined;
      });

      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBe('valid-key-123');
      expect(mockReq.clientId).toBe('client-1');
    });

    it('should throw 401 error when no API key is provided', () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow('Authentication required');

      try {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as APIError).statusCode).toBe(401);
      }
    });

    it('should throw 401 error for invalid API key', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'invalid-key';
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow('Invalid API key');

      try {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as APIError).statusCode).toBe(401);
      }
    });

    it('should throw 401 error for empty API key', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return '';
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should handle malformed Authorization header', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return 'InvalidFormat valid-key-123';
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should update last used timestamp on successful authentication', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'valid-key-123';
        return undefined;
      });

      const beforeAuth = new Date();
      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      const afterAuth = new Date();

      const keys = getAllAPIKeys();
      const lastUsed = keys['valid-key-123'].lastUsed;

      expect(lastUsed).toBeDefined();
      expect(lastUsed!.getTime()).toBeGreaterThanOrEqual(beforeAuth.getTime());
      expect(lastUsed!.getTime()).toBeLessThanOrEqual(afterAuth.getTime());
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      // Pre-authenticate the request
      mockReq.apiKey = 'valid-key-123';
      mockReq.clientId = 'client-1';
    });

    it('should allow access when user has required permission', () => {
      const authorizeRead = authorize('read');
      authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when user has all required permissions', () => {
      const authorizeReadWrite = authorize('read', 'write');
      authorizeReadWrite(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', () => {
      mockReq.apiKey = 'read-only-key';
      mockReq.clientId = 'client-2';

      const authorizeWrite = authorize('write');

      expect(() => {
        authorizeWrite(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);

      try {
        authorizeWrite(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as APIError).statusCode).toBe(403);
        expect((error as APIError).message).toContain('Insufficient permissions');
      }
    });

    it('should deny access when user lacks some required permissions', () => {
      mockReq.apiKey = 'read-only-key';
      mockReq.clientId = 'client-2';

      const authorizeReadWrite = authorize('read', 'write');

      expect(() => {
        authorizeReadWrite(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should throw 401 when request is not authenticated', () => {
      mockReq.apiKey = undefined;
      mockReq.clientId = undefined;

      const authorizeRead = authorize('read');

      expect(() => {
        authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);

      try {
        authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as APIError).statusCode).toBe(401);
      }
    });

    it('should throw 401 when API key is invalid', () => {
      mockReq.apiKey = 'non-existent-key';

      const authorizeRead = authorize('read');

      expect(() => {
        authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);

      try {
        authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as APIError).statusCode).toBe(401);
      }
    });

    it('should include required permissions in error message', () => {
      mockReq.apiKey = 'read-only-key';
      mockReq.clientId = 'client-2';

      const authorizeAdmin = authorize('admin', 'delete');

      try {
        authorizeAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      } catch (error) {
        expect((error as APIError).message).toContain('admin');
        expect((error as APIError).message).toContain('delete');
      }
    });
  });

  describe('optionalAuthenticate middleware', () => {
    it('should authenticate valid API key when provided', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'valid-key-123';
        return undefined;
      });

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBe('valid-key-123');
      expect(mockReq.clientId).toBe('client-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no API key provided', () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBeUndefined();
      expect(mockReq.clientId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when invalid API key provided', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'invalid-key';
        return undefined;
      });

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBeUndefined();
      expect(mockReq.clientId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate from Authorization Bearer header', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return 'Bearer valid-key-123';
        return undefined;
      });

      optionalAuthenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBe('valid-key-123');
      expect(mockReq.clientId).toBe('client-1');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('API Key Management', () => {
    it('should add new API key', () => {
      addAPIKey('new-key', 'client-3', 'New Client', ['read']);

      const keys = getAllAPIKeys();
      expect(keys['new-key']).toBeDefined();
      expect(keys['new-key'].clientId).toBe('client-3');
      expect(keys['new-key'].name).toBe('New Client');
      expect(keys['new-key'].permissions).toEqual(['read']);
    });

    it('should remove API key', () => {
      addAPIKey('temp-key', 'client-temp', 'Temp Client');
      expect(getAllAPIKeys()['temp-key']).toBeDefined();

      removeAPIKey('temp-key');
      expect(getAllAPIKeys()['temp-key']).toBeUndefined();
    });

    it('should clear all API keys except default test key', () => {
      addAPIKey('key-1', 'client-1', 'Client 1');
      addAPIKey('key-2', 'client-2', 'Client 2');

      clearAPIKeys();

      const keys = getAllAPIKeys();
      expect(keys['key-1']).toBeUndefined();
      expect(keys['key-2']).toBeUndefined();
      expect(keys['test-api-key-12345']).toBeDefined(); // Default key should remain
    });

    it('should get all API keys', () => {
      const keys = getAllAPIKeys();
      expect(keys).toBeDefined();
      expect(typeof keys).toBe('object');
    });

    it('should set default permissions when not specified', () => {
      addAPIKey('default-perm-key', 'client-default', 'Default Client');

      const keys = getAllAPIKeys();
      expect(keys['default-perm-key'].permissions).toEqual(['read', 'write']);
    });

    it('should store creation timestamp', () => {
      const beforeCreate = new Date();
      addAPIKey('timestamped-key', 'client-ts', 'Timestamped Client');
      const afterCreate = new Date();

      const keys = getAllAPIKeys();
      const createdAt = keys['timestamped-key'].createdAt;

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full authentication and authorization flow', () => {
      // Setup request with API key
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'valid-key-123';
        return undefined;
      });

      // Authenticate
      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      expect(mockReq.apiKey).toBe('valid-key-123');

      // Authorize
      const authorizeRead = authorize('read');
      authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should reject unauthorized access in full flow', () => {
      // Setup request with read-only API key
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'read-only-key';
        return undefined;
      });

      // Authenticate
      authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      expect(mockReq.apiKey).toBe('read-only-key');

      // Try to authorize write access
      const authorizeWrite = authorize('write');

      expect(() => {
        authorizeWrite(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should handle multiple authorization checks', () => {
      mockReq.apiKey = 'valid-key-123';
      mockReq.clientId = 'client-1';

      const authorizeRead = authorize('read');
      const authorizeWrite = authorize('write');

      authorizeRead(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      authorizeWrite(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string API key', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return '';
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should handle whitespace-only API key', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return '   ';
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should handle Authorization header without Bearer prefix', () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Authorization') return 'valid-key-123';
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should handle case-sensitive API keys', () => {
      addAPIKey('CaseSensitiveKey', 'client-case', 'Case Client');

      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'casesensitivekey'; // lowercase
        return undefined;
      });

      expect(() => {
        authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);
      }).toThrow(APIError);
    });

    it('should handle authorization with no permissions required', () => {
      mockReq.apiKey = 'valid-key-123';
      mockReq.clientId = 'client-1';

      const authorizeNone = authorize();
      authorizeNone(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
