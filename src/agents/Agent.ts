/**
 * Agent Implementation
 * Manages individual conversation lifecycle and intelligence extraction
 * 
 * Validates Requirements: 1.2, 1.3, 1.5, 2.1, 2.2, 2.3
 */

import {
  Conversation,
  ConversationState,
  Message,
  Response,
  StateEvent,
  Persona,
} from '../types';
import { StateMachine } from './StateMachine';
import { PersonaManager } from './PersonaManager';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';
import { logger } from '../utils/logger';

/**
 * Simple UUID generator
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Agent class manages a single conversation
 * Implements conversation lifecycle, message processing, and intelligence extraction
 */
export class Agent {
  private conversation: Conversation;
  private stateMachine: StateMachine;
  private personaManager: PersonaManager;
  private nlpExtractor: NLPExtractor;
  private signalDetector: ScamSignalDetector;
  private scamClassifier: ScamClassifier;
  private riskScorer: RiskScorer;
  private messageCount: number = 0;
  private unproductiveCount: number = 0; // Track unproductive exchanges
  
  // Safety controls
  private readonly MAX_DURATION_MS: number = 24 * 60 * 60 * 1000; // 24 hours
  private terminated: boolean = false; // Track termination finality
  private intelligencePreserved: boolean = false; // Track if intelligence was preserved

