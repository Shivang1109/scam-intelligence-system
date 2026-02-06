/**
 * Server Entry Point
 * Starts the Express.js API server
 */

import { APIServer } from './api/server';

// Get port from environment or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Create and start the server
const server = new APIServer(PORT);
server.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
