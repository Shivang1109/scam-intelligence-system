/**
 * Core type definitions for the Scam Intelligence System
 * Based on the design document interfaces
 */

// ============================================================================
// Enums
// ============================================================================

export enum ConversationState {
  IDLE = 'idle',
  INITIAL_CONTACT = 'initial_contact',
  ENGAGEMENT = 'engagement',
  INFORMATION_GATHERING = 'information_gathering',
  EXTRACTION = 'extraction',
  TERMINATION = 'termination',
}

export enum EntityType {
  PHONE_NUMBER = 'phone_number',
  PAYMENT_ID = 'payment_id',
  URL = 'url',
  ORGANIZATION = 'organization',
  BANK_ACCOUNT = 'bank_account',
  EMAIL = 'email',
}

export enum SignalType {
  URGENCY = 'urgency',
  FINANCIAL_REQUEST = 'financial_request',
  IMPERSONATION = 'impersonation',
  THREAT = 'threat',
  AUTHORITY_CLAIM = 'authority_claim',
}

export enum ScamType {
  PHISHING = 'phishing',
  ROMANCE = 'romance',
  INVESTMENT = 'investment',
  TECH_SUPPORT = 'tech_support',
  IMPERSONATION = 'impersonation',
  ADVANCE_FEE = 'advance_fee',
  LOTTERY = 'lottery',
}

// ============================================================================
// State Machine Types
// ============================================================================

export interface StateTransition {
  fromState: ConversationState;
  toState: ConversationState;
  timestamp: Date;
  reason: string;
}

export interface StateEvent {
  type: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Persona Types
// ============================================================================

export interface Persona {
  id: string;
  name: string;
  age: number;
  background: string;
  vulnerabilityLevel: number; // 1-10
  communicationStyle: string;
  typicalResponses: string[];
  characteristics: {
    techSavvy: number;
    trustLevel: number;
    financialAwareness: number;
    responseSpeed: number;
  };
}

export interface ConversationContext {
  initialMessage: string;
  detectedScamType?: ScamType;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Entity Types
// ============================================================================

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  context: string;
  timestamp: Date;
  metadata: {
    format?: string;
    validated: boolean;
    countryCode?: string; // for phone numbers
    domain?: string; // for URLs
    paymentSystem?: string; // for payment IDs
    [key: string]: unknown;
  };
}

export interface PhoneNumber extends Entity {
  type: EntityType.PHONE_NUMBER;
  metadata: Entity['metadata'] & {
    countryCode: string;
    format: string;
  };
}

export interface PaymentId extends Entity {
  type: EntityType.PAYMENT_ID;
  metadata: Entity['metadata'] & {
    paymentSystem: string;
  };
}

export interface URL extends Entity {
  type: EntityType.URL;
  metadata: Entity['metadata'] & {
    domain: string;
  };
}

export interface Organization extends Entity {
  type: EntityType.ORGANIZATION;
}

export interface BankAccount extends Entity {
  type: EntityType.BANK_ACCOUNT;
}

export interface Email extends Entity {
  type: EntityType.EMAIL;
}

// ============================================================================
// Scam Signal Types
// ============================================================================

export interface ScamSignal {
  type: SignalType;
  confidence: number;
  text: string;
  context: string;
  timestamp: Date;
}

// ============================================================================
// Classification Types
// ============================================================================

export interface ScamClassification {
  primaryType: ScamType;
  primaryConfidence: number;
  secondaryTypes: Array<{ type: ScamType; confidence: number }>;
  updatedAt: Date;
}

// ============================================================================
// Risk Scoring Types
// ============================================================================

export interface RiskScore {
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  calculatedAt: Date;
}

export interface ScoreBreakdown {
  signalScore: number;
  entityScore: number;
  classificationScore: number;
  urgencyScore: number;
  financialScore: number;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  sender: 'system' | 'scammer';
  content: string;
  timestamp: Date;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string;
  state: ConversationState;
  persona: Persona;
  messages: Message[];
  extractedEntities: Entity[];
  scamSignals: ScamSignal[];
  classification: ScamClassification | null;
  riskScore: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    initialMessage: string;
    messageCount: number;
    duration: number;
    stateHistory: StateTransition[];
  };
}

// ============================================================================
// Report Types
// ============================================================================

export interface IntelligenceReport {
  conversationId: string;
  timestamp: Date;
  persona: {
    id: string;
    name: string;
  };
  scamClassification: ScamClassification | null;
  riskScore: RiskScore;
  extractedEntities: Entity[];
  scamSignals: ScamSignal[];
  conversationMetadata: {
    duration: number;
    messageCount: number;
    stateTransitions: StateTransition[];
  };
  transcript: Message[];
}

// ============================================================================
// API Types
// ============================================================================

export interface ConversationRequest {
  initialMessage: string;
  context?: Record<string, unknown>;
}

export interface ConversationResponse {
  conversationId: string;
  status: string;
  message: string;
}

export interface ConversationStatus {
  conversationId: string;
  state: ConversationState;
  messageCount: number;
  riskScore: number;
  classification: ScamClassification | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationList {
  conversations: ConversationStatus[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface TerminationResponse {
  conversationId: string;
  status: string;
  message: string;
  finalReport?: IntelligenceReport;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    api: boolean;
    database: boolean;
    nlp: boolean;
  };
}

export interface SystemMetrics {
  activeConversations: number;
  completedConversations: number;
  averageRiskScore: number;
  entityExtractionRate: number;
  apiRequestRate: number;
  timestamp: Date;
}

// ============================================================================
// Response Type
// ============================================================================

export interface Response {
  content: string;
  delay: number; // milliseconds
  metadata?: Record<string, unknown>;
}
