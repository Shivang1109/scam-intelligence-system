/**
 * API Service Interfaces
 */

import {
  ConversationRequest,
  ConversationResponse,
  ConversationStatus,
  ConversationList,
  IntelligenceReport,
  TerminationResponse,
  HealthStatus,
  SystemMetrics,
} from '../types';

export interface APIService {
  initiateConversation(request: ConversationRequest): Promise<ConversationResponse>;
  getConversationStatus(conversationId: string): Promise<ConversationStatus>;
  getIntelligenceReport(conversationId: string): Promise<IntelligenceReport>;
  listConversations(page: number, pageSize: number): Promise<ConversationList>;
  terminateConversation(conversationId: string): Promise<TerminationResponse>;
  getHealth(): Promise<HealthStatus>;
  getMetrics(): Promise<SystemMetrics>;
}
