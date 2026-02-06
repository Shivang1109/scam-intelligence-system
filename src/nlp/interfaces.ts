/**
 * NLP Extractor and Signal Detector Interfaces
 */

import {
  Entity,
  PhoneNumber,
  PaymentId,
  URL,
  Organization,
  BankAccount,
  Email,
  ScamSignal,
} from '../types';

export interface NLPExtractor {
  extractEntities(text: string): Entity[];
  extractPhoneNumbers(text: string, language?: string): PhoneNumber[];
  extractPaymentIds(text: string, language?: string): PaymentId[];
  extractUrls(text: string): URL[];
  extractOrganizations(text: string): Organization[];
  extractBankAccounts(text: string): BankAccount[];
  extractEmails(text: string): Email[];
  detectLanguage(text: string): { language: string; confidence: number };
}

export interface SignalDetector {
  detectSignals(text: string): ScamSignal[];
  detectUrgency(text: string): ScamSignal | null;
  detectFinancialRequest(text: string): ScamSignal | null;
  detectImpersonation(text: string): ScamSignal | null;
  detectThreats(text: string): ScamSignal | null;
}
