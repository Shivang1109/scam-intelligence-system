# API Middleware

This directory contains middleware components for the Scam Intelligence System API.

## Authentication Middleware

The authentication middleware provides API key-based authentication and authorization for API endpoints.

### Features

- **API Key Authentication**: Supports two authentication methods:
  - `X-API-Key` header (preferred)
  - `Authorization: Bearer <api-key>` header
- **Authorization**: Role-based access control with customizable permissions
- **401 Status Codes**: Automatically rejects requests with invalid or missing API keys
- **403 Status Codes**: Rejects requests when users lack required permissions
- **Last Used Tracking**: Tracks when API keys were last used
- **Optional Authentication**: Support for endpoints that work with or without authentication

### Usage

#### Basic Authentication

Protect an endpoint by requiring authentication:

```typescript
import { authenticate } from './middleware';

app.get('/protected', authenticate, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Protected endpoint',
    clientId: req.clientId,
  });
});
```

#### Authorization with Permissions

Require specific permissions for an endpoint:

```typescript
import { authenticate, authorize } from './middleware';

// Require 'write' permission
app.post('/data', authenticate, authorize('write'), (req, res) => {
  // Handle request
});

// Require multiple permissions
app.delete('/admin', authenticate, authorize('read', 'write', 'admin'), (req, res) => {
  // Handle request
});
```

#### Optional Authentication

Allow both authenticated and anonymous access:

```typescript
import { optionalAuthenticate } from './middleware';

app.get('/public-or-private', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
  if (req.apiKey) {
    res.json({ message: 'Authenticated user', clientId: req.clientId });
  } else {
    res.json({ message: 'Anonymous user' });
  }
});
```

### API Key Management

#### Adding API Keys

```typescript
import { addAPIKey } from './middleware/auth';

addAPIKey(
  'my-api-key-123',           // API key
  'client-id',                // Client identifier
  'Client Name',              // Descriptive name
  ['read', 'write']           // Permissions
);
```

#### Removing API Keys

```typescript
import { removeAPIKey } from './middleware/auth';

removeAPIKey('my-api-key-123');
```

#### Clearing API Keys

```typescript
import { clearAPIKeys } from './middleware/auth';

// Clears all API keys except the default test key
clearAPIKeys();
```

### Making Authenticated Requests

#### Using X-API-Key Header

```bash
curl -H "X-API-Key: your-api-key-here" http://localhost:3000/api/v1/protected
```

#### Using Authorization Bearer Header

```bash
curl -H "Authorization: Bearer your-api-key-here" http://localhost:3000/api/v1/protected
```

### Error Responses

#### 401 Unauthorized - Missing API Key

```json
{
  "error": "Authentication required. Please provide an API key.",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/v1/protected"
}
```

#### 401 Unauthorized - Invalid API Key

```json
{
  "error": "Invalid API key",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/v1/protected"
}
```

#### 403 Forbidden - Insufficient Permissions

```json
{
  "error": "Insufficient permissions. Required: write, admin",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "path": "/api/v1/admin"
}
```

### Security Considerations

1. **API Key Storage**: In production, API keys should be stored in a secure database, not in memory
2. **HTTPS Only**: Always use HTTPS in production to protect API keys in transit
3. **Key Rotation**: Implement regular API key rotation policies
4. **Rate Limiting**: Combine with rate limiting middleware to prevent abuse
5. **Logging**: API key usage is logged (masked) for security auditing

### Testing

The authentication middleware includes comprehensive tests:

- **Unit Tests** (`auth.test.ts`): 33 tests covering all middleware functions
- **Integration Tests** (`auth.integration.test.ts`): 17 tests covering real-world scenarios

Run tests:

```bash
npm test -- src/api/middleware/auth
```

## Error Handler Middleware

Provides centralized error handling with proper HTTP status codes and structured error responses.

### Features

- Handles `APIError` with custom status codes
- Converts generic errors to 500 Internal Server Error
- Logs all errors with context
- Returns structured JSON error responses

### Usage

```typescript
import { errorHandler, APIError } from './middleware';

// Add at the end of middleware chain
app.use(errorHandler);

// Throw errors in route handlers
app.get('/example', (req, res) => {
  throw new APIError('Something went wrong', 400);
});
```

## Request Logger Middleware

Logs all incoming requests and responses for monitoring and debugging.

### Features

- Logs request details (method, path, query, IP, user agent)
- Logs response details (status code, duration)
- Masks sensitive information (API keys)
- Structured JSON logging

### Usage

```typescript
import { requestLogger } from './middleware';

app.use(requestLogger);
```

## Middleware Order

For proper functionality, middleware should be applied in this order:

```typescript
import express from 'express';
import { requestLogger, authenticate, authorize, errorHandler } from './middleware';

const app = express();

// 1. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. CORS
app.use(cors());

// 3. Request logging
app.use(requestLogger);

// 4. Routes with authentication/authorization
app.get('/protected', authenticate, (req, res) => { /* ... */ });
app.post('/admin', authenticate, authorize('admin'), (req, res) => { /* ... */ });

// 5. Error handler (must be last)
app.use(errorHandler);
```

## Requirements Validation

This middleware implementation satisfies:

- **Requirement 8.2**: API key authentication for all requests
- **Requirement 8.5**: Proper HTTP status codes (200, 400, 401, 403, 404, 500)
- **Property 25**: Authentication enforcement with 401 for invalid/missing keys
- **Property 27**: HTTP status code correctness

## Production Considerations

Before deploying to production:

1. Replace in-memory API key storage with database storage
2. Implement API key hashing/encryption
3. Add rate limiting per API key
4. Set up monitoring and alerting for authentication failures
5. Implement API key expiration and rotation
6. Add support for JWT tokens if needed
7. Configure proper CORS policies
8. Enable request/response compression
9. Set up structured logging to external service
10. Implement audit logging for security events
