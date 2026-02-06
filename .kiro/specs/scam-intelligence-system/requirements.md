# Requirements Document

## Introduction

The Scam Intelligence System is an AI-powered honeypot designed to autonomously interact with scammers and extract structured intelligence. The system simulates vulnerable personas to engage scammers in conversation, detects scam signals, extracts key entities (phone numbers, payment IDs, URLs, fake organizations), classifies scam types, and generates risk scores. The system operates as an API-first backend service, producing structured JSON reports for cybercrime teams, telecom fraud detection units, and messaging platforms.

## Glossary

- **System**: The Scam Intelligence System
- **Agent_Controller**: The component responsible for managing conversation agents
- **State_Machine**: The conversation flow management component
- **NLP_Extractor**: The natural language processing component that extracts entities
- **Scam_Classifier**: The component that categorizes scam types
- **Risk_Scorer**: The component that calculates risk scores
- **Report_Generator**: The component that produces structured intelligence reports
- **Persona**: A simulated vulnerable user profile used to engage scammers
- **Scam_Signal**: An indicator or pattern that suggests scam activity
- **Entity**: A structured piece of information extracted from conversations (phone number, payment ID, URL, organization name)
- **Intelligence_Report**: A structured JSON document containing extracted scam information
- **API_Service**: The REST API interface for system interaction

## Requirements

### Requirement 1: Persona Simulation

**User Story:** As a cybercrime analyst, I want the system to simulate vulnerable personas convincingly, so that scammers engage naturally and reveal their tactics.

#### Acceptance Criteria

1. THE System SHALL maintain a library of at least 5 distinct persona profiles with unique characteristics
2. WHEN a conversation is initiated, THE Agent_Controller SHALL select an appropriate persona based on the scam context
3. WHEN generating responses, THE System SHALL maintain consistency with the selected persona's characteristics throughout the conversation
4. THE System SHALL generate responses that reflect the persona's vulnerability level, communication style, and background
5. WHEN a persona responds, THE System SHALL include realistic delays and typing patterns to simulate human behavior

### Requirement 2: Autonomous Conversation Management

**User Story:** As a fraud detection unit, I want the system to autonomously engage with scammers, so that we can gather intelligence without manual intervention.

#### Acceptance Criteria

1. WHEN a scam conversation is detected, THE Agent_Controller SHALL initiate engagement automatically
2. THE State_Machine SHALL manage conversation flow through defined states (initial_contact, engagement, information_gathering, extraction, termination)
3. WHEN in a conversation state, THE System SHALL generate contextually appropriate responses without human input
4. WHEN a conversation reaches a natural conclusion or extraction goal, THE State_Machine SHALL transition to termination state
5. THE System SHALL handle multiple concurrent conversations independently
6. WHEN a conversation becomes unproductive, THE System SHALL terminate it gracefully within 10 exchanges

### Requirement 3: Entity Extraction

**User Story:** As a telecom fraud analyst, I want the system to extract structured entities from conversations, so that I can identify scammer infrastructure and patterns.

#### Acceptance Criteria

1. WHEN a phone number appears in conversation text, THE NLP_Extractor SHALL identify and extract it with country code and format
2. WHEN a payment ID or transaction reference appears, THE NLP_Extractor SHALL extract and categorize it by payment system type
3. WHEN a URL appears, THE NLP_Extractor SHALL extract the full URL and identify the domain
4. WHEN an organization name is mentioned, THE NLP_Extractor SHALL extract it and flag it as potentially fake
5. THE NLP_Extractor SHALL extract bank account numbers when present in conversations
6. THE NLP_Extractor SHALL extract email addresses when present in conversations
7. WHEN multiple entities of the same type are present, THE NLP_Extractor SHALL extract all instances
8. THE System SHALL validate extracted entities against known formats and flag malformed entries

### Requirement 4: Scam Signal Detection

**User Story:** As a cybercrime investigator, I want the system to detect scam signals in real-time, so that conversations can be prioritized and classified accurately.

#### Acceptance Criteria

1. WHEN urgency language is detected (e.g., "act now", "limited time"), THE System SHALL flag it as a scam signal
2. WHEN requests for payment or financial information occur, THE System SHALL flag it as a high-priority scam signal
3. WHEN impersonation of authority figures or organizations is detected, THE System SHALL flag it as a scam signal
4. WHEN threats or fear-inducing language is used, THE System SHALL flag it as a scam signal
5. THE System SHALL maintain a confidence score for each detected scam signal
6. WHEN multiple scam signals are detected in a single conversation, THE System SHALL aggregate them for risk scoring

### Requirement 5: Scam Classification

**User Story:** As a fraud analyst, I want scams to be automatically classified by type, so that I can understand attack patterns and trends.

