# 🔌 Integration Guide

Complete guide for integrating the Scam Intelligence System into your application.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Code Examples](#code-examples)
5. [Webhooks & Real-time](#webhooks--real-time)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Quick Start

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All requests require an API key in the `X-API-Key` header:
```
X-API-Key: your-api-key-here
```

### Basic Flow
1. **Create conversation** with initial scam message
2. **Send additional messages** (optional)
3. **Get conversation status** to check risk score
4. **Terminate conversation** when done
5. **Retrieve intelligence report**

---

## Authentication

### Managing API Keys

API keys are managed in `src/api/middleware/auth.ts`. For production, store keys securely.

**Default test key:**
```
X-API-Key: test-api-key-12345
```

### Adding New API Keys

Edit `src/api/middleware/auth.ts`:

```typescript
// Add your API key
addAPIKey('your-secure-key', 'client-id', 'Client Name');
```

---

## API Endpoints

### 1. Create Conversation

**POST** `/api/v1/conversations`

Start a new scam analysis conversation.

**Request:**
```json
{
  "initialMessage": "Your bank account has been compromised! Call us immediately.",
  "context": {
    "source": "sms",
    "phoneNumber": "+1234567890"
  }
}
```

**Response:**
```json
{
  "conversationId": "abc-123-def",
  "status": "created",
  "message": "Conversation created successfully"
}
```

### 2. Send Message

**POST** `/api/v1/conversations/:id/messages`

Continue the conversation with additional messages.

**Request:**
```json
{
  "message": "Please verify your account details"
}
```

**Response:**
```json
{
  "conversationId": "abc-123-def",
  "status": "message_sent",
  "agentResponse": "I'm not sure what you mean. Can you explain?"
}
```

### 3. Get Conversation

**GET** `/api/v1/conversations/:id`

Retrieve conversation details, entities, and risk score.

**Response:**
```json
{
  "conversationId": "abc-123-def",
  "state": "engagement",
  "riskScore": 75.5,
  "classification": {
    "primaryType": "phishing",
    "primaryConfidence": 0.85,
    "secondaryTypes": [
      {"type": "impersonation", "confidence": 0.72}
    ]
  },
  "extractedEntities": [
    {
      "type": "phone_number",
      "value": "+1-800-555-0199",
      "confidence": 0.95
    }
  ],
  "scamSignals": [
    {
      "type": "urgency",
      "confidence": 0.88,
      "text": "immediately"
    }
  ],
  "messages": [...]
}
```

### 4. Terminate Conversation

**POST** `/api/v1/conversations/:id/terminate`

End the conversation and generate final report.

**Response:**
```json
{
  "conversationId": "abc-123-def",
  "status": "terminated",
  "message": "Conversation terminated successfully",
  "finalReport": {
    "conversationId": "abc-123-def",
    "riskScore": {...},
    "extractedEntities": [...],
    "transcript": [...]
  }
}
```

### 5. Get Report

**GET** `/api/v1/reports/:conversationId`

Retrieve the intelligence report for a conversation.

**Response:**
```json
{
  "conversationId": "abc-123-def",
  "timestamp": "2026-02-07T00:00:00.000Z",
  "persona": {
    "id": "persona-1",
    "name": "Sarah"
  },
  "scamClassification": {...},
  "riskScore": {...},
  "extractedEntities": [...],
  "scamSignals": [...],
  "transcript": [...]
}
```

### 6. List Reports

**GET** `/api/v1/reports?page=1&pageSize=10`

List all intelligence reports with pagination.

**Response:**
```json
{
  "reports": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 45,
    "totalPages": 5
  }
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';
const API_KEY = 'test-api-key-12345';

class ScamIntelligenceClient {
  constructor(apiKey = API_KEY) {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async analyzeMessage(message, context = {}) {
    // Create conversation
    const { data } = await this.client.post('/conversations', {
      initialMessage: message,
      context
    });
    
    const conversationId = data.conversationId;
    
    // Get analysis
    const conversation = await this.client.get(`/conversations/${conversationId}`);
    
    return {
      conversationId,
      riskScore: conversation.data.riskScore,
      classification: conversation.data.classification,
      entities: conversation.data.extractedEntities,
      signals: conversation.data.scamSignals
    };
  }

  async getReport(conversationId) {
    const { data } = await this.client.get(`/reports/${conversationId}`);
    return data;
  }

  async listReports(page = 1, pageSize = 10) {
    const { data } = await this.client.get('/reports', {
      params: { page, pageSize }
    });
    return data;
  }
}

// Usage
const client = new ScamIntelligenceClient();

async function main() {
  const result = await client.analyzeMessage(
    'URGENT! Your account will be closed in 24 hours. Call +1-800-555-0199'
  );
  
  console.log('Risk Score:', result.riskScore);
  console.log('Classification:', result.classification.primaryType);
  console.log('Entities:', result.entities);
}

main();
```

### Python

```python
import requests
from typing import Dict, List, Optional

API_BASE = 'http://localhost:3000/api/v1'
API_KEY = 'test-api-key-12345'

class ScamIntelligenceClient:
    def __init__(self, api_key: str = API_KEY):
        self.base_url = API_BASE
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def analyze_message(self, message: str, context: Optional[Dict] = None) -> Dict:
        """Analyze a scam message and return intelligence."""
        # Create conversation
        response = requests.post(
            f'{self.base_url}/conversations',
            json={'initialMessage': message, 'context': context or {}},
            headers=self.headers
        )
        response.raise_for_status()
        conversation_id = response.json()['conversationId']
        
        # Get analysis
        response = requests.get(
            f'{self.base_url}/conversations/{conversation_id}',
            headers=self.headers
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            'conversation_id': conversation_id,
            'risk_score': data['riskScore'],
            'classification': data['classification'],
            'entities': data['extractedEntities'],
            'signals': data['scamSignals']
        }
    
    def get_report(self, conversation_id: str) -> Dict:
        """Get intelligence report for a conversation."""
        response = requests.get(
            f'{self.base_url}/reports/{conversation_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def list_reports(self, page: int = 1, page_size: int = 10) -> Dict:
        """List all intelligence reports."""
        response = requests.get(
            f'{self.base_url}/reports',
            params={'page': page, 'pageSize': page_size},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
client = ScamIntelligenceClient()

result = client.analyze_message(
    'URGENT! Your account will be closed in 24 hours. Call +1-800-555-0199'
)

print(f"Risk Score: {result['risk_score']}")
print(f"Classification: {result['classification']['primaryType']}")
print(f"Entities: {result['entities']}")
```

### PHP

```php
<?php

class ScamIntelligenceClient {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($apiKey = 'test-api-key-12345') {
        $this->baseUrl = 'http://localhost:3000/api/v1';
        $this->apiKey = $apiKey;
    }
    
    private function request($method, $endpoint, $data = null) {
        $ch = curl_init($this->baseUrl . $endpoint);
        
        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("API request failed with code $httpCode");
        }
        
        return json_decode($response, true);
    }
    
    public function analyzeMessage($message, $context = []) {
        // Create conversation
        $result = $this->request('POST', '/conversations', [
            'initialMessage' => $message,
            'context' => $context
        ]);
        
        $conversationId = $result['conversationId'];
        
        // Get analysis
        $conversation = $this->request('GET', "/conversations/$conversationId");
        
        return [
            'conversationId' => $conversationId,
            'riskScore' => $conversation['riskScore'],
            'classification' => $conversation['classification'],
            'entities' => $conversation['extractedEntities'],
            'signals' => $conversation['scamSignals']
        ];
    }
    
    public function getReport($conversationId) {
        return $this->request('GET', "/reports/$conversationId");
    }
    
    public function listReports($page = 1, $pageSize = 10) {
        return $this->request('GET', "/reports?page=$page&pageSize=$pageSize");
    }
}

// Usage
$client = new ScamIntelligenceClient();

$result = $client->analyzeMessage(
    'URGENT! Your account will be closed in 24 hours. Call +1-800-555-0199'
);

echo "Risk Score: " . $result['riskScore'] . "\n";
echo "Classification: " . $result['classification']['primaryType'] . "\n";
```

### Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

class ScamIntelligenceClient
  API_BASE = 'http://localhost:3000/api/v1'
  
  def initialize(api_key = 'test-api-key-12345')
    @api_key = api_key
  end
  
  def analyze_message(message, context = {})
    # Create conversation
    response = post('/conversations', {
      initialMessage: message,
      context: context
    })
    conversation_id = response['conversationId']
    
    # Get analysis
    conversation = get("/conversations/#{conversation_id}")
    
    {
      conversation_id: conversation_id,
      risk_score: conversation['riskScore'],
      classification: conversation['classification'],
      entities: conversation['extractedEntities'],
      signals: conversation['scamSignals']
    }
  end
  
  def get_report(conversation_id)
    get("/reports/#{conversation_id}")
  end
  
  def list_reports(page = 1, page_size = 10)
    get("/reports?page=#{page}&pageSize=#{page_size}")
  end
  
  private
  
  def get(path)
    uri = URI("#{API_BASE}#{path}")
    request = Net::HTTP::Get.new(uri)
    request['X-API-Key'] = @api_key
    
    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(request)
    end
    
    JSON.parse(response.body)
  end
  
  def post(path, data)
    uri = URI("#{API_BASE}#{path}")
    request = Net::HTTP::Post.new(uri)
    request['X-API-Key'] = @api_key
    request['Content-Type'] = 'application/json'
    request.body = data.to_json
    
    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(request)
    end
    
    JSON.parse(response.body)
  end
end

# Usage
client = ScamIntelligenceClient.new

result = client.analyze_message(
  'URGENT! Your account will be closed in 24 hours. Call +1-800-555-0199'
)

puts "Risk Score: #{result[:risk_score]}"
puts "Classification: #{result[:classification]['primaryType']}"
```

### cURL (Command Line)

```bash
#!/bin/bash

API_BASE="http://localhost:3000/api/v1"
API_KEY="test-api-key-12345"

# Create conversation
CONV_ID=$(curl -s -X POST "$API_BASE/conversations" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "Your account has been compromised!"}' \
  | jq -r '.conversationId')

echo "Conversation ID: $CONV_ID"

# Get conversation details
curl -s "$API_BASE/conversations/$CONV_ID" \
  -H "X-API-Key: $API_KEY" \
  | jq '{riskScore, classification, entities: .extractedEntities}'

# Get report
curl -s "$API_BASE/reports/$CONV_ID" \
  -H "X-API-Key: $API_KEY" \
  | jq .
```

---

## Webhooks & Real-time

### Polling for Updates

Since webhooks aren't built-in yet, poll for conversation updates:

```javascript
async function pollConversation(conversationId, interval = 2000) {
  const client = new ScamIntelligenceClient();
  
  const poll = setInterval(async () => {
    const conv = await client.client.get(`/conversations/${conversationId}`);
    
    console.log('Risk Score:', conv.data.riskScore);
    
    // Stop polling if terminated
    if (conv.data.state === 'termination') {
      clearInterval(poll);
      console.log('Conversation terminated');
    }
  }, interval);
}
```

### Adding Webhooks (Future Enhancement)

To add webhook support, you'd need to:
1. Store webhook URLs per API key
2. Trigger POST requests on conversation events
3. Include conversation data in webhook payload

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": "Error message here",
  "details": "Additional context"
}
```

### Example Error Handling

```javascript
try {
  const result = await client.analyzeMessage(message);
  console.log('Success:', result);
} catch (error) {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        console.error('Invalid API key');
        break;
      case 429:
        console.error('Rate limit exceeded, retry later');
        break;
      case 500:
        console.error('Server error:', error.response.data);
        break;
      default:
        console.error('Error:', error.response.data);
    }
  } else {
    console.error('Network error:', error.message);
  }
}
```

---

## Best Practices

### 1. Rate Limiting

The API has rate limits (100 requests per 15 minutes per IP). Implement exponential backoff:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### 2. Batch Processing

Process multiple messages efficiently:

```javascript
async function analyzeBatch(messages) {
  const results = await Promise.all(
    messages.map(msg => client.analyzeMessage(msg))
  );
  return results;
}
```

### 3. Caching

Cache reports to reduce API calls:

```javascript
const reportCache = new Map();

async function getCachedReport(conversationId) {
  if (reportCache.has(conversationId)) {
    return reportCache.get(conversationId);
  }
  
  const report = await client.getReport(conversationId);
  reportCache.set(conversationId, report);
  return report;
}
```

### 4. Monitoring

Track API usage and errors:

```javascript
class MonitoredClient extends ScamIntelligenceClient {
  constructor(apiKey) {
    super(apiKey);
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0
    };
  }
  
  async analyzeMessage(message, context) {
    const start = Date.now();
    this.metrics.requests++;
    
    try {
      const result = await super.analyzeMessage(message, context);
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime + (Date.now() - start)) / 2;
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
}
```

### 5. Security

- **Never expose API keys** in client-side code
- **Use environment variables** for API keys
- **Implement server-side proxy** for web apps
- **Rotate API keys** regularly
- **Use HTTPS** in production

---

## Next Steps

1. **Test the integration** with sample scam messages
2. **Monitor API usage** and response times
3. **Implement error handling** and retries
4. **Add logging** for debugging
5. **Scale** as needed with load balancing

For more examples, see `GETTING_STARTED.md`.
