/**
 * OpenAI-powered Scam Analyzer
 * Uses GPT-4 for intelligent scam detection and analysis
 */

import { ScamType, SignalType, EntityType } from '../types';

export interface AIAnalysisResult {
  isScam: boolean;
  confidence: number;
  scamType: ScamType | null;
  riskScore: number;
  reasoning: string;
  extractedEntities: Array<{
    type: EntityType;
    value: string;
    confidence: number;
  }>;
  signals: Array<{
    type: SignalType;
    confidence: number;
    evidence: string;
  }>;
}

export class OpenAIAnalyzer {
  private apiKey: string;
  private model: string;
  private enabled: boolean;

  constructor(apiKey?: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
    this.enabled = !!this.apiKey;
  }

  /**
   * Analyze a message for scam indicators using AI
   */
  async analyzeMessage(message: string): Promise<AIAnalysisResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const prompt = this.buildPrompt(message);
      const response = await this.callOpenAI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      return null;
    }
  }

  /**
   * Build the analysis prompt
   */
  private buildPrompt(message: string): string {
    return `You are an expert scam detection system. Analyze the following message and determine if it's a scam.

Message: "${message}"

Provide a detailed analysis in JSON format with the following structure:
{
  "isScam": boolean,
  "confidence": number (0-1),
  "scamType": "phishing" | "romance" | "investment" | "tech_support" | "impersonation" | "advance_fee" | "lottery" | null,
  "riskScore": number (0-100),
  "reasoning": "Brief explanation of why this is/isn't a scam",
  "extractedEntities": [
    {
      "type": "phone_number" | "url" | "email" | "payment_id" | "bank_account" | "organization",
      "value": "extracted value",
      "confidence": number (0-1)
    }
  ],
  "signals": [
    {
      "type": "urgency" | "financial_request" | "impersonation" | "threat" | "authority_claim",
      "confidence": number (0-1),
      "evidence": "specific text that triggered this signal"
    }
  ]
}

Scam Types:
- phishing: Fake emails/messages pretending to be from legitimate organizations
- romance: Fake romantic relationships to extract money
- investment: Fake investment opportunities with guaranteed returns
- tech_support: Fake technical support claiming computer issues
- impersonation: Pretending to be authority figures (police, IRS, etc.)
- advance_fee: Requesting upfront payment for promised rewards
- lottery: Fake lottery/prize winnings

Analyze carefully and provide accurate results.`;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert scam detection system. Analyze messages and provide detailed JSON responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse OpenAI response
   */
  private parseResponse(response: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(response);

      return {
        isScam: parsed.isScam || false,
        confidence: parsed.confidence || 0,
        scamType: parsed.scamType || null,
        riskScore: parsed.riskScore || 0,
        reasoning: parsed.reasoning || '',
        extractedEntities: parsed.extractedEntities || [],
        signals: parsed.signals || [],
      };
    } catch (error) {
      throw new Error('Failed to parse OpenAI response');
    }
  }

  /**
   * Check if AI is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate a persona-appropriate response using AI
   */
  async generatePersonaResponse(
    persona: any,
    scammerMessage: string,
    conversationContext: string[],
    intent: string
  ): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const prompt = this.buildPersonaPrompt(persona, scammerMessage, conversationContext, intent);
      const response = await this.callOpenAI(prompt);
      return this.parsePersonaResponse(response);
    } catch (error) {
      console.error('OpenAI persona response generation failed:', error);
      return null;
    }
  }

  /**
   * Build prompt for persona response generation
   */
  private buildPersonaPrompt(
    persona: any,
    scammerMessage: string,
    conversationContext: string[],
    intent: string
  ): string {
    const contextStr = conversationContext.length > 0
      ? `\n\nConversation history:\n${conversationContext.join('\n')}`
      : '';

    return `You are roleplaying as a vulnerable persona in a scam detection honeypot system. Your goal is to engage the scammer naturally while extracting information.

Persona Details:
- Name: ${persona.name}
- Age: ${persona.age}
- Background: ${persona.background}
- Vulnerability Level: ${persona.vulnerabilityLevel}/10 (higher = more vulnerable)
- Tech Savvy: ${persona.characteristics.techSavvy}/10 (lower = less technical)
- Trust Level: ${persona.characteristics.trustLevel}/10 (higher = more trusting)
- Financial Awareness: ${persona.characteristics.financialAwareness}/10 (lower = less aware)
- Communication Style: ${persona.communicationStyle}

Current Intent: ${intent}

Scammer's latest message: "${scammerMessage}"${contextStr}

Generate a single, natural response that:
1. Stays in character as ${persona.name}
2. Matches the persona's communication style and characteristics
3. Shows appropriate vulnerability level
4. Encourages the scammer to reveal more information (phone numbers, payment details, URLs, etc.)
5. Sounds human and believable
6. Is 1-3 sentences long
7. Matches the intent: ${intent}

IMPORTANT:
- Do NOT break character
- Do NOT reveal you're an AI or honeypot
- Do NOT use overly formal language if persona is casual
- Do NOT be too tech-savvy if persona has low tech skills
- Show appropriate confusion, concern, or trust based on persona traits

Respond with ONLY the persona's message, no explanations or meta-commentary.`;
  }

  /**
   * Parse persona response from AI
   */
  private parsePersonaResponse(response: string): string {
    // Clean up the response
    let cleaned = response.trim();
    
    // Remove quotes if AI wrapped the response
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    
    // Remove any meta-commentary that might have slipped through
    const lines = cleaned.split('\n');
    const firstLine = lines[0].trim();
    
    return firstLine;
  }
}