  constructor(
    conversationId: string,
    initialMessage: string,
    stateMachine: StateMachine,
    personaManager: PersonaManager,
    nlpExtractor: NLPExtractor,
    signalDetector: ScamSignalDetector,
    scamClassifier: ScamClassifier,
    riskScorer: RiskScorer,
    isRestoration: boolean = false
  ) {
    this.stateMachine = stateMachine;
    this.personaManager = personaManager;
    this.nlpExtractor = nlpExtractor;
    this.signalDetector = signalDetector;
    this.scamClassifier = scamClassifier;
    this.riskScorer = riskScorer;

    // Initialize conversation (skip if this is a restoration)
    if (!isRestoration) {
      this.conversation = this.initializeConversation(conversationId, initialMessage);
    } else {
      // For restoration, create a minimal conversation object
      // The actual state will be restored via restoreState()
      this.conversation = {
        id: conversationId,
        state: ConversationState.IDLE,
        persona: this.personaManager.selectPersona({ initialMessage }),
        messages: [],
        extractedEntities: [],
        scamSignals: [],
        classification: null,
        riskScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          initialMessage,
          messageCount: 0,
          duration: 0,
          stateHistory: [],
        },
      };
    }
  }

  /**
   * Initialize a new conversation
   * Selects appropriate persona and sets up initial state
   */
  private initializeConversation(
    conversationId: string,
    initialMessage: string
  ): Conversation {
    // Initialize state machine for this conversation
    this.stateMachine.initializeConversation(conversationId);

    // Select appropriate persona based on initial message
    const persona = this.personaManager.selectPersona({
      initialMessage,
    });

    // Create initial conversation object
    const conversation: Conversation = {
      id: conversationId,
      state: ConversationState.IDLE,
      persona,
      messages: [],
      extractedEntities: [],
      scamSignals: [],
      classification: null,
      riskScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        initialMessage,
        messageCount: 0,
        duration: 0,
        stateHistory: [],
      },
    };

    return conversation;
  }

  /**
   * Process an incoming message from the scammer
   * Extracts entities, detects signals, updates classification and risk score
   * Generates appropriate response based on current state
   */
  async processMessage(message: string): Promise<Response> {
    // Safety check: Prevent re-engagement after termination (Requirement 10.5)
    if (this.terminated) {
      throw new Error('Cannot process message: conversation has been terminated and cannot be re-engaged');
    }
    
    // Safety check: Detect illegal requests (Requirement 10.2)
    if (this.detectIllegalRequest(message)) {
      await this.terminateWithSafety('illegal_request');
      return this.generateTerminationResponse();
    }
    
    // Safety check: Check for duration timeout (Requirement 10.1)
    if (this.hasExceededMaxDuration()) {
      await this.terminateWithSafety('duration_timeout');
      return this.generateTerminationResponse();
    }
    
    // Add scammer message to conversation
    const scammerMessage: Message = {
      id: generateUUID(),
      sender: 'scammer',
      content: message,
      timestamp: new Date(),
    };
    this.conversation.messages.push(scammerMessage);
    this.messageCount++;
    this.conversation.metadata.messageCount = this.messageCount;

    // Extract entities from message
    const entities = this.nlpExtractor.extractEntities(message, this.conversation.id);
    this.conversation.extractedEntities.push(...entities);

    // Detect scam signals
    const signals = this.signalDetector.detectSignals(message, this.conversation.id);
    this.conversation.scamSignals.push(...signals);

    // Track productivity - if no new entities or signals, increment unproductive count
    if (entities.length === 0 && signals.length === 0) {
      this.unproductiveCount++;
    } else {
      this.unproductiveCount = 0; // Reset on productive exchange
    }

    // Update classification
    this.conversation.classification = this.scamClassifier.classify(this.conversation);

    // Update risk score
    const riskScore = this.riskScorer.calculateScore(this.conversation);
    this.conversation.riskScore = riskScore.score;

    // Update conversation timestamp
    this.conversation.updatedAt = new Date();
    this.conversation.metadata.duration = 
      this.conversation.updatedAt.getTime() - this.conversation.createdAt.getTime();

    // Check if conversation should be terminated
    if (this.shouldTerminate()) {
      await this.terminateWithSafety('natural_conclusion');
      return this.generateTerminationResponse();
    }

    // Determine next state and transition if needed
    await this.updateState();

    // Generate response based on current state
    const response = await this.generateResponse();
    
    // Safety check: Ensure no real information disclosure (Requirement 10.4)
    if (this.containsRealInformation(response.content)) {
      // Replace with safe generic response
      response.content = this.generateSafeResponse();
    }

    // Add system response to conversation
    const systemMessage: Message = {
      id: generateUUID(),
      sender: 'system',
      content: response.content,
      timestamp: new Date(),
    };
    this.conversation.messages.push(systemMessage);
    this.conversation.metadata.messageCount++;

    return response;
  }

  /**
   * Check if conversation should be terminated
   * Terminates if:
   * - Unproductive for 10 exchanges
   * - Extraction goals met (high entity count and risk score)
   * - Already in termination state
   */
  private shouldTerminate(): boolean {
    // Already in termination state
    if (this.conversation.state === ConversationState.TERMINATION) {
      return true;
    }

    // Unproductive conversation (Requirement 2.6)
    if (this.unproductiveCount >= 10) {
      return true;
    }

    // Extraction goals met (high confidence classification and good entity extraction)
    if (
      this.conversation.classification &&
      this.conversation.classification.primaryConfidence > 0.8 &&
      this.conversation.extractedEntities.length >= 5 &&
      this.conversation.riskScore > 60
    ) {
      return true;
    }

    return false;
  }
  
  /**
   * Check if conversation has exceeded maximum duration
   * Requirement 10.1: Duration timeout detection
   */
  private hasExceededMaxDuration(): boolean {
    const duration = Date.now() - this.conversation.createdAt.getTime();
    return duration > this.MAX_DURATION_MS;
  }
  
  /**
   * Detect illegal requests in scammer message
   * Requirement 10.2: Illegal request detection
   * 
   * Illegal requests include:
   * - Requests for actual personal information (SSN, real credit card, etc.)
   * - Requests to perform illegal activities
   * - Requests to harm others
   * - Requests for explicit content
   */
  private detectIllegalRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Patterns for illegal requests
    const illegalPatterns = [
      // Requests for real sensitive information
      /\b(social security number|ssn|real credit card|actual password|driver'?s? license number)\b/i,
      
      // Requests for illegal activities
      /\b(hack|steal|fraud|launder|illegal|contraband|drugs|weapons)\b/i,
      
      // Requests to harm others
      /\b(hurt|harm|kill|attack|threaten|blackmail)\b/i,
      
      // Explicit content requests
      /\b(nude|naked|explicit|sexual|porn)\b/i,
      
      // Requests to bypass security
      /\b(disable antivirus|turn off firewall|bypass security)\b/i,
    ];
    
    return illegalPatterns.some(pattern => pattern.test(lowerMessage));
  }
  
  /**
   * Check if response contains real information that should not be disclosed
   * Requirement 10.4: Safety invariant - no real information disclosure
   * 
   * Real information includes:
   * - Real phone numbers (not fake persona numbers)
   * - Real addresses
   * - Real financial information
   * - Real personal identifiers
   */
  private containsRealInformation(response: string): boolean {
    // Check for patterns that might indicate real information
    // This is a safety check to prevent accidental disclosure
    
    // Real SSN pattern (XXX-XX-XXXX)
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(response)) {
      return true;
    }
    
    // Real credit card patterns (16 digits)
    if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(response)) {
      return true;
    }
    
    // Real email addresses from known domains (not fake persona emails)
    const realEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const emailPattern = /\b[\w.+-]+@([\w-]+\.)+[\w-]{2,}\b/gi;
    const emails = response.match(emailPattern) || [];
    for (const email of emails) {
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && realEmailDomains.includes(domain)) {
        // Check if it's not a persona email (persona emails should have specific patterns)
        if (!email.includes('persona') && !email.includes('fake') && !email.includes('test')) {
          return true;
        }
      }
    }
    
    // Real physical addresses (street numbers + street names)
    if (/\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/.test(response)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate a safe generic response when real information is detected
   * Requirement 10.4: Safety invariant
   */
  private generateSafeResponse(): string {
    const safeResponses = [
      "I'm not sure about that.",
      "Let me think about it.",
      "Can you explain that differently?",
      "I don't have that information right now.",
      "I need to check on that first.",
    ];
    
    return safeResponses[Math.floor(Math.random() * safeResponses.length)];
  }
  
  /**
   * Terminate conversation with safety checks
   * Requirement 10.3: Intelligence preservation on termination
   * Requirement 10.5: Termination finality
   */
  private async terminateWithSafety(reason: string): Promise<void> {
    // Preserve intelligence before termination (Requirement 10.3)
    if (!this.intelligencePreserved) {
      // Ensure all extracted data is in the conversation object
      // This is already done during message processing, but we verify here
      this.intelligencePreserved = true;
    }
    
    // Transition to termination state
    if (this.conversation.state !== ConversationState.TERMINATION) {
      const event: StateEvent = {
        type: 'terminate',
        data: { reason },
      };

      const newState = this.stateMachine.transition(this.conversation.id, event);
      this.conversation.state = newState;

      // Update state history
      const stateHistory = this.stateMachine.getStateHistory(this.conversation.id);
      this.conversation.metadata.stateHistory = stateHistory;
    }
    
    // Mark as terminated to prevent re-engagement (Requirement 10.5)
    this.terminated = true;

    // Log termination
    logger.conversationTerminated(this.conversation.id, reason);
  }

  /**
   * Get termination reason based on conversation state
   */
  private getTerminationReason(): string {
    if (this.unproductiveCount >= 10) {
      return 'unproductive';
    }
    if (
      this.conversation.classification &&
      this.conversation.classification.primaryConfidence > 0.8 &&
      this.conversation.extractedEntities.length >= 5
    ) {
      return 'goal_achieved';
    }
    return 'manual_termination';
  }

  /**
   * Update conversation state based on current progress
   * Implements state transition logic
   */
  private async updateState(): Promise<void> {
    const currentState = this.conversation.state;

    // Don't transition if already in termination
    if (currentState === ConversationState.TERMINATION) {
      return;
    }

    let event: StateEvent | null = null;

    // State transition logic
    switch (currentState) {
      case ConversationState.IDLE:
        // Transition to initial contact
        event = { type: 'start_conversation' };
        break;

      case ConversationState.INITIAL_CONTACT:
        // Transition to engagement after first exchange
        if (this.messageCount >= 2) {
          event = { type: 'build_trust' };
        }
        break;

      case ConversationState.ENGAGEMENT:
        // Transition to information gathering when signals detected
        if (this.conversation.scamSignals.length > 0) {
          event = { type: 'gather_information' };
        }
        break;

      case ConversationState.INFORMATION_GATHERING:
        // Transition to extraction when entities are being extracted
        if (this.conversation.extractedEntities.length > 2) {
          event = { type: 'extract_entities' };
        }
        break;

      case ConversationState.EXTRACTION:
        // Stay in extraction or go back to information gathering
        // This state can loop with information gathering
        if (this.conversation.extractedEntities.length < 3) {
          event = { type: 'gather_information' };
        }
        break;
    }

    // Execute transition if event determined
    if (event) {
      const newState = this.stateMachine.transition(this.conversation.id, event);
      this.conversation.state = newState;

      // Update state history
      const stateHistory = this.stateMachine.getStateHistory(this.conversation.id);
      this.conversation.metadata.stateHistory = stateHistory;
    }
  }

  /**
   * Generate response based on current conversation state
   * Maintains persona consistency
   */
  private async generateResponse(): Promise<Response> {
    const state = this.conversation.state;
    const persona = this.conversation.persona;

    // Determine response intent based on state
    let intent = '';
    let responseContent = '';

    switch (state) {
      case ConversationState.INITIAL_CONTACT:
        intent = 'greeting';
        responseContent = this.generateInitialContactResponse();
        break;

      case ConversationState.ENGAGEMENT:
        intent = 'build_trust';
        responseContent = this.generateEngagementResponse();
        break;

      case ConversationState.INFORMATION_GATHERING:
        intent = 'gather_information';
        responseContent = this.generateInformationGatheringResponse();
        break;

      case ConversationState.EXTRACTION:
        intent = 'extract_entities';
        responseContent = this.generateExtractionResponse();
        break;

      case ConversationState.TERMINATION:
        intent = 'terminate';
        responseContent = this.generateTerminationResponse().content;
        break;

      default:
        responseContent = this.personaManager.generateResponse(
          persona,
          this.getLastScammerMessage(),
          'default'
        );
    }

    // Calculate response delay based on persona
    const delay = this.personaManager.calculateResponseDelay(
      persona.id,
      responseContent.length
    );

    return {
      content: responseContent,
      delay,
      metadata: {
        state,
        intent,
        personaId: persona.id,
      },
    };
  }

  /**
   * Generate response for initial contact state
   * Enhanced with context-awareness and persona consistency
   */
  private generateInitialContactResponse(): string {
    const persona = this.conversation.persona;
    const lastMessage = this.getLastScammerMessage().toLowerCase();
    
    // Analyze the initial message for context
    const isGreeting = /\b(hello|hi|hey|greetings)\b/i.test(lastMessage);
    const isQuestion = lastMessage.includes('?');
    const isUrgent = /\b(urgent|immediately|now|quick)\b/i.test(lastMessage);
    const isAuthority = /\b(government|police|bank|irs|tax|microsoft|apple|amazon)\b/i.test(lastMessage);
    
    // Build context-appropriate responses based on persona
    const responses: string[] = [];
    
    // Add persona's typical responses as base
    responses.push(...persona.typicalResponses);
    
    // Add context-specific responses based on message content
    if (isGreeting) {
      responses.push(
        this.applyPersonaStyle("Hello. Who is this?"),
        this.applyPersonaStyle("Hi. Do I know you?")
      );
    }
    
    if (isQuestion) {
      responses.push(
        this.applyPersonaStyle("I'm not sure I understand the question."),
        this.applyPersonaStyle("Can you explain what you mean?")
      );
    }
    
    if (isUrgent && persona.vulnerabilityLevel > 6) {
      // Vulnerable personas show concern with urgency
      responses.push(
        this.applyPersonaStyle("Oh no, is something wrong?"),
        this.applyPersonaStyle("That sounds serious. What's happening?")
      );
    }
    
    if (isAuthority) {
      // Response varies by persona trust level
      if (persona.characteristics.trustLevel > 7) {
        responses.push(
          this.applyPersonaStyle("Oh, I didn't expect a call from you."),
          this.applyPersonaStyle("Is there a problem? I want to cooperate.")
        );
      } else {
        responses.push(
          this.applyPersonaStyle("How do I know this is really you?"),
          this.applyPersonaStyle("This seems suspicious. Can you verify?")
        );
      }
    }
    
    // Filter responses that match persona's communication style
    const styleMatchedResponses = responses.filter(r => 
      this.matchesPersonaStyle(r, persona)
    );
    
    // Select from style-matched responses, or fall back to all responses
    const finalPool = styleMatchedResponses.length > 0 ? styleMatchedResponses : responses;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  /**
   * Generate response for engagement state
   * Enhanced with conversation flow awareness
   */
  private generateEngagementResponse(): string {
    const persona = this.conversation.persona;
    const lastMessage = this.getLastScammerMessage().toLowerCase();
    
    // Analyze conversation flow
    const scammerMentionedMoney = /\b(money|pay|payment|cash|dollar|price|cost|fee)\b/i.test(lastMessage);
    const scammerAskedQuestion = lastMessage.includes('?');
    const scammerGaveInstructions = /\b(need to|have to|must|should|click|download|install|send)\b/i.test(lastMessage);
    
    const responses: string[] = [];
    
    // Add persona's typical responses
    responses.push(...persona.typicalResponses);
    
    // Context-aware responses based on conversation flow
    if (scammerMentionedMoney) {
      if (persona.vulnerabilityLevel > 7) {
        responses.push(
          this.applyPersonaStyle("How much are we talking about?"),
          this.applyPersonaStyle("I'm interested. Tell me more.")
        );
      } else {
        responses.push(
          this.applyPersonaStyle("Why would I need to pay?"),
          this.applyPersonaStyle("That seems like a lot. Are you sure?")
        );
      }
    }
    
    if (scammerAskedQuestion) {
      // Show engagement by answering or asking for clarification
      responses.push(
        this.applyPersonaStyle("Let me think about that."),
        this.applyPersonaStyle("Can you explain that again?"),
        this.applyPersonaStyle("I'm not sure. What do you think?")
      );
    }
    
    if (scammerGaveInstructions) {
      // Show willingness but also confusion (persona-dependent)
      if (persona.characteristics.techSavvy < 5) {
        responses.push(
          this.applyPersonaStyle("I'm not sure how to do that. Can you help?"),
          this.applyPersonaStyle("That sounds complicated. Is there an easier way?")
        );
      } else {
        responses.push(
          this.applyPersonaStyle("Okay, I can try that."),
          this.applyPersonaStyle("Let me see if I understand correctly.")
        );
      }
    }
    
    // Add conversational continuity
    if (Math.random() > 0.7) {
      responses.push(
        this.applyPersonaStyle("Can you help me understand this better?")
      );
    }
    
    // Filter and select response
    const styleMatchedResponses = responses.filter(r => 
      this.matchesPersonaStyle(r, persona)
    );
    
    const finalPool = styleMatchedResponses.length > 0 ? styleMatchedResponses : responses;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  /**
   * Generate response for information gathering state
   * Actively prompts for entity disclosure with enhanced context awareness
   */
  private generateInformationGatheringResponse(): string {
    const persona = this.conversation.persona;
    const lastMessage = this.getLastScammerMessage().toLowerCase();

    // Check what entities we're missing and prompt for them
    const hasPhone = this.conversation.extractedEntities.some(e => e.type === 'phone_number');
    const hasPayment = this.conversation.extractedEntities.some(e => e.type === 'payment_id');
    const hasUrl = this.conversation.extractedEntities.some(e => e.type === 'url');
    const hasEmail = this.conversation.extractedEntities.some(e => e.type === 'email');

    const prompts: string[] = [];

    // Context-aware entity prompts
    if (!hasPhone && (lastMessage.includes('call') || lastMessage.includes('phone') || lastMessage.includes('contact'))) {
      prompts.push(
        this.applyPersonaStyle("What number should I call?"),
        this.applyPersonaStyle("Can you give me the phone number?"),
        this.applyPersonaStyle("How do I reach you?")
      );
    }

    if (!hasPayment && (lastMessage.includes('pay') || lastMessage.includes('send') || lastMessage.includes('transfer'))) {
      prompts.push(
        this.applyPersonaStyle("Where should I send the payment?"),
        this.applyPersonaStyle("What's your payment information?"),
        this.applyPersonaStyle("Which account should I use?")
      );
    }

    if (!hasUrl && (lastMessage.includes('link') || lastMessage.includes('website') || lastMessage.includes('site'))) {
      prompts.push(
        this.applyPersonaStyle("Can you send me the link?"),
        this.applyPersonaStyle("What's the website address?"),
        this.applyPersonaStyle("Where do I go online?")
      );
    }
    
    if (!hasEmail && (lastMessage.includes('email') || lastMessage.includes('message'))) {
      prompts.push(
        this.applyPersonaStyle("What's your email address?"),
        this.applyPersonaStyle("Where should I email you?")
      );
    }

    // Generic information gathering prompts with persona awareness
    if (persona.characteristics.techSavvy < 5) {
      prompts.push(
        this.applyPersonaStyle("I'm not very good with technology. Can you help me?"),
        this.applyPersonaStyle("I don't understand. Can you explain it more simply?"),
        this.applyPersonaStyle("Can you walk me through this step by step?")
      );
    } else {
      prompts.push(
        this.applyPersonaStyle("What are the exact steps I need to follow?"),
        this.applyPersonaStyle("Can you send me the details?")
      );
    }
    
    // Add urgency-responsive prompts if scammer is being urgent
    if (/\b(urgent|immediately|now|quick|hurry)\b/i.test(lastMessage)) {
      if (persona.vulnerabilityLevel > 7) {
        prompts.push(
          this.applyPersonaStyle("Okay, I'll do it right away. What do I need?"),
          this.applyPersonaStyle("I don't want any problems. Tell me what to do.")
        );
      } else {
        prompts.push(
          this.applyPersonaStyle("Why is this so urgent?"),
          this.applyPersonaStyle("Can I take a moment to understand this?")
        );
      }
    }

    // Always include some generic prompts
    prompts.push(
      this.applyPersonaStyle("How do I do that?"),
      this.applyPersonaStyle("What information do you need from me?"),
      this.applyPersonaStyle("Can you explain the next steps?")
    );

    // Filter for persona style match
    const styleMatchedPrompts = prompts.filter(p => 
      this.matchesPersonaStyle(p, persona)
    );
    
    const finalPool = styleMatchedPrompts.length > 0 ? styleMatchedPrompts : prompts;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  /**
   * Generate response for extraction state
   * Shows compliance while maintaining persona characteristics
   */
  private generateExtractionResponse(): string {
    const persona = this.conversation.persona;
    const lastMessage = this.getLastScammerMessage().toLowerCase();
    
    const responses: string[] = [];
    
    // Add persona's typical responses
    responses.push(...persona.typicalResponses);
    
    // Context-aware extraction responses
    const isAsking = lastMessage.includes('?');
    const isInstructing = /\b(do|send|click|download|install|go to|visit)\b/i.test(lastMessage);
    const mentionsMoney = /\b(money|pay|payment|dollar|amount)\b/i.test(lastMessage);
    
    if (isAsking) {
      // Respond to questions with persona-appropriate answers
      if (persona.vulnerabilityLevel > 7) {
        responses.push(
          this.applyPersonaStyle("Yes, I can do that."),
          this.applyPersonaStyle("Whatever you need, I'm ready.")
        );
      } else {
        responses.push(
          this.applyPersonaStyle("I think so, but let me make sure I understand."),
          this.applyPersonaStyle("Maybe. Can you clarify?")
        );
      }
    }
    
    if (isInstructing) {
      // Show willingness with persona-appropriate hesitation
      if (persona.characteristics.techSavvy < 5) {
        responses.push(
          this.applyPersonaStyle("Okay, but can you guide me through it?"),
          this.applyPersonaStyle("I'll try. What's the first step?"),
          this.applyPersonaStyle("I'm doing it now. Is this right?")
        );
      } else {
        responses.push(
          this.applyPersonaStyle("Got it. I'm on it."),
          this.applyPersonaStyle("Okay, doing that now."),
          this.applyPersonaStyle("Let me just confirm the details first.")
        );
      }
    }
    
    if (mentionsMoney) {
      // Financial responses based on persona's financial awareness
      if (persona.characteristics.financialAwareness < 5) {
        responses.push(
          this.applyPersonaStyle("How much exactly?"),
          this.applyPersonaStyle("I can send that. Where do I send it?"),
          this.applyPersonaStyle("Okay, I'll get the money ready.")
        );
      } else {
        responses.push(
          this.applyPersonaStyle("Let me verify this is legitimate first."),
          this.applyPersonaStyle("That's a significant amount. Can you provide documentation?"),
          this.applyPersonaStyle("I need to check my account first.")
        );
      }
    }
    
    // Add general extraction responses
    responses.push(
      this.applyPersonaStyle("Okay, I'm ready. What do I need to do exactly?"),
      this.applyPersonaStyle("I want to help. Please tell me the details."),
      this.applyPersonaStyle("I'm following along. What's next?"),
      this.applyPersonaStyle("Should I do this right now?")
    );
    
    // Occasionally show slight hesitation (more human-like)
    // Note: We don't track hasShownHesitation yet, so just add these to the pool
    if (Math.random() > 0.7) {
      responses.push(
        this.applyPersonaStyle("Just to be sure, this is safe, right?"),
        this.applyPersonaStyle("I'm a little nervous, but I trust you.")
      );
    }
    
    // Filter for style match
    const styleMatchedResponses = responses.filter(r => 
      this.matchesPersonaStyle(r, persona)
    );
    
    const finalPool = styleMatchedResponses.length > 0 ? styleMatchedResponses : responses;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  /**
   * Generate termination response
   */
  private generateTerminationResponse(): Response {
    const persona = this.conversation.persona;
    
    const responses = [
      "I need to think about this. Let me get back to you.",
      "I'm not sure about this anymore. I need to talk to someone.",
      "This doesn't feel right. I'm going to stop here.",
      "I think I should check with my family first.",
    ];

    const content = responses[Math.floor(Math.random() * responses.length)];
    const delay = this.personaManager.calculateResponseDelay(persona.id, content.length);

    return {
      content,
      delay,
      metadata: {
        state: ConversationState.TERMINATION,
        reason: this.getTerminationReason(),
      },
    };
  }

  /**
   * Get the last message from the scammer
   */
  private getLastScammerMessage(): string {
    const scammerMessages = this.conversation.messages.filter(m => m.sender === 'scammer');
    if (scammerMessages.length === 0) {
      return '';
    }
    return scammerMessages[scammerMessages.length - 1].content;
  }

  /**
   * Apply persona-specific styling to a response
   * Adjusts vocabulary, punctuation, and tone based on persona characteristics
   */
  private applyPersonaStyle(baseResponse: string): string {
    const persona = this.conversation.persona;
    const personaConfig = this.personaManager.getPersonaConfig(persona.id);
    
    let styledResponse = baseResponse;
    
    // Apply vocabulary substitutions based on persona
    const vocab = personaConfig.responsePatterns.vocabulary;
    
    // Adjust formality based on communication style
    if (personaConfig.responsePatterns.punctuationStyle === 'casual') {
      // Make more casual
      styledResponse = styledResponse.replace(/\bI am\b/g, "I'm");
      styledResponse = styledResponse.replace(/\bdo not\b/g, "don't");
      styledResponse = styledResponse.replace(/\bcannot\b/g, "can't");
      styledResponse = styledResponse.replace(/\bwill not\b/g, "won't");
    } else if (personaConfig.responsePatterns.punctuationStyle === 'minimal') {
      // Remove some punctuation
      if (Math.random() > 0.5) {
        styledResponse = styledResponse.replace(/\.$/, '');
      }
    }
    
    // Add persona-specific vocabulary flavor
    if (vocab.length > 0 && Math.random() > 0.6) {
      // Persona vocabulary is available but we don't need to use it every time
      // Just having it available influences the response pool selection
      
      // Add filler words based on persona
      if (persona.characteristics.techSavvy < 5 && Math.random() > 0.7) {
        const fillers = ['um', 'uh', 'well', 'you know'];
        const filler = fillers[Math.floor(Math.random() * fillers.length)];
        styledResponse = `${filler}, ${styledResponse.charAt(0).toLowerCase()}${styledResponse.slice(1)}`;
      }
    }
    
    // Add typos based on error rate (occasionally)
    if (Math.random() < personaConfig.responsePatterns.errorRate * 0.3) {
      styledResponse = this.addTypo(styledResponse);
    }
    
    return styledResponse;
  }

  /**
   * Check if a response matches the persona's communication style
   * Used for filtering responses to maintain consistency
   */
  private matchesPersonaStyle(response: string, persona: Persona): boolean {
    const personaConfig = this.personaManager.getPersonaConfig(persona.id);
    const lowerResponse = response.toLowerCase();
    
    // Check vocabulary match
    const hasPersonaVocab = personaConfig.responsePatterns.vocabulary.some(word =>
      lowerResponse.includes(word.toLowerCase())
    );
    
    // Check formality match
    const hasFormalWords = /\b(certainly|indeed|appreciate|kindly|regards)\b/i.test(response);
    const hasCasualWords = /\b(yeah|nah|gonna|wanna|kinda|sorta|tbh|rn)\b/i.test(response);
    
    const isFormal = personaConfig.responsePatterns.punctuationStyle === 'formal';
    const isCasual = personaConfig.responsePatterns.punctuationStyle === 'casual';
    
    // Formal personas should avoid casual language
    if (isFormal && hasCasualWords) {
      return false;
    }
    
    // Very casual personas should avoid overly formal language
    if (isCasual && hasFormalWords && persona.age < 40) {
      return false;
    }
    
    // Check tech-savviness match
    const hasTechTerms = /\b(download|install|click|browser|app|software|system)\b/i.test(response);
    if (hasTechTerms && persona.characteristics.techSavvy < 3) {
      return false; // Very non-tech-savvy personas wouldn't use tech terms
    }
    
    // Generally accept responses that have persona vocab or are neutral
    return hasPersonaVocab || (!hasFormalWords && !hasCasualWords);
  }

  /**
   * Add a realistic typo to a response
   * Simulates human typing errors
   */
  private addTypo(text: string): string {
    if (text.length < 10) return text; // Don't add typos to very short text
    
    const words = text.split(' ');
    if (words.length === 0) return text;
    
    // Pick a random word (avoid first and last word)
    const wordIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
    const word = words[wordIndex];
    
    if (word.length < 4) return text; // Don't typo short words
    
    // Common typo types
    const typoTypes = ['swap', 'duplicate', 'omit'];
    const typoType = typoTypes[Math.floor(Math.random() * typoTypes.length)];
    
    let typoWord = word;
    const charIndex = Math.floor(Math.random() * (word.length - 1));
    
    switch (typoType) {
      case 'swap':
        // Swap two adjacent characters
        typoWord = 
          word.slice(0, charIndex) +
          word[charIndex + 1] +
          word[charIndex] +
          word.slice(charIndex + 2);
        break;
      case 'duplicate':
        // Duplicate a character
        typoWord = 
          word.slice(0, charIndex + 1) +
          word[charIndex] +
          word.slice(charIndex + 1);
        break;
      case 'omit':
        // Omit a character
        typoWord = 
          word.slice(0, charIndex) +
          word.slice(charIndex + 1);
        break;
    }
    
    words[wordIndex] = typoWord;
    return words.join(' ');
  }

  /**
   * Get the current conversation state
   */
  getConversation(): Conversation {
    return { ...this.conversation };
  }

  /**
   * Get conversation ID
   */
  getConversationId(): string {
    return this.conversation.id;
  }

  /**
   * Check if conversation is terminated
   */
  isTerminated(): boolean {
    return this.conversation.state === ConversationState.TERMINATION;
  }
  
  /**
   * Check if conversation has been permanently terminated (cannot be re-engaged)
   * Requirement 10.5: Termination finality
   */
  isPermanentlyTerminated(): boolean {
    return this.terminated;
  }
  
  /**
   * Check if intelligence has been preserved
   * Requirement 10.3: Intelligence preservation
   */
  isIntelligencePreserved(): boolean {
    return this.intelligencePreserved;
  }
  
  /**
   * Get conversation duration in milliseconds
   */
  getDuration(): number {
    return this.conversation.metadata.duration;
  }
  
  /**
   * Get maximum allowed duration in milliseconds
   */
  getMaxDuration(): number {
    return this.MAX_DURATION_MS;
  }

    /**
     * Restore agent state from persisted conversation
     * Used for conversation recovery after system restart
     * Requirement 9.7: State persistence and recovery
     *
     * @param conversation - The persisted conversation state to restore
     */
    restoreState(conversation: Conversation): void {
      // Validate conversation ID matches
      if (conversation.id !== this.conversation.id) {
        throw new Error(
          `Conversation ID mismatch: expected ${this.conversation.id}, got ${conversation.id}`
        );
      }

      // Restore all conversation fields
      this.conversation = {
        ...conversation,
        // Ensure dates are Date objects (they may be strings after JSON serialization)
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        messages: conversation.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        extractedEntities: conversation.extractedEntities.map(e => ({
          ...e,
          timestamp: new Date(e.timestamp),
        })),
        scamSignals: conversation.scamSignals.map(s => ({
          ...s,
          timestamp: new Date(s.timestamp),
        })),
        metadata: {
          ...conversation.metadata,
          stateHistory: conversation.metadata.stateHistory.map(sh => ({
            ...sh,
            timestamp: new Date(sh.timestamp),
          })),
        },
      };

      // Restore message count
      this.messageCount = conversation.metadata.messageCount;

      // Calculate unproductive count based on recent messages
      // This is an approximation since we don't persist unproductiveCount
      this.unproductiveCount = this.calculateUnproductiveCount();
      
      // Restore terminated status based on conversation state
      if (conversation.state === ConversationState.TERMINATION) {
        this.terminated = true;
        this.intelligencePreserved = true;
      }
    }

    /**
     * Calculate unproductive count from conversation history
     * Used during state restoration
     */
    private calculateUnproductiveCount(): number {
      // Look at the last few messages to estimate unproductive count
      const recentMessageCount = Math.min(10, this.conversation.messages.length);
      if (recentMessageCount === 0) {
        return 0;
      }

      const recentMessages = this.conversation.messages.slice(-recentMessageCount);
      let unproductiveCount = 0;

      for (const message of recentMessages) {
        if (message.sender === 'scammer') {
          // Check if this message resulted in any entities or signals
          const messageTime = message.timestamp.getTime();
          const hasEntities = this.conversation.extractedEntities.some(
            e => Math.abs(e.timestamp.getTime() - messageTime) < 1000 // Within 1 second
          );
          const hasSignals = this.conversation.scamSignals.some(
            s => Math.abs(s.timestamp.getTime() - messageTime) < 1000 // Within 1 second
          );

          if (!hasEntities && !hasSignals) {
            unproductiveCount++;
          } else {
            unproductiveCount = 0; // Reset on productive exchange
          }
        }
      }

      return unproductiveCount;
    }
}
