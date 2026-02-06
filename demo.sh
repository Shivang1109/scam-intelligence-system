#!/bin/bash

API_BASE="http://localhost:3000/api/v1"
API_KEY="test-api-key-12345"

echo "🛡️  Scam Intelligence System - Live Demo"
echo "=========================================="
echo ""

# Test 1: Romance Scam
echo "📱 Test 1: Romance Scam"
echo "Message: 'Hi darling, I'm stuck in Nigeria and need $5000 urgently...'"
CONV1=$(curl -s -X POST "$API_BASE/conversations" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "Hi darling, I am stuck in Nigeria and need $5000 urgently to pay hospital bills. Please send money to my PayPal: scammer@fake.com or call +234-800-555-0123"}' \
  | jq -r '.conversationId')

echo "Conversation ID: $CONV1"
sleep 1

curl -s "$API_BASE/conversations/$CONV1" \
  -H "X-API-Key: $API_KEY" \
  | jq '{
    riskScore,
    scamType: .classification.primaryType,
    confidence: .classification.primaryConfidence,
    entities: [.extractedEntities[] | {type, value}] | .[0:3],
    signals: [.scamSignals[] | .type]
  }'

echo ""
echo "---"
echo ""

# Test 2: Investment Scam
echo "💰 Test 2: Investment Scam"
echo "Message: 'Invest in Bitcoin now! 500% returns guaranteed...'"
CONV2=$(curl -s -X POST "$API_BASE/conversations" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "EXCLUSIVE OFFER! Invest in Bitcoin now and get 500% returns GUARANTEED in 30 days! Limited spots available. Send $1000 to wallet: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa or visit http://crypto-invest-now.com"}' \
  | jq -r '.conversationId')

echo "Conversation ID: $CONV2"
sleep 1

curl -s "$API_BASE/conversations/$CONV2" \
  -H "X-API-Key: $API_KEY" \
  | jq '{
    riskScore,
    scamType: .classification.primaryType,
    confidence: .classification.primaryConfidence,
    entities: [.extractedEntities[] | {type, value}] | .[0:3],
    signals: [.scamSignals[] | .type]
  }'

echo ""
echo "---"
echo ""

# Test 3: Tech Support Scam
echo "💻 Test 3: Tech Support Scam"
echo "Message: 'Microsoft Security Alert! Your computer has virus...'"
CONV3=$(curl -s -X POST "$API_BASE/conversations" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "MICROSOFT SECURITY ALERT! Your computer has been infected with a virus. Call our support team IMMEDIATELY at +1-800-MICROSOFT (1-800-642-7676) or visit http://microsoft-support-fix.com to remove the threat. DO NOT TURN OFF YOUR COMPUTER!"}' \
  | jq -r '.conversationId')

echo "Conversation ID: $CONV3"
sleep 1

curl -s "$API_BASE/conversations/$CONV3" \
  -H "X-API-Key: $API_KEY" \
  | jq '{
    riskScore,
    scamType: .classification.primaryType,
    confidence: .classification.primaryConfidence,
    entities: [.extractedEntities[] | {type, value}] | .[0:3],
    signals: [.scamSignals[] | .type]
  }'

echo ""
echo "---"
echo ""

# List all reports
echo "📊 All Intelligence Reports"
curl -s "$API_BASE/reports?pageSize=3" \
  -H "X-API-Key: $API_KEY" \
  | jq '{
    totalReports: .pagination.totalCount,
    reports: [.reports[] | {
      conversationId,
      scamType: .scamClassification.primaryType,
      riskScore: .riskScore.score,
      entityCount: (.extractedEntities | length)
    }]
  }'

echo ""
echo "=========================================="
echo "✅ Demo Complete!"
echo ""
echo "Try it yourself:"
echo "  curl -X POST $API_BASE/conversations \\"
echo "    -H 'X-API-Key: $API_KEY' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"initialMessage\": \"Your scam message here\"}'"
