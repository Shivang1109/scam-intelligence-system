/**
 * Authentication and Authorization Middleware
 * Implements API key authentication for the Scam Intelligence System
 */

import { Request, Response, NextFunction } from 'express';
import { APIError } from './errorHandler';

/**
 * Extended Request interface with authenticated user info
 */
export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  clientId?: string;
}

/**
 * API Key storage interface
 * In production, this would be backed by a database
 */
interface APIKeyStore {
  [key: string]: {
    clientId: string;
    name: string;
    permissions: string[];
    createdAt: Date;
    lastUsed?: Date;
  };
}

/**
 * In-memory API key store
 * In production, this would be replaced with database storage
 */
const apiKeyStore: APIKeyStore = {
  // Default test API key for development
  'test-api-key-12345': {
    clientId: 'test-client-1',
    name: 'Test Client',
    permissions: ['read', 'write'],
    createdAt: new Date(),
  },
};

/**
 * Add an API key to the store
 * Used for testing and initial setup
 */
export function addAPIKey(
  apiKey: string,
  clientId: string,
  name: string,
  permissions: string[] = ['read', 'write']
): void {
  apiKeyStore[apiKey] = {
    clientId,
    name,
    permissions,
    createdAt: new Date(),
  };
}

/**
 * Remove an API key from the store
 */
export function removeAPIKey(apiKey: string): void {
  delete apiKeyStore[apiKey];
}

/**
 * Get all API keys (for testing purposes)
 */
export function getAllAPIKeys(): APIKeyStore {
  return { ...apiKeyStore };
}

/**
 * Clear all API keys (for testing purposes)
 */
export function clearAPIKeys(): void {
  Object.keys(apiKeyStore).forEach((key) => {
    if (key !== 'test-api-key-12345') {
      delete apiKeyStore[key];
    }
  });
}

/**
 * Validate API key
 * Returns client info if valid, null otherwise
 */
function validateAPIKey(apiKey: string): APIKeyStore[string] | null {
  const keyData = apiKeyStore[apiKey];
  if (!keyData) {
    return null;
  }

  // Update last used timestamp
  keyData.lastUsed = new Date();

  return keyData;
}

/**
 * Authentication middleware
 * Validates API key from request headers
 * 
 * Supports two header formats:
 * - X-API-Key: <api-key>
 * - Authorization: Bearer <api-key>
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // Extract API key from headers
  let apiKey: string | undefined;

  // Check X-API-Key header (preferred)
  const xApiKey = req.get('X-API-Key');
  if (xApiKey) {
    apiKey = xApiKey;
  } else {
    // Check Authorization header (Bearer token) only if X-API-Key not present
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
  }

  // No API key provided
  if (!apiKey) {
    throw new APIError('Authentication required. Please provide an API key.', 401);
  }

  // Validate API key
  const keyData = validateAPIKey(apiKey);
  if (!keyData) {
    throw new APIError('Invalid API key', 401);
  }

  // Attach authentication info to request
  req.apiKey = apiKey;
  req.clientId = keyData.clientId;

  next();
}

/**
 * Authorization middleware factory
 * Creates middleware that checks for specific permissions
 * 
 * @param requiredPermissions - Array of permissions required to access the route
 */
export function authorize(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    // Ensure request is authenticated
    if (!req.apiKey) {
      throw new APIError('Authentication required', 401);
    }

    // Get key data
    const keyData = apiKeyStore[req.apiKey];
    if (!keyData) {
      throw new APIError('Invalid API key', 401);
    }

    // Check permissions
    const hasPermission = requiredPermissions.every((permission) =>
      keyData.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new APIError(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        403
      );
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no credentials provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  // Extract API key from headers
  let apiKey: string | undefined;

  const xApiKey = req.get('X-API-Key');
  if (xApiKey) {
    apiKey = xApiKey;
  }

  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  }

  // If no API key provided, continue without authentication
  if (!apiKey) {
    next();
    return;
  }

  // Validate API key if provided
  const keyData = validateAPIKey(apiKey);
  if (keyData) {
    req.apiKey = apiKey;
    req.clientId = keyData.clientId;
  }

  next();
}
