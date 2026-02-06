# Implementation Plan: Agentic Scam Intelligence System

## Overview

This implementation plan breaks down the Agentic Scam Intelligence System into discrete coding tasks. The system will be built as a TypeScript/Node.js API service with a modular architecture. Tasks are ordered to build foundational components first, then integrate them into the complete system. Each task includes property-based tests to verify correctness properties from the design document.

## Tasks

- [x] 1. Set up project structure and core type definitions
  - Initialize TypeScript project with appropriate configuration
  - Create directory structure (src/api, src/agents, src/nlp, src/scoring, src/persistence, src/types)
  - Define core TypeScript interfaces and types from design document
  - Set up testing framework (Jest) and property-based testing library (fast-check)
  - Configure linting and code formatting
  - _Requirements: All requirements (foundational)_

- [ ] 2. Implement State Machine
  - [x] 2.1 Create StateMachine class with state transition logic
    - Implement state definitions (InitialContact, TrustBuilding, InformationGathering, Extraction, Termination)
    - Implement event-driven state transitions with validation
    - Implement terminal state detection
    - Track state transition history with timestamps
    - _Requirements: 2.2, 2.4_
  
  - [x] 2.2 Write property test for valid state transitions
    - **Property 6: Valid State Transitions**
    - **Validates: Requirements 2.2**
  
  - [x] 2.3 Write unit tests for state machine edge cases
    - Test invalid transitions are rejected
    - Test terminal state behavior
    - _Requirements: 2.2, 2.4_

- [ ] 3. Implement Persona Management
  - [x] 3.1 Create Persona class and persona profiles
    - Define persona profile structure (age, occupation, technical sophistication, vulnerability factors)
    - Implement response pattern configuration (typing speed, error rate, vocabulary)
    - Create persona selection logic based on scam context
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 Implement response timing simulation
    - Calculate human-like delays based on message length and persona typing speed
    - Add natural variation to timing
    - _Requirements: 1.4_
  
  - [~] 3.3 Write property test for persona selection appropriateness
    - **Property 1: Persona Selection Appropriateness**
    - **Validates: Requirements 1.1**
  
  - [~] 3.4 Write property test for persona response consistency
    - **Property 2: Persona Response Consistency**
    - **Validates: Requirements 1.2, 1.3**
  
  - [ ] 3.5 Write property test for human-like response timing
    - **Property 3: Human-like Response Timing**
    - **Validates: Requirements 1.4**

