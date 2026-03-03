#!/bin/bash

echo "🚀 Starting Scam Intelligence System Prototype"
echo ""
echo "Building project..."
npm run build

echo ""
echo "Starting server..."
echo ""
echo "✅ Server will start on http://localhost:3000"
echo "✅ Open your browser to: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node dist/app.js
