/**
 * Scam Signal Detector Implementation
 * Detects scam signals and patterns in conversation text
 * 
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { ScamSignal, SignalType } from '../types';
import { SignalDetector as ISignalDetector } from './interfaces';
import { logger } from '../utils/logger';

export class ScamSignalDetector implements ISignalDetector {
  /**
   * Detect all scam signals in text
   * Aggregates results from all detection methods
   */
  detectSignals(text: string, conversationId?: string): ScamSignal[] {
    const signals: ScamSignal[] = [];

    // Run all detection methods
    const urgencySignal = this.detectUrgency(text);
    if (urgencySignal) {
      signals.push(urgencySignal);
    }

    const financialSignal = this.detectFinancialRequest(text);
    if (financialSignal) {
      signals.push(financialSignal);
    }

    const impersonationSignal = this.detectImpersonation(text);
    if (impersonationSignal) {
      signals.push(impersonationSignal);
    }

    const threatSignal = this.detectThreats(text);
    if (threatSignal) {
      signals.push(threatSignal);
    }

    // Log detected signals
    if (conversationId) {
      signals.forEach(signal => {
        logger.signalDetected(conversationId, signal.type, signal.confidence);
      });
    }

    return signals;
  }

  /**
   * Detect urgency indicators in text
   * Looks for time pressure, threats, limited offers
   * Validates Requirements: 4.1
   */
  detectUrgency(text: string): ScamSignal | null {
    const timestamp = new Date();

    // Urgency patterns with associated confidence scores
    const urgencyPatterns = [
      // Time pressure - high urgency
      { pattern: /\b(act now|right now|immediately|urgent|asap|time[- ]sensitive)\b/gi, weight: 0.9 },
      { pattern: /\b(within (the next )?\d+ (hours?|minutes?|days?))\b/gi, weight: 0.85 },
      { pattern: /\b(expires? (in|within|today|tonight|soon))\b/gi, weight: 0.85 },
      { pattern: /\b(deadline|time limit|last chance|final (notice|warning|opportunity))\b/gi, weight: 0.85 },
      { pattern: /\b(hurry|quick(ly)?|fast|don'?t wait|don'?t delay)\b/gi, weight: 0.8 },
      
      // Limited availability
      { pattern: /\b(limited (time|offer|availability|spots?|quantities?))\b/gi, weight: 0.85 },
      { pattern: /\b(only \d+ (left|remaining|available))\b/gi, weight: 0.8 },
      { pattern: /\b(while (supplies|stocks?) last)\b/gi, weight: 0.75 },
      { pattern: /\b(first \d+ (people|customers?))\b/gi, weight: 0.75 },
      
      // Expiration warnings
      { pattern: /\b(expir(e[sd]?|ing|ation)|about to expire)\b/gi, weight: 0.8 },
      { pattern: /\b(will (be )?(close[sd]?|suspend(ed)?|terminat(e[sd]?)|cancel(l?ed)?|block(ed)?|lock(ed)?))\b/gi, weight: 0.85 },
      
      // Immediate action required
      { pattern: /\b(must (act|respond|reply|call|contact|verify|confirm))\b/gi, weight: 0.85 },
      { pattern: /\b(need(s)? (immediate|urgent|prompt) (action|response|attention))\b/gi, weight: 0.9 },
      { pattern: /\b(respond (immediately|now|asap|within))\b/gi, weight: 0.85 },
      { pattern: /\b(action required|immediate action)\b/gi, weight: 0.9 },
      
      // Countdown language
      { pattern: /\b(\d+ (hours?|minutes?|days?) (left|remaining))\b/gi, weight: 0.85 },
      { pattern: /\b(count(ing)? down|running out)\b/gi, weight: 0.75 },
      
      // Pressure tactics
      { pattern: /\b(don'?t miss (out|this)|miss(ing)? out)\b/gi, weight: 0.75 },
      { pattern: /\b(once[- ]in[- ]a[- ]lifetime|never again)\b/gi, weight: 0.8 },
      { pattern: /\b(now or never)\b/gi, weight: 0.8 },
    ];

    let maxConfidence = 0;
    let matchedText = '';
    let matchedContext = '';

    // Check each pattern
    for (const { pattern, weight } of urgencyPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Use the first match for context
        const match = matches[0];
        const matchIndex = text.indexOf(match);
        
        // Calculate confidence based on pattern weight and number of matches
        // Multiple urgency indicators increase confidence
        const confidence = Math.min(weight + (matches.length - 1) * 0.05, 1.0);
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          matchedText = match;
          matchedContext = this.extractContext(text, matchIndex, match.length);
        }
      }
    }

    // Return signal if urgency detected
    if (maxConfidence > 0) {
      return {
        type: SignalType.URGENCY,
        confidence: maxConfidence,
        text: matchedText,
        context: matchedContext,
        timestamp,
      };
    }

    return null;
  }

  /**
   * Detect financial request patterns in text
   * Looks for payment requests, money transfers, financial information requests
   * Validates Requirements: 4.2
   */
  detectFinancialRequest(text: string): ScamSignal | null {
    const timestamp = new Date();

    // Financial request patterns with confidence scores
    const financialPatterns = [
      // Direct payment requests - highest confidence
      { pattern: /\b(send (me |us )?(money|payment|funds?|cash))\b/gi, weight: 0.95 },
      { pattern: /\b(send (me |us )?\$?\d+)\b/gi, weight: 0.95 },
      { pattern: /\b(pay(ment)? (of|for) ?\$?\d+)\b/gi, weight: 0.95 },
      { pattern: /\b(transfer \$?\d+)\b/gi, weight: 0.95 },
      { pattern: /\b(wire (me |us )?(the )?(money|funds?|payment))\b/gi, weight: 0.95 },
      
      // Payment method requests
      { pattern: /\b(send (via |through |using )?(paypal|venmo|zelle|cashapp|bitcoin|crypto|gift card))\b/gi, weight: 0.9 },
      { pattern: /\b(via (paypal|venmo|zelle|cashapp|western union))\b/gi, weight: 0.9 },
      { pattern: /\b(buy (me |us )?(a )?gift card)\b/gi, weight: 0.95 },
      { pattern: /\b(purchase (a )?gift card)\b/gi, weight: 0.9 },
      { pattern: /\b(redeem (the )?gift card)\b/gi, weight: 0.85 },
      { pattern: /\b(gift card)\b/gi, weight: 0.7 },
      
      // Financial information requests
      { pattern: /\b(provide (your )?(credit card|debit card|card number|cvv|pin|account number|routing number|bank account))\b/gi, weight: 0.95 },
      { pattern: /\b(enter (your )?(credit card|debit card|card number|cvv|pin|password))\b/gi, weight: 0.95 },
      { pattern: /\b(verify (your )?(credit card|debit card|card number|account|payment (method|info)))\b/gi, weight: 0.9 },
      { pattern: /\b(confirm (your )?(credit card|debit card|card number|account|payment))\b/gi, weight: 0.9 },
      { pattern: /\b(update (your )?(credit card|debit card|payment (method|info)|billing))\b/gi, weight: 0.9 },
      
      // Account access requests
      { pattern: /\b(need (your )?(bank|account) (details|information|credentials|login))\b/gi, weight: 0.95 },
      { pattern: /\b(share (your )?(bank|account) (details|information|number))\b/gi, weight: 0.95 },
      { pattern: /\b(give (me |us )?(your )?(bank|account) (details|information|number))\b/gi, weight: 0.95 },
      { pattern: /\b((bank|account) (details|information))\b/gi, weight: 0.85 },
      
      // Fee/advance payment requests
      { pattern: /\b(pay(ment)? (a )?(fee|charge|tax|processing fee|handling fee|transfer fee))\b/gi, weight: 0.9 },
      { pattern: /\b(upfront (payment|fee|cost))\b/gi, weight: 0.9 },
      { pattern: /\b(advance (payment|fee))\b/gi, weight: 0.9 },
      { pattern: /\b(deposit (of )?\$?\d+)\b/gi, weight: 0.85 },
      
      // Refund/reimbursement scams
      { pattern: /\b(refund (of )?\$?\d+)\b/gi, weight: 0.8 },
      { pattern: /\b(reimburse(ment)?)\b/gi, weight: 0.75 },
      { pattern: /\b(overpay(ment)?)\b/gi, weight: 0.85 },
      { pattern: /\b(send back|return (the )?(excess|extra|overpayment))\b/gi, weight: 0.9 },
      
      // Investment/money-making schemes
      { pattern: /\b(invest(ment)? (of )?\$?\d+)\b/gi, weight: 0.8 },
      { pattern: /\b(guaranteed (return|profit|income))\b/gi, weight: 0.85 },
      { pattern: /\b(make \$?\d+ (per|a) (day|week|month))\b/gi, weight: 0.8 },
      { pattern: /\b(earn \$?\d+ (from home|online|quickly))\b/gi, weight: 0.8 },
      
      // Cryptocurrency requests
      { pattern: /\b(send (bitcoin|btc|ethereum|eth|crypto|cryptocurrency))\b/gi, weight: 0.95 },
      { pattern: /\b(wallet address)\b/gi, weight: 0.85 },
      { pattern: /\b(crypto (wallet|address|payment))\b/gi, weight: 0.85 },
      { pattern: /\b(bitcoin|btc|ethereum|eth)\b/gi, weight: 0.75 },
      
      // Generic money requests
      { pattern: /\b(need (the )?(money|payment|funds?))\b/gi, weight: 0.85 },
      { pattern: /\b(owe (me |us )?\$?\d+)\b/gi, weight: 0.85 },
      { pattern: /\b(pay (me |us )?back)\b/gi, weight: 0.75 },
    ];

    let maxConfidence = 0;
    let matchedText = '';
    let matchedContext = '';

    // Check each pattern
    for (const { pattern, weight } of financialPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const match = matches[0];
        const matchIndex = text.indexOf(match);
        
        // Multiple financial requests increase confidence
        const confidence = Math.min(weight + (matches.length - 1) * 0.03, 1.0);
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          matchedText = match;
          matchedContext = this.extractContext(text, matchIndex, match.length);
        }
      }
    }

    // Return signal if financial request detected
    if (maxConfidence > 0) {
      return {
        type: SignalType.FINANCIAL_REQUEST,
        confidence: maxConfidence,
        text: matchedText,
        context: matchedContext,
        timestamp,
      };
    }

    return null;
  }

  /**
   * Detect authority impersonation in text
   * Looks for government, bank, tech support impersonation
   * Validates Requirements: 4.3
   */
  detectImpersonation(text: string): ScamSignal | null {
    const timestamp = new Date();

    // Authority impersonation patterns
    const impersonationPatterns = [
      // Government agencies - highest confidence
      { pattern: /\b(irs|internal revenue service)\b/gi, weight: 0.95 },
      { pattern: /\b(fbi|federal bureau)\b/gi, weight: 0.95 },
      { pattern: /\b(social security (administration|office))\b/gi, weight: 0.95 },
      { pattern: /\b(department of (justice|homeland security|treasury))\b/gi, weight: 0.95 },
      { pattern: /\b(immigration (and customs|office|department))\b/gi, weight: 0.95 },
      { pattern: /\b(customs (and border|office))\b/gi, weight: 0.95 },
      { pattern: /\b(medicare|medicaid)\b/gi, weight: 0.9 },
      
      // Law enforcement
      { pattern: /\b(police (department|officer)|sheriff|deputy)\b/gi, weight: 0.95 },
      { pattern: /\b(warrant (for|issued)|arrest warrant)\b/gi, weight: 0.95 },
      { pattern: /\b(legal action|court|lawsuit|litigation)\b/gi, weight: 0.85 },
      { pattern: /\b(attorney|lawyer|legal (team|department))\b/gi, weight: 0.8 },
      
      // Financial institutions
      { pattern: /\b(bank (of america|representative|security|fraud (department|team)))\b/gi, weight: 0.9 },
      { pattern: /\b((wells fargo|chase|citibank|hsbc) (bank|representative))\b/gi, weight: 0.9 },
      { pattern: /\b(credit card (company|services|security))\b/gi, weight: 0.85 },
      { pattern: /\b(fraud (department|prevention|alert|team))\b/gi, weight: 0.85 },
      { pattern: /\b(account (security|verification) (team|department))\b/gi, weight: 0.85 },
      
      // Tech companies
      { pattern: /\b((microsoft|apple|google|amazon) (support|security|tech support|technical support))\b/gi, weight: 0.9 },
      { pattern: /\b(microsoft|apple|google|amazon)\b/gi, weight: 0.75 },
      { pattern: /\b(technical support (team|department))\b/gi, weight: 0.85 },
      { pattern: /\b(tech support (representative|agent))\b/gi, weight: 0.85 },
      { pattern: /\b(geek squad|norton|mcafee) (support|security)?\b/gi, weight: 0.9 },
      { pattern: /\b(windows (support|security|defender))\b/gi, weight: 0.85 },
      { pattern: /\b(computer (security|support|protection))\b/gi, weight: 0.8 },
      
      // Generic authority claims
      { pattern: /\b(official (representative|agent|notice|communication))\b/gi, weight: 0.85 },
      { pattern: /\b(authorized (representative|agent|dealer))\b/gi, weight: 0.85 },
      { pattern: /\b(government (official|agency|representative))\b/gi, weight: 0.9 },
      { pattern: /\b(federal (agent|official|representative))\b/gi, weight: 0.9 },
      
      // Customer service impersonation
      { pattern: /\b(customer (service|support|care) (representative|agent|team))\b/gi, weight: 0.75 },
      { pattern: /\b(support (team|department|representative))\b/gi, weight: 0.7 },
      { pattern: /\b(help desk|helpdesk)\b/gi, weight: 0.7 },
      
      // Utility companies
      { pattern: /\b((electric|power|gas|water) (company|utility))\b/gi, weight: 0.8 },
      { pattern: /\b(utility (company|services|bill))\b/gi, weight: 0.75 },
      
      // Delivery/shipping
      { pattern: /\b((fedex|ups|usps|dhl) (delivery|shipping|package))\b/gi, weight: 0.85 },
      { pattern: /\b(postal service|mail carrier)\b/gi, weight: 0.8 },
      
      // Insurance
      { pattern: /\b(insurance (company|agent|claim))\b/gi, weight: 0.75 },
      { pattern: /\b(health insurance|medicare)\b/gi, weight: 0.8 },
    ];

    let maxConfidence = 0;
    let matchedText = '';
    let matchedContext = '';
    let matchCount = 0;

    // Check each pattern
    for (const { pattern, weight } of impersonationPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        const match = matches[0];
        const matchIndex = text.indexOf(match);
        
        // Multiple authority claims increase confidence
        const confidence = Math.min(weight + (matches.length - 1) * 0.03, 1.0);
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          matchedText = match;
          matchedContext = this.extractContext(text, matchIndex, match.length);
        }
      }
    }

    // Boost confidence if combined with urgency or financial requests
    if (maxConfidence > 0) {
      // Check for urgency language
      if (/\b(urgent|immediately|now|asap|expire|deadline)\b/gi.test(text)) {
        maxConfidence = Math.min(maxConfidence + 0.05, 1.0);
      }
      
      // Check for financial requests
      if (/\b(pay|payment|money|transfer|account|card)\b/gi.test(text)) {
        maxConfidence = Math.min(maxConfidence + 0.05, 1.0);
      }
    }

    // Return signal if impersonation detected
    if (maxConfidence > 0) {
      return {
        type: SignalType.IMPERSONATION,
        confidence: maxConfidence,
        text: matchedText,
        context: matchedContext,
        timestamp,
      };
    }

    return null;
  }

  /**
   * Detect threats and fear-inducing language in text
   * Looks for threats, warnings, fear tactics
   * Validates Requirements: 4.4
   */
  detectThreats(text: string): ScamSignal | null {
    const timestamp = new Date();

    // Threat and fear patterns
    const threatPatterns = [
      // Legal threats - highest confidence
      { pattern: /\b(arrest(ed)?|jail|prison|custody)\b/gi, weight: 0.95 },
      { pattern: /\b(warrant (for|issued|out for))\b/gi, weight: 0.95 },
      { pattern: /\b(legal action|lawsuit|sue|sued|litigation)\b/gi, weight: 0.9 },
      { pattern: /\b(court (order|summons|appearance))\b/gi, weight: 0.9 },
      { pattern: /\b(criminal (charges|investigation|record))\b/gi, weight: 0.95 },
      { pattern: /\b(prosecut(e[sd]?|ion))\b/gi, weight: 0.9 },
      
      // Financial threats
      { pattern: /\b(account (will be )?(suspend(ed)?|terminat(e[sd]?)|close[sd]?|frozen|lock(ed)?|block(ed)?))\b/gi, weight: 0.9 },
      { pattern: /\b(lose (your |all )?(money|funds?|savings|account))\b/gi, weight: 0.9 },
      { pattern: /\b(lose)\b/gi, weight: 0.7 },
      { pattern: /\b(seize (your )?(assets?|property|account|funds?))\b/gi, weight: 0.95 },
      { pattern: /\b(garnish (your )?(wages?|salary|paycheck))\b/gi, weight: 0.9 },
      { pattern: /\b(credit (score|rating) (will )?(be )?(damage[sd]?|ruin(ed)?|destroy(ed)?))\b/gi, weight: 0.85 },
      { pattern: /\b(collections? (agency|action))\b/gi, weight: 0.85 },
      
      // Identity/security threats
      { pattern: /\b(identity (theft|stolen|compromised))\b/gi, weight: 0.9 },
      { pattern: /\b(identity)\b/gi, weight: 0.7 },
      { pattern: /\b(hack(ed|er)?|breach(ed)?|compromised)\b/gi, weight: 0.85 },
      { pattern: /\b(unauthorized (access|activity|transaction))\b/gi, weight: 0.85 },
      { pattern: /\b(suspicious activity|fraudulent (activity|transaction))\b/gi, weight: 0.8 },
      { pattern: /\b(security (breach|threat|alert|warning))\b/gi, weight: 0.85 },
      { pattern: /\b(virus|malware|infected|trojan)\b/gi, weight: 0.8 },
      
      // Consequence warnings
      { pattern: /\b(if you (don'?t|do not|fail to))\b/gi, weight: 0.8 },
      { pattern: /\b(unless you (act|respond|pay|call|contact))\b/gi, weight: 0.85 },
      { pattern: /\b(failure to (act|respond|pay|comply))\b/gi, weight: 0.85 },
      { pattern: /\b(consequences|penalties|fines?)\b/gi, weight: 0.75 },
      { pattern: /\b(face (arrest|charges|prosecution|legal action))\b/gi, weight: 0.95 },
      
      // Urgency + threat combinations
      { pattern: /\b(final (warning|notice|chance))\b/gi, weight: 0.9 },
      { pattern: /\b(last (warning|notice|chance|opportunity))\b/gi, weight: 0.9 },
      { pattern: /\b(immediate action required)\b/gi, weight: 0.85 },
      
      // Tax/debt threats
      { pattern: /\b(owe (back )?(taxes|money|debt))\b/gi, weight: 0.85 },
      { pattern: /\b(unpaid (taxes|debt|bill))\b/gi, weight: 0.8 },
      { pattern: /\b(tax (fraud|evasion|debt))\b/gi, weight: 0.9 },
      { pattern: /\b(back taxes)\b/gi, weight: 0.85 },
      
      // Immigration threats
      { pattern: /\b(deportation|deport(ed)?|visa (revok(e[sd]?)|cancel(l?ed)?))\b/gi, weight: 0.95 },
      { pattern: /\b(immigration (status|violation|fraud))\b/gi, weight: 0.9 },
      
      // Service disconnection threats
      { pattern: /\b(disconnect(ed)?|shut off|turn off) (your )?(service|power|electricity|gas|water|internet)\b/gi, weight: 0.85 },
      { pattern: /\b(service (will be )?(disconnect(ed)?|terminat(e[sd]?)|suspend(ed)?))\b/gi, weight: 0.85 },
      
      // Personal safety threats
      { pattern: /\b(harm|hurt|danger|risk|threat(en)?)\b/gi, weight: 0.9 },
      { pattern: /\b(safety|security) (at risk|threatened|compromised)\b/gi, weight: 0.85 },
    ];

    let maxConfidence = 0;
    let matchedText = '';
    let matchedContext = '';
    let matchCount = 0;

    // Check each pattern
    for (const { pattern, weight } of threatPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        const match = matches[0];
        const matchIndex = text.indexOf(match);
        
        // Multiple threats increase confidence
        const confidence = Math.min(weight + (matches.length - 1) * 0.03, 1.0);
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          matchedText = match;
          matchedContext = this.extractContext(text, matchIndex, match.length);
        }
      }
    }

    // Boost confidence if multiple different threat types detected
    if (matchCount > 2) {
      maxConfidence = Math.min(maxConfidence + 0.05, 1.0);
    }

    // Return signal if threat detected
    if (maxConfidence > 0) {
      return {
        type: SignalType.THREAT,
        confidence: maxConfidence,
        text: matchedText,
        context: matchedContext,
        timestamp,
      };
    }

    return null;
  }

  /**
   * Extract surrounding context for a match
   * Returns text around the match for better understanding
   */
  private extractContext(text: string, index: number, length: number): string {
    const contextRadius = 50;
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(text.length, index + length + contextRadius);
    return text.slice(start, end).trim();
  }
}