- [ ] 4. Implement NLP Entity Extractor
  - [x] 4.1 Create NLPExtractor class with phone number extraction
    - Implement regex patterns for international phone numbers with country codes
    - Implement normalization to E.164 format
    - Calculate confidence scores based on format validity
    - _Requirements: 3.1, 3.5_
  
  - [x] 4.2 Implement payment identifier extraction
    - Add patterns for UPI IDs, wallet addresses, bank account numbers
    - Implement payment type categorization
    - Normalize payment identifiers
    - _Requirements: 3.2, 3.5_
  
  - [x] 4.3 Implement URL and domain extraction
    - Add patterns for URLs and domain names
    - Normalize URLs (protocol, trailing slashes)
    - Extract domain from full URLs
    - _Requirements: 3.3, 3.5_
  
  - [x] 4.4 Implement organization name extraction
    - Add NER (Named Entity Recognition) for organization names
    - Detect brand impersonation patterns
    - _Requirements: 3.4, 3.5_
  
  - [x] 4.5 Add multi-language support
    - Implement language detection
    - Add regional format variations for entities
    - _Requirements: 3.6_
  
  - [ ] 4.6 Write property test for phone number extraction
    - **Property 10: Phone Number Extraction**
    - **Validates: Requirements 3.1**
  
  - [ ] 4.7 Write property test for payment identifier extraction
    - **Property 11: Payment Identifier Extraction**
    - **Validates: Requirements 3.2**
  
  - [ ] 4.8 Write property test for URL extraction
    - **Property 12: URL Extraction**
    - **Validates: Requirements 3.3**
  
  - [ ] 4.9 Write property test for organization name extraction
    - **Property 13: Organization Name Extraction**
    - **Validates: Requirements 3.4**
  
  - [ ] 4.10 Write property test for entity normalization and confidence
    - **Property 14: Entity Normalization and Confidence**
    - **Validates: Requirements 3.5**
  
  - [ ] 4.11 Write property test for multi-language entity extraction
    - **Property 15: Multi-language Entity Extraction**
    - **Validates: Requirements 3.6**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Scam Signal Detector
  - [x] 6.1 Create ScamSignalDetector class
    - Implement urgency indicator detection (time pressure, threats, limited offers)
    - Implement authority impersonation detection (government, bank, tech support)
    - Implement payment request pattern detection
    - Implement social engineering tactic detection (fear, greed, curiosity)
    - Record signal type, confidence, evidence, timestamp, and message reference
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 6.2 Write property test for urgency signal detection
    - **Property 16: Urgency Signal Detection**
    - **Validates: Requirements 4.1**
  
  - [ ] 6.3 Write property test for authority impersonation detection
    - **Property 17: Authority Impersonation Detection**
    - **Validates: Requirements 4.2**
  
  - [ ] 6.4 Write property test for payment request detection
    - **Property 18: Payment Request Detection**
    - **Validates: Requirements 4.3**
  
  - [ ] 6.5 Write property test for social engineering tactic detection
    - **Property 19: Social Engineering Tactic Detection**
    - **Validates: Requirements 4.4**
  
  - [ ] 6.6 Write property test for signal recording completeness
    - **Property 20: Signal Recording Completeness**
    - **Validates: Requirements 4.5**

- [ ] 7. Implement Scam Classifier
  - [x] 7.1 Create ScamClassifier class
    - Implement classification logic for scam types (phishing, tech support, romance, investment, impersonation, refund, lottery)
    - Implement confidence score calculation
    - Support multi-label classification
    - Implement classification update logic as conversation progresses
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 7.2 Write property test for scam type classification
    - **Property 21: Scam Type Classification**
    - **Validates: Requirements 5.1**
  
  - [ ] 7.3 Write property test for classification confidence scores
    - **Property 22: Classification Confidence Scores**
    - **Validates: Requirements 5.2**
  
  - [ ] 7.4 Write property test for multi-label classification
    - **Property 23: Multi-label Classification**
    - **Validates: Requirements 5.3**
  
  - [ ] 7.5 Write property test for classification evolution
    - **Property 24: Classification Evolution**
    - **Validates: Requirements 5.4**

- [ ] 8. Implement Risk Scorer
  - [x] 8.1 Create RiskScorer class
    - Implement sophistication level scoring
    - Implement financial impact scoring
    - Implement entity volume scoring
    - Implement social engineering aggression scoring
    - Implement impersonation severity scoring
    - Normalize overall score to 0-100 range
    - Generate factor breakdown for explainability
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ] 8.2 Write property test for risk score monotonicity
    - **Property 25: Risk Score Monotonicity**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [ ] 8.3 Write property test for risk score bounds
    - **Property 26: Risk Score Bounds**
    - **Validates: Requirements 6.5**
  
  - [ ] 8.4 Write property test for risk score explainability
    - **Property 27: Risk Score Explainability**
    - **Validates: Requirements 6.6**

