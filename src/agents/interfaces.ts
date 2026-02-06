/**
 * Agent Controller and State Machine Interfaces
 */

import {
  Conversation,
  ConversationState,
  StateEvent,
  StateTransition,
  Response,
  Persona,
  ConversationContext,
} from '../types';

export interface AgentController {
  createConversation(initialMessage: string): Promise<Conversation>;
  processMessage(conversationId: string, message: string): Promise<Response>;
  getConversation(conversationId: string): Promise<Conversation>;
  terminateConversation(conversationId: string): Promise<void>;
  listActiveConversations(): Promise<Conversation[]>;
}

export interface StateMachine {
  getCurrentState(conversationId: string): ConversationState;
  transition(conversationId: string, event: StateEvent): ConversationState;
  getValidTransitions(currentState: ConversationState): ConversationState[];
  getStateHistory(conversationId: string): StateTransition[];
}

export interface PersonaManager {
  getPersona(personaId: string): Persona;
  selectPersona(context: ConversationContext): Persona;
  listPersonas(): Persona[];
  generateResponse(persona: Persona, context: string, intent: string): string;
}
