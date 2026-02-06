#!/bin/bash
# Test Local Deployment Script

set -e

echo "🚀 Testing Scam Intelligence System Local Deployment"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo "1️⃣  Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found!${NC}"
    echo ""
    echo "Please install Docker Desktop:"
    echo "https://www.docker.com/products/docker-desktop"
    echo ""
    echo "For macOS:"
    echo "1. Download Docker Desktop for Mac"
    echo "2. Install and start Docker Desktop"
    echo "3. Run this script again"
    exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}"

# Check Docker is running
echo ""
echo "2️⃣  Checking if Docker is running..."
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo ""
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Start services
echo ""
echo "3️⃣  Starting services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "4️⃣  Waiting for services to be ready..."
sleep 10

# Check health
echo ""
echo "5️⃣  Checking API health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health || echo "failed")

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo -e "${GREEN}✅ API is healthy!${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    echo ""
    echo "Checking logs..."
    docker-compose logs api | tail -20
    exit 1
fi

# Test API
echo ""
echo "6️⃣  Testing API endpoints..."

# Create conversation
echo "   Creating conversation..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "URGENT: Your bank account has been compromised! Click here: http://fake-bank.com"}')

if [[ $CREATE_RESPONSE == *"conversationId"* ]]; then
    echo -e "${GREEN}   ✅ Conversation created${NC}"
    
    # Extract conversation ID
    CONV_ID=$(echo $CREATE_RESPONSE | grep -o '"conversationId":"[^"]*"' | cut -d'"' -f4)
    echo "   Conversation ID: $CONV_ID"
    
    # Send message
    echo ""
    echo "   Sending follow-up message..."
    MESSAGE_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/conversations/$CONV_ID/messages" \
      -H "X-API-Key: test-api-key-12345" \
      -H "Content-Type: application/json" \
      -d '{"message": "Please verify your account by sending payment to UPI: scammer@paytm"}')
    
    if [[ $MESSAGE_RESPONSE == *"content"* ]]; then
        echo -e "${GREEN}   ✅ Message sent successfully${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Message response unexpected${NC}"
    fi
    
    # Get conversation
    echo ""
    echo "   Fetching conversation details..."
    CONV_RESPONSE=$(curl -s "http://localhost:3000/api/v1/conversations/$CONV_ID" \
      -H "X-API-Key: test-api-key-12345")
    
    if [[ $CONV_RESPONSE == *"extractedEntities"* ]]; then
        echo -e "${GREEN}   ✅ Conversation retrieved${NC}"
        
        # Count entities
        ENTITY_COUNT=$(echo $CONV_RESPONSE | grep -o '"type"' | wc -l | tr -d ' ')
        echo "   Extracted entities: $ENTITY_COUNT"
        
        # Check risk score
        RISK_SCORE=$(echo $CONV_RESPONSE | grep -o '"riskScore":[0-9.]*' | cut -d':' -f2)
        echo "   Risk score: $RISK_SCORE"
    fi
    
    # Terminate conversation
    echo ""
    echo "   Terminating conversation..."
    TERM_RESPONSE=$(curl -s -X DELETE "http://localhost:3000/api/v1/conversations/$CONV_ID" \
      -H "X-API-Key: test-api-key-12345")
    
    if [[ $TERM_RESPONSE == *"terminated"* ]]; then
        echo -e "${GREEN}   ✅ Conversation terminated${NC}"
    fi
    
    # Get report
    echo ""
    echo "   Fetching intelligence report..."
    REPORT_RESPONSE=$(curl -s "http://localhost:3000/api/v1/reports/$CONV_ID" \
      -H "X-API-Key: test-api-key-12345")
    
    if [[ $REPORT_RESPONSE == *"scamClassification"* ]]; then
        echo -e "${GREEN}   ✅ Report generated${NC}"
    fi
    
else
    echo -e "${RED}   ❌ Failed to create conversation${NC}"
    echo "Response: $CREATE_RESPONSE"
fi

# Summary
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Deployment Test Complete!${NC}"
echo ""
echo "Your Scam Intelligence System is running at:"
echo "  🌐 API: http://localhost:3000"
echo "  ❤️  Health: http://localhost:3000/health"
echo "  📊 Metrics: http://localhost:3000/api/v1"
echo ""
echo "Useful commands:"
echo "  📋 View logs: docker-compose logs -f api"
echo "  🔄 Restart: docker-compose restart"
echo "  🛑 Stop: docker-compose down"
echo ""
echo "Next steps:"
echo "  1. Try different scam messages"
echo "  2. Check the logs: docker-compose logs -f"
echo "  3. View reports: curl http://localhost:3000/api/v1/reports"
echo "  4. Read GETTING_STARTED.md for more examples"
echo ""
