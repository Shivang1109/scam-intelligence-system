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

    const data = await response.json();
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
}
