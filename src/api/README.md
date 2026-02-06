# API Service Layer

This directory contains the Express.js API server implementation for the Scam Intelligence System.

## Structure

```
src/api/
├── server.ts              # Main Express server setup
├── interfaces.ts          # API service interfaces
├── middleware/
│   ├── errorHandler.ts    # Error handling middleware
│   ├── logger.ts          # Request logging middleware
│   └── index.ts           # Middleware exports
├── server.test.ts         # Server tests
└── README.md              # This file
```

## Components

### APIServer (`server.ts`)

The main Express.js server class that:
- Initializes the Express application
- Configures middleware (body parser, CORS, logging)
- Sets up routes and error handling
- Provides methods to start the server and access the app instance

**Usage:**

```typescript
import { APIServer } from './api/server';

const server = new APIServer(3000);
server.start();
```

### Middleware

#### Error Handler (`middleware/errorHandler.ts`)

Centralized error handling middleware that:
- Catches all errors and formats them consistently
- Provides custom `APIError` class for operational errors
- Logs error details with context
- Returns appropriate HTTP status codes
- Includes stack traces in development mode

**Usage:**

```typescript
import { APIError, asyncHandler } from './api/middleware';

// Throw custom API errors
throw new APIError('Resource not found', 404);

// Wrap async route handlers
app.get('/route', asyncHandler(async (req, res) => {
  // Your async code here
}));
```

#### Logger (`middleware/logger.ts`)

Request logging middleware that:
- Logs all incoming requests with details
- Logs response status and duration
- Provides structured logging utilities
- Masks sensitive information (API keys)

**Usage:**

```typescript
import { Logger } from './api/middleware';

Logger.info('Operation completed', { userId: '123' });
Logger.error('Operation failed', error, { context: 'payment' });
```

## Endpoints

### Health Check

**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T17:44:44.134Z",
  "uptime": 123.456
}
```

### API Version

**GET** `/api/v1`

Returns API version information and available endpoints.

**Response:**
```json
{
  "message": "Scam Intelligence System API v1",
  "version": "1.0.0",
  "endpoints": {
    "conversations": "/api/v1/conversations",
    "reports": "/api/v1/reports",
    "health": "/health",
    "metrics": "/api/v1/metrics"
  }
}
```

## Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - CORS allowed origin (default: *)
- `NODE_ENV` - Environment mode (development/production)

## Running the Server

### Development Mode

```bash
npm run dev:server
```

### Production Mode

```bash
npm run build
npm run start:server
```

## Testing

Run all API tests:

```bash
npm test -- src/api/
```

Run specific test file:

```bash
npm test -- src/api/server.test.ts
```

## Next Steps

The following endpoints will be implemented in subsequent tasks:

- **Task 16.4**: Conversation endpoints (POST, GET, DELETE)
- **Task 16.5**: Report endpoints (GET with pagination)
- **Task 16.2**: Authentication middleware
- **Task 16.3**: Rate limiting middleware

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **8.1**: API endpoints for system interaction
- **8.2**: Authentication (structure in place, implementation in task 16.2)
- **8.4**: Report retrieval (structure in place, implementation in task 16.5)

## Middleware Features

### Body Parser
- Parses JSON request bodies (up to 10MB)
- Parses URL-encoded bodies

### CORS
- Configurable origin
- Supports credentials
- Allows common HTTP methods

### Logging
- HTTP request logging (morgan)
- Custom structured logging
- Request/response timing

### Error Handling
- Consistent error response format
- Appropriate HTTP status codes
- Error logging with context
- Development vs production modes