- [ ] 9. Implement Agent Instance
  - [x] 9.1 Create Agent class
    - Implement conversation lifecycle management
    - Integrate state machine for state tracking
    - Implement message processing pipeline (extract entities, detect signals)
    - Implement response generation with persona consistency
    - Implement conversation isolation (separate contexts)
    - _Requirements: 1.2, 1.3, 1.5, 2.1, 2.2, 2.3_
  
  - [x] 9.2 Implement response generation logic
    - Generate contextually appropriate responses based on state
    - Maintain persona consistency in responses
    - Simulate human-like response patterns
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [ ] 9.3 Write property test for conversation isolation
    - **Property 4: Conversation Isolation**
    - **Validates: Requirements 1.5**
  
  - [ ] 9.4 Write property test for terminal state finalization
    - **Property 7: Terminal State Finalization**
    - **Validates: Requirements 2.3**
  
  - [ ] 9.5 Write property test for state transition tracking
    - **Property 8: State Transition Tracking**
    - **Validates: Requirements 2.4**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Agent Controller
  - [x] 11.1 Create AgentController class
    - Implement agent pool management
    - Implement agent creation for new conversations
    - Implement message routing to appropriate agents
    - Implement agent termination
    - Implement stalled conversation detection and handling
    - _Requirements: 2.1, 2.5_
  
  - [ ] 11.2 Write property test for automatic engagement initiation
    - **Property 5: Automatic Engagement Initiation**
    - **Validates: Requirements 2.1**
  
  - [ ] 11.3 Write property test for stalled conversation handling
    - **Property 9: Stalled Conversation Handling**
    - **Validates: Requirements 2.5**

- [ ] 12. Implement Report Generator
  - [x] 12.1 Create ReportGenerator class
    - Aggregate all intelligence data (entities, classifications, risk scores, signals, metadata)
    - Generate structured JSON intelligence reports
    - Include full conversation transcript with annotations
    - Implement JSON schema validation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ] 12.2 Write property test for report generation on completion
    - **Property 28: Report Generation on Completion**
    - **Validates: Requirements 7.1**
  
  - [ ] 12.3 Write property test for report completeness
    - **Property 29: Report Completeness**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6**
  
  - [ ] 12.4 Write property test for report schema validation (round-trip)
    - **Property 30: Report Schema Validation**
    - **Validates: Requirements 7.7**

- [ ] 13. Implement Persistence Layer
  - [x] 13.1 Create persistence interfaces and implementations
    - Define storage interfaces for conversations, entities, and reports
    - Implement conversation state persistence
    - Implement entity storage
    - Implement report storage
    - Implement transactional operations for data integrity
    - _Requirements: 9.1, 9.3, 9.4_
  
  - [x] 13.2 Implement conversation recovery logic
    - Implement state restoration from persisted data
    - Handle system restart scenarios
    - _Requirements: 9.2_
  - [ ] 13.3 Write property test for state change persistence
    - **Property 36: State Change Persistence**
    - **Validates: Requirements 9.1**
  
  - [ ] 13.4 Write property test for conversation state recovery (round-trip)
    - **Property 37: Conversation State Recovery**
    - **Validates: Requirements 9.2**
  
  - [ ] 13.5 Write property test for persistence completeness
    - **Property 38: Persistence Completeness**
    - **Validates: Requirements 9.3**
  
  - [ ] 13.6 Write property test for report persistence (round-trip)
    - **Property 39: Report Persistence**
    - **Validates: Requirements 9.4**

