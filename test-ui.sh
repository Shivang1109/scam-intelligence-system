#!/bin/bash
echo "🚀 Starting ScamShield UI Test..."
echo ""
echo "Starting backend server..."
npm start &
SERVER_PID=$!

sleep 3

echo ""
echo "✅ Server started!"
echo ""
echo "📱 Open your browser to: http://localhost:3000"
echo ""
echo "🎯 Try these steps:"
echo "  1. Click any preset button (IRS, Bank Fraud, etc.)"
echo "  2. Click 'SEND ➤' to engage the AI honeypot"
echo "  3. Watch the risk meter animate"
echo "  4. See signals appear in real-time"
echo "  5. Check entity extraction chips"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

wait $SERVER_PID
