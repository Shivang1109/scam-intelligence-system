# 🚀 Local Deployment Guide

## Step 1: Install Docker (5 minutes)

### For macOS (You're on macOS):

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop
   - Click "Download for Mac"
   - Choose your chip (Intel or Apple Silicon/M1/M2)

2. **Install**
   - Open the downloaded .dmg file
   - Drag Docker to Applications
   - Open Docker from Applications
   - Follow the setup wizard

3. **Verify Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

## Step 2: Deploy Your System (2 minutes)

Once Docker is installed:

```bash
# 1. Make sure you're in the project directory
cd /path/to/scam-intelligence-system

# 2. Start everything
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f api
```

## Step 3: Test Your API (1 minute)

```bash
# Health check
curl http://localhost:3000/health

# Create a conversation
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "initialMessage": "URGENT: Your bank account has been compromised! Click here: http://fake-bank.com"
  }'

# You'll get back a conversation ID - save it!
```

## Step 4: Access Services

Once running, you can access:

- **API**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api/v1
- **Grafana** (if monitoring enabled): http://localhost:3001
- **Prometheus** (if monitoring enabled): http://localhost:9090

## Step 5: Test a Complete Flow

```bash
# 1. Create conversation
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/conversations \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"initialMessage": "Your bank account has been compromised!"}')

# 2. Extract conversation ID
CONV_ID=$(echo $RESPONSE | grep -o '"conversationId":"[^"]*"' | cut -d'"' -f4)
echo "Conversation ID: $CONV_ID"

# 3. Send a follow-up message
curl -X POST "http://localhost:3000/api/v1/conversations/$CONV_ID/messages" \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"message": "Please send payment to UPI: scammer@paytm"}' | jq

# 4. Get conversation details
curl "http://localhost:3000/api/v1/conversations/$CONV_ID" \
  -H "X-API-Key: test-api-key-12345" | jq

# 5. Terminate conversation
curl -X DELETE "http://localhost:3000/api/v1/conversations/$CONV_ID" \
  -H "X-API-Key: test-api-key-12345" | jq

# 6. Get intelligence report
curl "http://localhost:3000/api/v1/reports/$CONV_ID" \
  -H "X-API-Key: test-api-key-12345" | jq
```

## Optional: Enable Monitoring

To also start Prometheus and Grafana:

```bash
# Start with monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3001
# Login: admin / admin
```

## Useful Commands

```bash
# View logs
docker-compose logs -f api          # API logs
docker-compose logs -f postgres     # Database logs
docker-compose logs -f              # All logs

# Check status
docker-compose ps

# Restart services
docker-compose restart api

# Stop everything
docker-compose down

# Stop and remove data
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
```

### Docker Not Starting
```bash
# Make sure Docker Desktop is running
open -a Docker

# Wait for Docker to start (check menu bar icon)
```

### Database Connection Issues
```bash
# Check database is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# View database logs
docker-compose logs postgres
```

### API Not Responding
```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api

# Check if port is accessible
curl http://localhost:3000/health
```

## What's Running?

After `docker-compose up -d`, you'll have:

1. **PostgreSQL Database** (port 5432)
   - Stores conversations, entities, reports
   - Persistent data in Docker volume

2. **Redis Cache** (port 6379)
   - Caching layer (optional)
   - Session storage

3. **Scam Intelligence API** (port 3000)
   - REST API endpoints
   - Conversation management
   - Intelligence extraction

## Next Steps

1. ✅ Install Docker Desktop
2. ✅ Run `docker-compose up -d`
3. ✅ Test the API
4. ✅ Try different scam types
5. ✅ View the logs
6. ✅ Check the reports

## Need Help?

If you get stuck:
1. Check Docker Desktop is running (menu bar icon)
2. Check logs: `docker-compose logs -f`
3. Restart: `docker-compose restart`
4. Full reset: `docker-compose down -v && docker-compose up -d`

## Success! 🎉

Once you see:
```
✅ All components initialized successfully
🚀 Scam Intelligence System API server running on port 3000
```

Your system is ready! Start sending scam conversations and collecting intelligence.
