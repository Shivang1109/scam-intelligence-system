/**
 * Claude Persona Engine
 * Generates natural, context-aware persona responses using Claude AI
 */

import { Persona, Message } from '../types';
import { logger } from '../utils/logger';

export class ClaudePersonaEngine {
  private apiKey: string | undefined;
  private model: string = 'claude-3-5-haiku-20241022'; // Current stable model
  private enabled: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.enabled = !!apiKey;
    
    if (this.enabled) {
      logger.info('ClaudePersonaEngine initialized with API key');
    } else {
      logger.info('ClaudePersonaEngine initialized without API key (fallback mode)');
    }
  }

  /**
   * Check if Claude AI is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate a persona response using Claude
   */
  public async generateResponse(
    persona: Persona,
    scammerMessage: string,
    conversationHistory: Message[],
    conversationState: string
  ): Promise<string | null> {
    if (!this.enabled || !this.apiKey) {
      return null; // Fallback to static responses
    }

    try {
      const systemPrompt = this.buildSystemPrompt(persona, conversationState);
      const userPrompt = this.buildUserPrompt(scammerMessage, conversationHistory);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 150,
          temperature: 0.8,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Claude API error: ${errorText}`);
        return null;
      }

      const data: any = await response.json();
      const generatedText = data.content?.[0]?.text;

      if (!generatedText) {
        logger.warn('Claude returned empty response');
        return null;
      }

      logger.info('Claude generated persona response', {
        persona: persona.name,
        length: generatedText.length
      });

      return generatedText.trim();
    } catch (error) {
      logger.error(`Error generating Claude response: ${String(error)}`);
      return null;
    }
  }

  /**
   * Build system prompt that defines the persona character
   */
  private buildSystemPrompt(persona: Persona, state: string): string {
    const techLevel = persona.characteristics.techSavvy;
    const trustLevel = persona.characteristics.trustLevel;
    const vulnLevel = persona.vulnerabilityLevel;

    let prompt = `You are roleplaying as ${persona.name}, a ${persona.age}-year-old person. `;
    prompt += `Background: ${persona.background}. `;
    prompt += `\n\nCharacter traits:\n`;
    prompt += `- Tech savviness: ${techLevel}/10 (${techLevel < 4 ? 'not tech-savvy' : techLevel < 7 ? 'moderate' : 'tech-savvy'})\n`;
    prompt += `- Trust level: ${trustLevel}/10 (${trustLevel > 7 ? 'very trusting' : trustLevel > 4 ? 'moderately trusting' : 'skeptical'})\n`;
    prompt += `- Vulnerability: ${vulnLevel}/10 (${vulnLevel > 7 ? 'highly vulnerable' : vulnLevel > 4 ? 'moderately vulnerable' : 'not very vulnerable'})\n`;
    prompt += `- Communication style: ${persona.communicationStyle}\n`;

    prompt += `\n\nIMPORTANT RULES:\n`;
    prompt += `1. Stay completely in character as ${persona.name}\n`;
    prompt += `2. Respond naturally as this person would, based on their traits\n`;
    prompt += `3. Keep responses SHORT (1-2 sentences max)\n`;
    prompt += `4. Match the tech savviness level (${techLevel < 4 ? 'avoid tech terms, show confusion' : 'can use basic tech terms'})\n`;
    prompt += `5. Match the trust level (${trustLevel > 7 ? 'be trusting and cooperative' : 'show some skepticism'})\n`;
    prompt += `6. DO NOT break character or mention you're an AI\n`;
    prompt += `7. DO NOT refuse to engage - you're gathering intelligence\n`;

    // Add state-specific guidance
    if (state === 'INITIAL_CONTACT') {
      prompt += `8. This is first contact - respond with curiosity or concern\n`;
    } else if (state === 'ENGAGEMENT') {
      prompt += `8. You're engaged in conversation - ask clarifying questions\n`;
    } else if (state === 'INFORMATION_GATHERING') {
      prompt += `8. You're gathering information - ask for details, phone numbers, websites\n`;
    } else if (state === 'EXTRACTION') {
      prompt += `8. You're extracting intelligence - show willingness to comply, ask for specific instructions\n`;
    }

    return prompt;
  }

  /**
   * Build user prompt with conversation context
   */
  private buildUserPrompt(scammerMessage: string, history: Message[]): string {
    let prompt = '';

    // Add recent conversation history (last 3 exchanges)
    const recentHistory = history.slice(-6); // Last 3 exchanges (6 messages)
    if (recentHistory.length > 0) {
      prompt += 'Recent conversation:\n';
      recentHistory.forEach(msg => {
        const role = msg.sender === 'scammer' ? 'Scammer' : 'You';
        prompt += `${role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `The scammer just said: "${scammerMessage}"\n\n`;
    prompt += `Respond as ${history.length > 0 ? 'you would naturally continue this conversation' : 'you would to this initial message'}. `;
    prompt += `Remember: Stay in character, keep it short (1-2 sentences), and match your persona's traits.`;

    return prompt;
  }

  /**
   * Get the model being used
   */
  public getModel(): string {
    return this.model;
  }
}
