# 🛡️ Scam Intelligence System

An intelligent, agentic system for detecting and analyzing scam conversations in real-time. The system uses conversational AI agents to engage with potential scammers, extract intelligence, and generate comprehensive threat reports.

## ✨ Features

- **🤖 Intelligent Agents**: Persona-based conversational agents that adapt to scam contexts
- **🔍 Entity Extraction**: Automatically extracts phone numbers, payment IDs, URLs, and organizations
- **⚠️ Scam Detection**: Real-time detection of urgency signals, impersonation, and social engineering
- **📊 Risk Scoring**: Multi-factor risk assessment with explainable scoring
- **📝 Intelligence Reports**: Comprehensive JSON reports with full conversation transcripts
- **🔐 Production Ready**: Authentication, rate limiting, and structured logging
- **🐳 Docker Support**: Easy deployment with Docker and Docker Compose
- **💾 Database Persistence**: PostgreSQL support for production scale

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd scam-intelligence-system

# Start all services
docker-compose up -d

# Check health
curl http://localhost:3000/health
```

### Manual Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Start
npm start
```

## 📖 API Documentation

### Authentication

All API requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/v1/conversations
```

### Endpoints

#### Create Conversation
```bash
POST /api/v1/conversations
Content-Type: application/json

{
  "initialMessage": "Your bank account has been compromised!"
}
```

#### Send Message
```bash
POST /api/v1/conversations/:id/messages
Content-Type: application/json

{
  "message": "Please verify your account"
}
```

#### Get Conversation
```bash
GET /api/v1/conversations/:id
```

#### Get Report
```bash
GET /api/v1/reports/:id
```

#### List Reports
```bash
GET /api/v1/reports?page=1&pageSize=10
```

## 🏗️ Architecture

```
┌─────────────────┐
│   API Gateway   │  ← Express.js REST API
└────────┬────────┘
         │
┌────────▼────────┐
│ Agent Controller│  ← Manages conversation agents
└────────┬────────┘
         │
    ┌────▼────┐
    │  Agent  │  ← Individual conversation handler
    └────┬────┘
         │
    ┌────▼────────────────────────┐
    │  NLP  │ Scoring │ Reporting │
    └─────────────────────────────┘
         │
    ┌────▼────────┐
    │ Persistence │  ← PostgreSQL/In-Memory
    └─────────────┘
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- StateMachine

# Run integration tests
npm test -- integration
```

## 📊 Monitoring

### Structured Logging

All logs are output in JSON format:

```json
{
  "timestamp": "2026-02-07T00:00:00.000Z",
  "level": "info",
  "message": "State transition",
  "conversationId": "abc-123",
  "component": "StateMachine",
  "fromState": "INITIAL_CONTACT",
  "toState": "ENGAGEMENT"
}
```

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T00:00:00.000Z",
  "uptime": 12345
}
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `NODE_ENV`: Environment (production/development)
- `PORT`: API port (default: 3000)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `DB_HOST`: PostgreSQL host
- `DB_PASSWORD`: Database password

## 📦 Project Files

- **START_HERE.md** - Quick start guide for local deployment
- **LOCAL_DEPLOYMENT.md** - Detailed local deployment instructions
- **GETTING_STARTED.md** - API usage examples and testing
- **README.md** - This file
- **.kiro/specs/** - Design specifications and requirements

## 🛠️ Development

### Project Structure

```
src/
├── agents/          # Conversation agents and state machine
├── api/             # REST API and middleware
├── nlp/             # Entity extraction and signal detection
├── scoring/         # Risk scoring and classification
├── reporting/       # Intelligence report generation
├── persistence/     # Data repositories
├── types/           # TypeScript type definitions
└── utils/           # Utilities and helpers
```

### Adding New Features

1. Update requirements in `.kiro/specs/scam-intelligence-system/requirements.md`
2. Update design in `.kiro/specs/scam-intelligence-system/design.md`
3. Add tasks to `.kiro/specs/scam-intelligence-system/tasks.md`
4. Implement with tests
5. Update documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with:
- TypeScript
- Express.js
- PostgreSQL
- Jest
- Docker

An AI-powered honeypot designed to autonomously interact with scammers and extract structured intelligence.

## Overview

The Scam Intelligence System simulates vulnerable personas to engage scammers in conversation, detects scam signals, extracts key entities (phone numbers, payment IDs, URLs, fake organizations), classifies scam types, and generates risk scores. The system operates as an API-first backend service, producing structured JSON reports for cybercrime teams, telecom fraud detection units, and messaging platforms.

## Features

- **Autonomous Conversation Management**: Engages with scammers without manual intervention
- **Persona Simulation**: Maintains convincing vulnerable personas throughout conversations
- **Entity Extraction**: Identifies and extracts phone numbers, payment IDs, URLs, organizations, bank accounts, and emails
- **Scam Signal Detection**: Detects urgency language, financial requests, impersonation, and threats
- **Scam Classification**: Categorizes scams into types (phishing, romance, investment, tech support, etc.)
- **Risk Scoring**: Calculates risk scores (0-100) based on multiple factors
- **Structured Reporting**: Generates comprehensive JSON intelligence reports
- **REST API**: Full API interface for system integration

## Architecture

The system follows a layered architecture:

- **API Service Layer**: HTTP endpoints, authentication, rate limiting
- **Conversation Management Layer**: Agent controller and state machine
- **Intelligence Extraction Layer**: NLP extractor and signal detector
- **Analysis Layer**: Scam classifier and risk scorer
- **Reporting Layer**: Report generation and data persistence

## Project Structure

```
src/
├── api/              # API service layer
├── agents/           # Agent controller and state machine
├── nlp/              # NLP extractor and signal detector
├── scoring/          # Scam classifier and risk scorer
├── persistence/      # Data storage interfaces
├── reporting/        # Report generator
├── types/            # Core type definitions
└── index.ts          # Main entry point
```

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Run in development mode
npm run dev

# Run production build
npm start
```

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Validate specific examples, edge cases, and integration points
- **Property-Based Tests**: Verify universal correctness properties using fast-check

All 37+ correctness properties from the design document are covered by property-based tests.

## Configuration

Configuration files:

- `tsconfig.json`: TypeScript compiler configuration
- `jest.config.js`: Jest testing framework configuration
- `.eslintrc.js`: ESLint linting rules
- `.prettierrc.js`: Prettier code formatting rules

## Requirements

- Node.js 18+ or 20+
- TypeScript 5.3+
- npm or yarn

## License

MIT

## Documentation

For detailed design and requirements documentation, see:

- `.kiro/specs/scam-intelligence-system/requirements.md`
- `.kiro/specs/scam-intelligence-system/design.md`
- `.kiro/specs/scam-intelligence-system/tasks.md`
