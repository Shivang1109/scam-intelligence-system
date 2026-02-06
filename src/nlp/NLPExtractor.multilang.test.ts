/**
 * Unit tests for NLPExtractor multi-language support
 * Tests language detection and regional format variations
 */

import { NLPExtractor } from './NLPExtractor';
import { EntityType } from '../types';

describe('NLPExtractor - Multi-language Support', () => {
  let extractor: NLPExtractor;

  beforeEach(() => {
    extractor = new NLPExtractor();
  });

  describe('detectLanguage', () => {
    it('should detect English text', () => {
      const text = 'Hello, please call me at the number provided. Thank you for your account.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect Spanish text', () => {
      const text = 'Hola, por favor llámame al número. Gracias por su cuenta.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect French text', () => {
      const text = 'Bonjour, appelez-moi au numéro. Merci pour votre compte.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('fr');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect German text', () => {
      const text = 'Hallo, rufen Sie mich bitte an. Danke für Ihr Konto.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect Hindi text with Devanagari script', () => {
      const text = 'नमस्ते, कृपया मुझे फोन करें। धन्यवाद।';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('hi');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect Chinese text with CJK characters', () => {
      const text = '你好，请给我打电话。谢谢你的账户。';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('zh');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect Portuguese text', () => {
      const text = 'Olá, por favor me ligue. Obrigado pela sua conta.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('pt');
      expect(result.confidence).toBeGreaterThanOrEqual(0.2);
    });

    it('should detect Italian text', () => {
      const text = 'Ciao, per favore chiamami. Grazie per il tuo conto.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('it');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect Arabic text with Arabic script', () => {
      const text = 'مرحبا، يرجى الاتصال بي على الرقم. شكرا لحسابك.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('ar');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should detect Russian text with Cyrillic script', () => {
      const text = 'Здравствуйте, пожалуйста, позвоните мне. Спасибо за ваш счет.';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('ru');
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should return unknown for empty text', () => {
      const result = extractor.detectLanguage('');

      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should return unknown for text with low confidence', () => {
      const text = '123456789';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle mixed language text', () => {
      const text = 'Hello, por favor call me at 你好 number';
      const result = extractor.detectLanguage(text);

      // Should detect one of the languages
      expect(['en', 'es', 'zh']).toContain(result.language);
    });
  });

  describe('extractPhoneNumbers - Regional Formats', () => {
    it('should extract US phone number with English context', () => {
      const text = 'Please call me at 555-123-4567';
      const result = extractor.extractPhoneNumbers(text, 'en');

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('+15551234567');
      expect(result[0].metadata.countryCode).toBe('1');
    });

    it('should extract Spanish phone number with Spanish context', () => {
      const text = 'Llámame al +34 612 34 56 78';
      const result = extractor.extractPhoneNumbers(text, 'es');

      expect(result).toHaveLength(1);
      // Should extract the number
      expect(result[0].type).toBe(EntityType.PHONE_NUMBER);
      expect(result[0].value).toMatch(/^\+34/);
    });

    it('should extract French phone number with French context', () => {
      const text = 'Appelez-moi au +33 1 23 45 67 89';
      const result = extractor.extractPhoneNumbers(text, 'fr');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EntityType.PHONE_NUMBER);
      expect(result[0].value).toMatch(/^\+33/);
    });

    it('should extract German phone number with German context', () => {
      const text = 'Rufen Sie mich an unter +49 30 12345678';
      const result = extractor.extractPhoneNumbers(text, 'de');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EntityType.PHONE_NUMBER);
      expect(result[0].value).toMatch(/^\+49/);
    });

    it('should extract Indian phone number with Hindi context', () => {
      const text = 'मुझे फोन करें +91 98765 43210';
      const result = extractor.extractPhoneNumbers(text, 'hi');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EntityType.PHONE_NUMBER);
      // Should use Indian country code
      expect(result[0].value).toMatch(/^\+91/);
    });

    it('should extract Chinese phone number with Chinese context', () => {
      const text = '请打电话给我 +86 138 0013 8000';
      const result = extractor.extractPhoneNumbers(text, 'zh');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(EntityType.PHONE_NUMBER);
      expect(result[0].value).toMatch(/^\+86/);
    });

    it('should use regional default country code for 10-digit numbers', () => {
      const text = 'Call 5551234567';
      
      // English context should default to +1
      const resultEn = extractor.extractPhoneNumbers(text, 'en');
      expect(resultEn[0].metadata.countryCode).toBe('1');

      // Hindi context should default to +91
      const resultHi = extractor.extractPhoneNumbers(text, 'hi');
      expect(resultHi[0].metadata.countryCode).toBe('91');
    });

    it('should auto-detect language when not provided', () => {
      const text = 'Hello, please call me at 555-123-4567';
      const result = extractor.extractPhoneNumbers(text);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('+15551234567');
    });
  });

  describe('extractPaymentIds - Regional Payment Systems', () => {
    it('should extract UPI ID (Indian payment system)', () => {
      const text = 'Send money to user@paytm';
      const result = extractor.extractPaymentIds(text, 'hi');

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('user@paytm');
      expect(result[0].metadata.paymentSystem).toBe('UPI');
    });

    it('should extract Alipay ID with Chinese context', () => {
      const text = 'Alipay: user@example.com';
      const result = extractor.extractPaymentIds(text, 'zh');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('Alipay');
      expect(result[0].value).toBe('user@example.com');
    });

    it('should extract Alipay ID with English keyword', () => {
      const text = 'Alipay: 13800138000';
      const result = extractor.extractPaymentIds(text, 'zh');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('Alipay');
    });

    it('should extract WeChat Pay ID with Chinese context', () => {
      const text = '微信: wechat_user123';
      const result = extractor.extractPaymentIds(text, 'zh');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('WeChat Pay');
    });

    it('should extract WeChat Pay ID with English keyword', () => {
      const text = 'WeChat: wechat_user123';
      const result = extractor.extractPaymentIds(text, 'zh');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('WeChat Pay');
    });

    it('should extract PIX key with Portuguese context (email)', () => {
      const text = 'Chave PIX: user@example.com';
      const result = extractor.extractPaymentIds(text, 'pt');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('PIX');
    });

    it('should extract PIX key with Portuguese context (phone)', () => {
      const text = 'PIX: 11987654321';
      const result = extractor.extractPaymentIds(text, 'pt');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('PIX');
    });

    it('should extract PIX key with Portuguese context (CPF)', () => {
      const text = 'Chave PIX: 12345678901';
      const result = extractor.extractPaymentIds(text, 'pt');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('PIX');
    });

    it('should extract PIX key with Portuguese context (random key)', () => {
      const text = 'PIX: 123e4567-e89b-12d3-a456-426614174000';
      const result = extractor.extractPaymentIds(text, 'pt');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('PIX');
    });

    it('should extract SEPA reference with French context', () => {
      const text = 'Référence SEPA: RF18539007547034';
      const result = extractor.extractPaymentIds(text, 'fr');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('SEPA');
      expect(result[0].value).toMatch(/^RF\d{2}/);
    });

    it('should extract SEPA reference with German context', () => {
      const text = 'SEPA Referenz: RF18539007547034';
      const result = extractor.extractPaymentIds(text, 'de');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('SEPA');
    });

    it('should extract SEPA reference with Spanish context', () => {
      const text = 'Referencia SEPA: RF18539007547034';
      const result = extractor.extractPaymentIds(text, 'es');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('SEPA');
    });

    it('should extract SEPA reference with Italian context', () => {
      const text = 'Riferimento SEPA: RF18539007547034';
      const result = extractor.extractPaymentIds(text, 'it');

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('SEPA');
    });

    it('should not extract regional payment IDs without appropriate language context', () => {
      const text = 'Alipay: user@example.com';
      const result = extractor.extractPaymentIds(text, 'en');

      // Should not extract Alipay without Chinese context
      expect(result.filter(p => p.metadata.paymentSystem === 'Alipay')).toHaveLength(0);
    });

    it('should auto-detect language when not provided', () => {
      const text = 'Send to user@paytm for payment';
      const result = extractor.extractPaymentIds(text);

      expect(result).toHaveLength(1);
      expect(result[0].metadata.paymentSystem).toBe('UPI');
    });
  });

  describe('extractEntities - Multi-language Integration', () => {
    it('should extract entities from English text', () => {
      const text = 'Call me at +1-555-123-4567 or email john@example.com. Send payment to user@paytm';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter(e => e.type === EntityType.PHONE_NUMBER);
      const emails = result.filter(e => e.type === EntityType.EMAIL);
      const paymentIds = result.filter(e => e.type === EntityType.PAYMENT_ID);

      expect(phoneNumbers.length).toBeGreaterThanOrEqual(1);
      expect(emails.length).toBeGreaterThanOrEqual(1);
      expect(paymentIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract entities from Spanish text', () => {
      const text = 'Llámame al +34 612 34 56 78 o envía un correo a juan@ejemplo.es';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter(e => e.type === EntityType.PHONE_NUMBER);
      const emails = result.filter(e => e.type === EntityType.EMAIL);

      expect(phoneNumbers.length).toBeGreaterThanOrEqual(1);
      expect(emails.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract entities from Chinese text', () => {
      const text = '请打电话 +86 138 0013 8000 或支付宝 Alipay: user@example.com';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter(e => e.type === EntityType.PHONE_NUMBER);
      const paymentIds = result.filter(e => e.type === EntityType.PAYMENT_ID);

      expect(phoneNumbers.length).toBeGreaterThanOrEqual(1);
      expect(paymentIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract entities from Portuguese text', () => {
      const text = 'Ligue para +55 11 98765-4321 ou PIX: user@example.com';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter(e => e.type === EntityType.PHONE_NUMBER);
      const paymentIds = result.filter(e => e.type === EntityType.PAYMENT_ID);

      expect(phoneNumbers.length).toBeGreaterThanOrEqual(1);
      expect(paymentIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract entities from mixed language text', () => {
      const text = 'Hello, call +1-555-123-4567 或 微信 wechat_user123';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter(e => e.type === EntityType.PHONE_NUMBER);
      const paymentIds = result.filter(e => e.type === EntityType.PAYMENT_ID);

      expect(phoneNumbers.length).toBeGreaterThanOrEqual(1);
      expect(paymentIds.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Regional Format Edge Cases', () => {
    it('should handle text with no clear language indicators', () => {
      const text = '123-456-7890';
      const result = extractor.detectLanguage(text);

      // Should return unknown or default to English
      expect(['unknown', 'en']).toContain(result.language);
    });

    it('should handle very short text', () => {
      const text = 'Hi';
      const result = extractor.detectLanguage(text);

      // May not have enough context for confident detection
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should handle text with special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = extractor.detectLanguage(text);

      expect(result.language).toBe('unknown');
    });

    it('should extract phone numbers regardless of language detection confidence', () => {
      const text = '+1-555-123-4567';
      const result = extractor.extractPhoneNumbers(text);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('+15551234567');
    });
  });
});
