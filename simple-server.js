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
  const publicPath = path.join(__dirname, 'public');
  console.log('📁 Serving static files from:', publicPath);
  console.log('📁 __dirname is:', __dirname);
  console.log('📁 process.cwd() is:', process.cwd());
  console.log('📁 Directory exists:', require('fs').existsSync(publicPath));
  
  if (require('fs').existsSync(publicPath)) {
    console.log('📁 Files in public:', require('fs').readdirSync(publicPath));
    app.use(express.static(publicPath));
  } else {
    console.error('❌ ERROR: public folder not found at:', publicPath);
    console.log('📁 Trying alternative path from cwd...');
    const altPath = path.join(process.cwd(), 'public');
    console.log('📁 Alternative path:', altPath);
    console.log('📁 Alternative exists:', require('fs').existsSync(altPath));
    if (require('fs').existsSync(altPath)) {
      console.log('✅ Using alternative path');
      app.use(express.static(altPath));
    }
  }
  
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
  
  // Fallback route - serve index.html for any non-API routes (SPA support)
  app.use((req, res, next) => {
    // Don't intercept API routes or health check
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('📄 Serving index.html for:', req.path);
    res.sendFile(indexPath);
  });
  
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
