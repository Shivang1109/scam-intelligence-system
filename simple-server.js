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
  const port = 3000;
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Initialize the Scam Intelligence System
  const scamApp = new Application();
  await scamApp.initialize();
  
  // Get the API server and mount its routes
  const apiServer = scamApp.getServer();
  if (apiServer) {
    const apiApp = apiServer.getApp();
    app.use(apiApp);
  }
  
  // Start server
  app.listen(port, () => {
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
