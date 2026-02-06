# 🛡️ Scam Intelligence System - Overview

## What You Have

A fully functional scam detection API running locally with Docker.

## Core Services

- **API Server** (http://localhost:3000) - REST API for scam detection
- **PostgreSQL** (localhost:5432) - Database for conversations and reports
- **Redis** (localhost:6379) - Rate limiting and caching

## Essential Files

### Documentation
- `README.md` - Full project documentation
- `START_HERE.md` - Quick start guide
- `LOCAL_DEPLOYMENT.md` - Deployment details
- `GETTING_STARTED.md` - API usage examples

### Configuration
- `docker-compose.yml` - Docker services configuration
- `package.json` - Node.js dependencies
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template

### Source Code
- `src/` - All application code
  - `api/` - REST API endpoints and middleware
  - `agents/` - Conversation agents and state machine
  - `nlp/` - Entity extraction and signal detection
  - `scoring/` - Risk scoring and classification
  - `reporting/` - Intelligence report generation
  - `persistence/` - Database repositories
  - `types/` - TypeScript type definitions

### Testing
- `test-local-deployment.sh` - Automated deployment test
- All `*.test.ts` files - Unit and integration tests

## Quick Commands

```bash
# Start system
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api

# Stop system
docker-compose down

# Test API
curl http://localhost:3000/health

# Run tests
npm test
```

## API Usage

```bash
# Create conversation
curl -X POST http://localhost:3000/api/v1/conversations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key-12345" \
  -d '{"initialMessage": "Your account has been compromised!"}'

# Get conversation details
curl http://localhost:3000/api/v1/conversations/{id} \
  -H "X-API-Key: test-api-key-12345"

# List reports
curl http://localhost:3000/api/v1/reports \
  -H "X-API-Key: test-api-key-12345"
```

## What Was Removed

Cleaned up unnecessary files:
- ❌ Monitoring stack (Prometheus, Grafana, Loki)
- ❌ Cloud deployment configs (AWS, Kubernetes)
- ❌ Dashboard UI (React frontend)
- ❌ Extra documentation files

## System Status

✅ Core scam detection working
✅ Entity extraction (phone, URL, payment IDs)
✅ Risk scoring and classification
✅ Intelligence report generation
✅ REST API with authentication
✅ Database persistence
✅ 300+ tests passing

## Next Steps

1. Test with different scam messages (see GETTING_STARTED.md)
2. Integrate with your application via REST API
3. Customize personas and detection rules
4. Add more scam types or entity extractors
