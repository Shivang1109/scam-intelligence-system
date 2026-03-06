#!/usr/bin/env node
/**
 * Simple combined server for prototype
 */

require('dotenv/config');
const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the application components
const { Application } = require('./dist/app');

async function start() {
  console.log('🚀 Starting Scam Intelligence Prototype Server...\n');
  
  // Create Express app
  const app = express();
  const port = process.env.PORT || 3000;
  
  // Middleware - CORS and JSON parsing
  app.use(cors());
  app.use(express.json());
  
  // Serve static files FIRST (before API routes)
  console.log('📁 Serving static files from:', path.join(__dirname, 'public'));
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Initialize the Scam Intelligence System
  const scamApp = new Application();
  await scamApp.initialize();
  
  // Get the API server and mount its routes
  const apiServer = scamApp.getServer();
  if (apiServer) {
    const apiApp = apiServer.getApp();
    // Mount the API routes (they're already prefixed with /api/v1 and /health)
    app.use(apiApp);
  }
  
  // Start server - bind to 0.0.0.0 for Render
  app.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ Prototype Server Running!`);
    console.log(`\n📱 Frontend: http://localhost:${port}`);
    console.log(`🔗 API: http://localhost:${port}/api/v1`);
    console.log(`💚 Health: http://localhost:${port}/health`);
    console.log(`\nPress Ctrl+C to stop\n`);
  });
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
