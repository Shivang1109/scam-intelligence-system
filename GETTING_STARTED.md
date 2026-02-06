# Getting Started Guide

## 🎯 What You'll Build

By the end of this guide, you'll have a fully functional Scam Intelligence System running locally that can:
- Accept scam conversations via REST API
- Extract intelligence (phone numbers, payment IDs, URLs)
- Detect scam signals and patterns
- Generate comprehensive threat reports

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for production setup)
- PostgreSQL 15+ (optional, for production)

## 🚀 Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd scam-intelligence-system
npm install
```

### 2. Run Tests

```bash
npm test
```

You should see 300+ tests passing ✅

### 3. Start Development Server

```bash
npm run dev
```

The API will start on `http://localhost:3000`

### 4. Test the API

Open a new terminal and try these commands:

```bash
# Health check
curl http://localhost:3000/health

# Create a conversation (phishing scam)
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "initialMessage": "URGENT: Your bank account has been compromised! Click here immediately: http://fake-bank.com"
  }'

# Save the conversation ID from the response
CONV_ID="<paste-conversation-id-here>"

# Send a follow-up message
curl -X POST "http://localhost:3000/api/v1/conversations/$CONV_ID/messages" \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Please verify your account by sending payment to UPI: scammer@paytm"
  }'

# Get conversation details
curl "http://localhost:3000/api/v1/conversations/$CONV_ID" \
  -H "X-API-Key: test-api-key-12345" | jq

# Terminate conversation
curl -X DELETE "http://localhost:3000/api/v1/conversations/$CONV_ID" \
  -H "X-API-Key: test-api-key-12345"

# Get intelligence report
curl "http://localhost:3000/api/v1/reports/$CONV_ID" \
  -H "X-API-Key: test-api-key-12345" | jq
```

## 🐳 Production Setup with Docker (10 minutes)

### 1. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DB_PASSWORD=your-secure-password-here
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- Scam Intelligence API

### 3. Check Status

```bash
# Check all services are running
docker-compose ps

# Check API logs
docker-compose logs -f api

# Test health endpoint
curl http://localhost:3000/health
```

### 4. View Logs

```bash
# API logs
docker-compose logs -f api

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

## 📊 Understanding the Response

When you create a conversation, you'll get a response like:

```json
{
  "conversationId": "abc-123-def-456",
  "status": "created",
  "message": "Conversation created successfully"
}
```

When you get conversation details:

```json
{
  "id": "abc-123-def-456",
  "state": "INFORMATION_GATHERING",
  "persona": {
    "id": "elderly-retiree",
    "name": "Margaret",
    "age": 72,
    "occupation": "Retired Teacher"
  },
  "messages": [
    {
      "id": "msg-1",
      "sender": "scammer",
      "content": "Your bank account has been compromised!",
      "timestamp": "2026-02-07T00:00:00.000Z"
    },
    {
      "id": "msg-2",
      "sender": "agent",
      "content": "Oh my! What should I do?",
      "timestamp": "2026-02-07T00:00:05.000Z"
    }
  ],
  "extractedEntities": [
    {
      "type": "url",
      "value": "http://fake-bank.com",
      "normalizedValue": "http://fake-bank.com",
      "confidence": 0.95
    },
    {
      "type": "payment_id",
      "value": "scammer@paytm",
      "normalizedValue": "scammer@paytm",
      "confidence": 0.90
    }
  ],
  "scamSignals": [
    {
      "type": "urgency",
      "confidence": 0.85,
      "evidence": "URGENT, immediately",
      "timestamp": "2026-02-07T00:00:00.000Z"
    },
    {
      "type": "authority_impersonation",
      "confidence": 0.80,
      "evidence": "bank account",
      "timestamp": "2026-02-07T00:00:00.000Z"
    }
  ],
  "classification": {
    "types": ["phishing", "financial"],
    "confidence": {
      "phishing": 0.92,
      "financial": 0.88
    }
  },
  "riskScore": 78.5,
  "createdAt": "2026-02-07T00:00:00.000Z",
  "updatedAt": "2026-02-07T00:00:10.000Z"
}
```

## 🎓 Next Steps

### 1. Explore Different Scam Types

Try these example conversations:

**Tech Support Scam:**
```json
{
  "initialMessage": "This is Microsoft Support. Your computer has a virus. Call +1-800-123-4567 immediately!"
}
```

**Investment Scam:**
```json
{
  "initialMessage": "Guaranteed 500% returns in 30 days! Limited spots available. Invest now!"
}
```

**Lottery Scam:**
```json
{
  "initialMessage": "Congratulations! You won $1,000,000 in the lottery. Send $100 processing fee to claim."
}
```

### 2. Monitor Logs

Watch the structured logs to see what's happening:

```bash
docker-compose logs -f api | jq
```

You'll see:
- State transitions
- Entity extractions
- Scam signal detections
- API requests

### 3. Query Reports

```bash
# List all reports
curl "http://localhost:3000/api/v1/reports?page=1&pageSize=10" \
  -H "X-API-Key: test-api-key-12345" | jq

# Get specific report
curl "http://localhost:3000/api/v1/reports/<conversation-id>" \
  -H "X-API-Key: test-api-key-12345" | jq
```

### 4. Create Your Own API Keys

```bash
# Connect to database
docker-compose exec postgres psql -U scam_user -d scam_intelligence

# Create new API key
INSERT INTO api_keys (key_hash, client_id, name, permissions, rate_limit)
VALUES (
  encode(digest('my-new-api-key', 'sha256'), 'hex'),
  'my-client-id',
  'My Application',
  ARRAY['read', 'write'],
  100
);
```

### 5. Integrate with Your Application

```javascript
// Example: Node.js integration
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'test-api-key-12345';

async function analyzeScam(message) {
  // Create conversation
  const { data: conv } = await axios.post(
    `${API_URL}/conversations`,
    { initialMessage: message },
    { headers: { 'X-API-Key': API_KEY } }
  );

  // Get conversation details
  const { data: details } = await axios.get(
    `${API_URL}/conversations/${conv.conversationId}`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  return {
    riskScore: details.riskScore,
    scamTypes: details.classification.types,
    entities: details.extractedEntities,
    signals: details.scamSignals
  };
}

// Use it
analyzeScam('Your bank account has been compromised!')
  .then(result => console.log('Scam Analysis:', result));
```

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Change port in .env
PORT=3001

# Or stop the conflicting service
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed

```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### API Returns 401 Unauthorized

Make sure you're using the correct API key:
- Development: `test-api-key-12345`
- Production: Create your own in the database

### Tests Failing

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

## 📚 Learn More

- [API Documentation](README.md#-api-documentation)
- [Deployment Guide](DEPLOYMENT.md)
- [Architecture Overview](README.md#-architecture)
- [Contributing Guide](README.md#-contributing)

## 💡 Tips

1. **Use jq for pretty JSON**: Install `jq` to format API responses
2. **Monitor logs**: Keep `docker-compose logs -f api` running in a terminal
3. **Test different scams**: Try various scam types to see how the system adapts
4. **Check risk scores**: Higher scores indicate more sophisticated scams
5. **Review reports**: Intelligence reports contain full conversation analysis

## 🎉 You're Ready!

You now have a fully functional Scam Intelligence System. Start sending scam conversations and collecting intelligence!

Need help? Check the [troubleshooting section](#-troubleshooting) or open an issue on GitHub.
