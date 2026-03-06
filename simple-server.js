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
  // Try multiple locations for public folder
  const possiblePaths = [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'dist', 'public'),
    path.join(process.cwd(), 'public')
  ];
  
  let publicPath = null;
  for (const testPath of possiblePaths) {
    if (require('fs').existsSync(testPath)) {
      publicPath = testPath;
      break;
    }
  }
  
  console.log('📁 Checking paths:', possiblePaths);
  console.log('📁 __dirname is:', __dirname);
  console.log('📁 process.cwd() is:', process.cwd());
  
  if (publicPath) {
    console.log('✅ Found public folder at:', publicPath);
    console.log('📁 Files in public:', require('fs').readdirSync(publicPath));
    app.use(express.static(publicPath));
  } else {
    console.error('❌ ERROR: public folder not found in any location');
    console.log('📁 Available files in __dirname:', require('fs').readdirSync(__dirname).filter(f => !f.startsWith('.')));
  }
  
  // Initialize the Scam Intelligence System
  const scamApp = new Application();
  await scamApp.initialize();
  
  // Debug endpoint to check filesystem
  app.get('/debug/files', (req, res) => {
    const fs = require('fs');
    const debugInfo = {
      __dirname,
      'process.cwd()': process.cwd(),
      'paths_checked': [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'dist', 'public'),
        path.join(process.cwd(), 'public')
      ],
      'public_exists': fs.existsSync(path.join(__dirname, 'public')),
      'dist_public_exists': fs.existsSync(path.join(__dirname, 'dist', 'public')),
      'cwd_public_exists': fs.existsSync(path.join(process.cwd(), 'public')),
      'public_files': fs.existsSync(path.join(__dirname, 'public')) ? fs.readdirSync(path.join(__dirname, 'public')) : [],
      'dist_public_files': fs.existsSync(path.join(__dirname, 'dist', 'public')) ? fs.readdirSync(path.join(__dirname, 'dist', 'public')) : [],
      'rootFiles': fs.readdirSync(__dirname).filter(f => !f.startsWith('.')),
      'distExists': fs.existsSync(path.join(__dirname, 'dist')),
      'nodeModulesExists': fs.existsSync(path.join(__dirname, 'node_modules'))
    };
    res.json(debugInfo);
  });

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