- [-] 14. Implement Safety and Termination Controls
  - [x] 14.1 Add safety checks to Agent class
    - Implement maximum duration timeout detection
    - Implement illegal request detection
    - Ensure intelligence preservation on termination
    - Implement safety invariant checks (no real information disclosure)
    - Implement termination finality (prevent re-engagement)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 14.2 Write property test for duration timeout termination
    - **Property 40: Duration Timeout Termination**
    - **Validates: Requirements 10.1**
  
  - [ ] 14.3 Write property test for illegal request termination
    - **Property 41: Illegal Request Termination**
    - **Validates: Requirements 10.2**
  
  - [ ] 14.4 Write property test for intelligence preservation on termination
    - **Property 42: Intelligence Preservation on Termination**
    - **Validates: Requirements 10.3**
  
  - [ ] 14.5 Write property test for safety invariant
    - **Property 43: Safety Invariant - No Real Information Disclosure**
    - **Validates: Requirements 10.4**
  
  - [ ] 14.6 Write property test for termination finality
    - **Property 44: Termination Finality**
    - **Validates: Requirements 10.5**

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement API Gateway
  - [x] 16.1 Set up Express.js API server
    - Initialize Express application
    - Configure middleware (body parser, CORS, logging)
    - Set up error handling middleware
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [x] 16.2 Implement authentication and authorization middleware
    - Implement API key or JWT authentication
    - Implement authorization checks
    - _Requirements: 8.5_
  
  - [x] 16.3 Implement rate limiting middleware
    - Configure rate limiting per client
    - Return HTTP 429 for rate limit violations
    - _Requirements: 8.8_
  
  - [x] 16.4 Implement conversation endpoints
    - POST /api/v1/conversations - Create new conversation
    - GET /api/v1/conversations/:id - Get conversation details
    - GET /api/v1/conversations/:id/status - Get conversation status
    - POST /api/v1/conversations/:id/messages - Send message to conversation
    - DELETE /api/v1/conversations/:id - Terminate conversation
    - _Requirements: 8.1, 8.4_
  
  - [x] 16.5 Implement report endpoints
    - GET /api/v1/reports/:id - Get report by ID
    - GET /api/v1/reports - Query reports with filters
    - Implement pagination for list endpoint
    - _Requirements: 8.2, 8.3, 8.7_
  
  - [x] 16.6 Implement request validation
    - Validate request parameters and body
    - Return descriptive error messages for validation failures
    - _Requirements: 8.6_
  
  - [ ] 16.7 Write unit tests for API endpoint contracts
    - Test endpoint existence and basic functionality
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ] 16.8 Write property test for query filter correctness
    - **Property 31: Query Filter Correctness**
    - **Validates: Requirements 8.3**
  
  - [ ] 16.9 Write property test for authentication enforcement
    - **Property 32: Authentication Enforcement**
    - **Validates: Requirements 8.5**
  
  - [ ] 16.10 Write property test for validation error responses
    - **Property 33: Validation Error Responses**
    - **Validates: Requirements 8.6**
  
  - [ ] 16.11 Write property test for pagination correctness
    - **Property 34: Pagination Correctness**
    - **Validates: Requirements 8.7**
  
  - [ ] 16.12 Write property test for rate limiting enforcement
    - **Property 35: Rate Limiting Enforcement**
    - **Validates: Requirements 8.8**

- [ ] 17. Integration and Wiring
  - [x] 17.1 Wire all components together
    - Connect API Gateway to Agent Controller
    - Connect Agent Controller to Agent instances
    - Connect Agents to NLP Extractor, Scam Classifier, Risk Scorer
    - Connect all components to Persistence Layer
    - Connect Report Generator to all data sources
    - _Requirements: All requirements_
  
  - [ ] 17.2 Implement dependency injection container
    - Set up DI container for component lifecycle management
    - Configure component dependencies
    - _Requirements: All requirements_
  
  - [x] 17.3 Add comprehensive logging
    - Log all state transitions
    - Log all entity extractions
    - Log all API requests
    - Log all errors with context
    - _Requirements: All requirements_
  
  - [x] 17.4 Write integration tests for end-to-end flows
    - Test complete conversation flow for each scam type
    - Test API to report generation pipeline
    - _Requirements: All requirements_

- [ ] 18. Final Checkpoint - Ensure all tests pass
  - Run full test suite (unit tests, property tests, integration tests)
  - Verify all 44 correctness properties are implemented and passing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations each
- Unit tests validate specific examples, edge cases, and integration points
- Checkpoints ensure incremental validation throughout development
- The implementation uses TypeScript for type safety and Express.js for the API layer
- Property-based testing uses fast-check library
- All 44 correctness properties from the design document are covered by property tests