#### Acceptance Criteria

1. THE Scam_Classifier SHALL categorize scams into at least the following types: phishing, romance, investment, tech_support, impersonation, advance_fee, lottery
2. WHEN conversation content is analyzed, THE Scam_Classifier SHALL assign a primary scam type with confidence score
3. WHEN a scam exhibits characteristics of multiple types, THE Scam_Classifier SHALL assign secondary classifications
4. THE Scam_Classifier SHALL update classification as new information emerges during the conversation
5. THE System SHALL maintain classification accuracy above 80% based on validation data

### Requirement 6: Risk Scoring

**User Story:** As a security operations team, I want each scam to receive a risk score, so that we can prioritize high-threat cases for immediate action.

#### Acceptance Criteria

1. THE Risk_Scorer SHALL calculate a risk score between 0 and 100 for each conversation
2. WHEN calculating risk scores, THE Risk_Scorer SHALL consider: number of scam signals, entity types extracted, scam classification, urgency indicators, and financial request amounts
3. WHEN a conversation involves financial transactions above $1000, THE Risk_Scorer SHALL assign a minimum score of 70
4. WHEN multiple high-confidence scam signals are present, THE Risk_Scorer SHALL increase the score proportionally
5. THE System SHALL update risk scores in real-time as conversations progress
6. THE Risk_Scorer SHALL provide a breakdown of score components for transparency

### Requirement 7: Structured Report Generation

**User Story:** As an API consumer, I want structured JSON intelligence reports, so that I can integrate scam data into our analysis pipelines.

#### Acceptance Criteria

1. THE Report_Generator SHALL produce JSON reports containing: conversation_id, timestamp, persona_used, scam_classification, risk_score, extracted_entities, scam_signals, and conversation_transcript
2. WHEN a conversation concludes, THE Report_Generator SHALL generate a complete intelligence report within 5 seconds
3. THE System SHALL validate all JSON reports against a defined schema before output
4. WHEN entities are extracted, THE Report_Generator SHALL structure them by type with metadata (confidence, context, timestamp)
5. THE Report_Generator SHALL include conversation metadata: duration, message_count, state_transitions
6. THE System SHALL support report export in JSON format

### Requirement 8: API Service Interface

**User Story:** As a system integrator, I want a REST API to interact with the system, so that I can trigger conversations, retrieve reports, and monitor system status.

#### Acceptance Criteria

1. THE API_Service SHALL expose endpoints for: initiating conversations, retrieving intelligence reports, querying conversation status, and listing active conversations
2. WHEN an API request is received, THE System SHALL authenticate the request using API keys
3. WHEN a conversation initiation request is received, THE API_Service SHALL return a conversation_id within 2 seconds
4. WHEN a report retrieval request is received, THE API_Service SHALL return the structured JSON report if available
5. THE API_Service SHALL return appropriate HTTP status codes (200, 400, 401, 404, 500) based on request outcomes
6. THE API_Service SHALL support pagination for list endpoints with configurable page sizes
7. THE API_Service SHALL include rate limiting to prevent abuse (maximum 100 requests per minute per API key)
8. THE System SHALL log all API requests with timestamps and client identifiers

### Requirement 9: Conversation State Management

**User Story:** As a system operator, I want conversations to follow a defined state machine, so that the system behaves predictably and conversations can be monitored.

#### Acceptance Criteria

1. THE State_Machine SHALL implement the following states: idle, initial_contact, engagement, information_gathering, extraction, termination
2. WHEN a conversation is initiated, THE State_Machine SHALL begin in the initial_contact state
3. WHEN transitioning between states, THE State_Machine SHALL validate that the transition is allowed
4. THE State_Machine SHALL record all state transitions with timestamps
5. WHEN in the information_gathering state, THE System SHALL actively prompt for entity disclosure
6. WHEN extraction goals are met or conversation becomes unproductive, THE State_Machine SHALL transition to termination state
7. THE System SHALL persist conversation state to enable recovery after system restarts

### Requirement 10: System Monitoring and Logging

**User Story:** As a system administrator, I want comprehensive logging and monitoring, so that I can troubleshoot issues and track system performance.

#### Acceptance Criteria

1. THE System SHALL log all conversation events with timestamps, conversation_id, and event type
2. WHEN errors occur, THE System SHALL log error details including stack traces and context
3. THE System SHALL expose metrics for: active conversations, completed conversations, average risk scores, entity extraction rates, and API request rates
4. THE System SHALL maintain logs for a minimum of 90 days
5. WHEN system resources exceed 80% capacity, THE System SHALL log a warning
6. THE System SHALL support structured logging in JSON format for integration with log aggregation tools
