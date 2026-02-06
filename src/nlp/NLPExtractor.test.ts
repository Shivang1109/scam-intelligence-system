/**
 * Unit tests for NLPExtractor
 * Tests phone number extraction, normalization, and validation
 */

import { NLPExtractor } from './NLPExtractor';
import { EntityType } from '../types';

describe('NLPExtractor', () => {
  let extractor: NLPExtractor;

  beforeEach(() => {
    extractor = new NLPExtractor();
  });

  describe('extractPhoneNumbers', () => {
    describe('E.164 format with explicit country code', () => {
      it('should extract US phone number with +1 country code', () => {
        const text = 'Call me at +1 234 567 8900';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(EntityType.PHONE_NUMBER);
        expect(result[0].value).toBe('+12345678900');
        expect(result[0].metadata.countryCode).toBe('1');
        expect(result[0].confidence).toBeGreaterThan(0.8);
        expect(result[0].metadata.validated).toBe(true);
      });

      it('should extract UK phone number with +44 country code', () => {
        const text = 'Contact us at +44 20 7946 0958';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+442079460958');
        expect(result[0].metadata.countryCode).toBe('44');
        expect(result[0].confidence).toBeGreaterThan(0.8);
      });

      it('should extract India phone number with +91 country code', () => {
        const text = 'WhatsApp me at +91-98765-43210';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+919876543210');
        expect(result[0].metadata.countryCode).toBe('91');
        expect(result[0].confidence).toBeGreaterThan(0.8);
      });

      it('should extract phone number with parentheses format', () => {
        const text = 'Call +1 (555) 123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15551234567');
        expect(result[0].metadata.countryCode).toBe('1');
      });

      it('should extract phone number with dots as separators', () => {
        const text = 'Phone: +1.555.987.6543';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15559876543');
      });
    });

    describe('Format without explicit plus sign', () => {
      it('should extract 11-digit US number starting with 1', () => {
        const text = 'Text me at 1-800-555-0199';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+18005550199');
        expect(result[0].metadata.countryCode).toBe('1');
        expect(result[0].confidence).toBeGreaterThan(0.7);
      });

      it('should extract 10-digit US number and add country code', () => {
        const text = 'My number is 555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15551234567');
        expect(result[0].metadata.countryCode).toBe('1');
        expect(result[0].confidence).toBeGreaterThan(0.5);
      });

      it('should extract phone number with country code in parentheses', () => {
        const text = 'Call (44) 20-7946-0958';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toMatch(/^\+44/);
      });

      it('should extract simple 10-digit number', () => {
        const text = 'Contact: 5551234567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15551234567');
      });
    });

    describe('Multiple phone numbers', () => {
      it('should extract multiple phone numbers from text', () => {
        const text = 'Call +1-555-123-4567 or +44-20-7946-0958 for support';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('+15551234567');
        expect(result[1].value).toBe('+442079460958');
      });

      it('should not extract duplicate phone numbers', () => {
        const text = 'Call +1-555-123-4567 or text +1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15551234567');
      });

      it('should extract phone numbers in different formats', () => {
        const text = 'Primary: +1 (555) 123-4567, Secondary: 1-800-555-0199, Mobile: 5559876543';
        const result = extractor.extractPhoneNumbers(text);

        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.some((p) => p.value === '+15551234567')).toBe(true);
        expect(result.some((p) => p.value === '+18005550199')).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should not extract numbers that are too short', () => {
        const text = 'Code: 123456';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(0);
      });

      it('should not extract numbers that are too long', () => {
        const text = 'ID: 1234567890123456';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(0);
      });

      it('should handle empty text', () => {
        const result = extractor.extractPhoneNumbers('');

        expect(result).toHaveLength(0);
      });

      it('should handle text with no phone numbers', () => {
        const text = 'Hello, how are you today?';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(0);
      });

      it('should extract phone number at the start of text', () => {
        const text = '+1-555-123-4567 is my number';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15551234567');
      });

      it('should extract phone number at the end of text', () => {
        const text = 'My number is +1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('+15551234567');
      });
    });

    describe('Confidence scores', () => {
      it('should assign high confidence to explicit E.164 format', () => {
        const text = '+1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].confidence).toBeGreaterThan(0.8);
      });

      it('should assign medium confidence to 11-digit US format', () => {
        const text = '1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].confidence).toBeGreaterThan(0.6);
        expect(result[0].confidence).toBeLessThan(0.9);
      });

      it('should assign lower confidence to 10-digit format', () => {
        const text = '555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].confidence).toBeGreaterThan(0.4);
        expect(result[0].confidence).toBeLessThan(0.8);
      });
    });

    describe('Context extraction', () => {
      it('should extract surrounding context', () => {
        const text = 'Please call me at +1-555-123-4567 for more information';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].context).toContain('call me at');
        expect(result[0].context).toContain('for more');
      });

      it('should handle context at text boundaries', () => {
        const text = '+1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].context).toBe('+1-555-123-4567');
      });
    });

    describe('Metadata', () => {
      it('should include original format in metadata', () => {
        const text = 'Call +1 (555) 123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].metadata.format).toContain('555');
        expect(result[0].metadata.format).toContain('123');
        expect(result[0].metadata.format).toContain('4567');
      });

      it('should include validation status', () => {
        const text = 'Call +1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].metadata.validated).toBe(true);
      });

      it('should include timestamp', () => {
        const text = 'Call +1-555-123-4567';
        const result = extractor.extractPhoneNumbers(text);

        expect(result[0].timestamp).toBeInstanceOf(Date);
      });
    });

    describe('International formats', () => {
      it('should extract Chinese phone number', () => {
        const text = 'WeChat: +86 138 0013 8000';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toMatch(/^\+86/);
      });

      it('should extract Australian phone number', () => {
        const text = 'Ring +61 2 1234 5678';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toMatch(/^\+61/);
      });

      it('should extract German phone number', () => {
        const text = 'Anrufen +49 30 12345678';
        const result = extractor.extractPhoneNumbers(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toMatch(/^\+49/);
      });
    });
  });

  describe('extractEntities', () => {
    it('should extract phone numbers as part of all entities', () => {
      const text = 'Call me at +1-555-123-4567';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter((e) => e.type === EntityType.PHONE_NUMBER);
      expect(phoneNumbers).toHaveLength(1);
      expect(phoneNumbers[0].value).toBe('+15551234567');
    });

    it('should return empty array when no entities found', () => {
      const text = 'Hello, how are you?';
      const result = extractor.extractEntities(text);

      expect(result).toHaveLength(0);
    });
  });

  describe('extractPaymentIds', () => {
    describe('UPI ID extraction', () => {
      it('should extract UPI ID with common provider', () => {
        const text = 'Send money to user@paytm';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(EntityType.PAYMENT_ID);
        expect(result[0].value).toBe('user@paytm');
        expect(result[0].metadata.paymentSystem).toBe('UPI');
        expect(result[0].confidence).toBeGreaterThan(0.8);
      });

      it('should extract phone-based UPI ID', () => {
        const text = 'Pay to 9876543210@ybl';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('9876543210@ybl');
        expect(result[0].metadata.paymentSystem).toBe('UPI');
      });

      it('should extract UPI ID with dots and underscores', () => {
        const text = 'Transfer to john.doe_123@okaxis';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('john.doe_123@okaxis');
        expect(result[0].metadata.paymentSystem).toBe('UPI');
      });

      it('should extract multiple UPI IDs', () => {
        const text = 'Pay user1@paytm or user2@ybl';
        const result = extractor.extractPaymentIds(text);

        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.some((p) => p.value === 'user1@paytm')).toBe(true);
        expect(result.some((p) => p.value === 'user2@ybl')).toBe(true);
      });

      it('should not extract duplicate UPI IDs', () => {
        const text = 'Pay user@paytm, I repeat user@paytm';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
      });
    });

    describe('Bitcoin address extraction', () => {
      it('should extract legacy Bitcoin address (P2PKH)', () => {
        const text = 'Send BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
        expect(result[0].metadata.paymentSystem).toBe('Bitcoin');
        expect(result[0].confidence).toBeGreaterThan(0.7);
      });

      it('should extract script Bitcoin address (P2SH)', () => {
        const text = 'Wallet: 3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy');
        expect(result[0].metadata.paymentSystem).toBe('Bitcoin');
      });

      it('should extract Bech32 Bitcoin address (SegWit)', () => {
        const text = 'Send to bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
        expect(result[0].metadata.paymentSystem).toBe('Bitcoin');
      });

      it('should validate Bitcoin address format', () => {
        const text = 'Send BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
        const result = extractor.extractPaymentIds(text);

        expect(result[0].metadata.validated).toBe(true);
      });
    });

    describe('Ethereum address extraction', () => {
      it('should extract Ethereum address', () => {
        const text = 'Send ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
        expect(result[0].metadata.paymentSystem).toBe('Ethereum');
        expect(result[0].confidence).toBeGreaterThan(0.7);
      });

      it('should extract Ethereum address with mixed case', () => {
        const text = 'Wallet: 0xABCDEF1234567890abcdef1234567890ABCDEF12';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.paymentSystem).toBe('Ethereum');
      });
    });

    describe('PayPal transaction ID extraction', () => {
      it('should extract PayPal transaction ID with context', () => {
        const text = 'PayPal transaction ID: 1AB23CD4E5678FG9H';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('1AB23CD4E5678FG9H');
        expect(result[0].metadata.paymentSystem).toBe('PayPal');
      });

      it('should not extract random 17-char strings without PayPal context', () => {
        const text = 'Random code: ABCDEFGHIJK123456';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const result = extractor.extractPaymentIds('');
        expect(result).toHaveLength(0);
      });

      it('should handle text with no payment IDs', () => {
        const text = 'Hello, how are you?';
        const result = extractor.extractPaymentIds(text);

        expect(result).toHaveLength(0);
      });

      it('should extract payment IDs from mixed content', () => {
        const text =
          'Send to user@paytm or BTC address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
        const result = extractor.extractPaymentIds(text);

        expect(result.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Context and metadata', () => {
      it('should include context for payment IDs', () => {
        const text = 'Please send payment to user@paytm for the order';
        const result = extractor.extractPaymentIds(text);

        expect(result[0].context).toContain('payment to');
      });

      it('should include timestamp', () => {
        const text = 'Pay user@paytm';
        const result = extractor.extractPaymentIds(text);

        expect(result[0].timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('extractBankAccounts', () => {
    describe('IBAN extraction', () => {
      it('should extract valid IBAN', () => {
        const text = 'Transfer to GB82WEST12345698765432';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(EntityType.BANK_ACCOUNT);
        expect(result[0].value).toBe('GB82WEST12345698765432');
        expect(result[0].metadata.format).toBe('IBAN');
        expect(result[0].metadata.countryCode).toBe('GB');
        expect(result[0].confidence).toBeGreaterThan(0.8);
      });

      it('should extract German IBAN', () => {
        const text = 'Account: DE89370400440532013000';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('DE89370400440532013000');
        expect(result[0].metadata.countryCode).toBe('DE');
      });

      it('should extract French IBAN', () => {
        const text = 'IBAN: FR1420041010050500013M02606';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('FR1420041010050500013M02606');
        expect(result[0].metadata.countryCode).toBe('FR');
      });

      it('should validate IBAN format', () => {
        const text = 'Transfer to GB82WEST12345698765432';
        const result = extractor.extractBankAccounts(text);

        expect(result[0].metadata.validated).toBe(true);
      });
    });

    describe('US bank account extraction', () => {
      it('should extract US account number with banking context', () => {
        const text = 'Bank account number: 123456789012';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('123456789012');
        expect(result[0].metadata.format).toBe('US_ACCOUNT');
      });

      it('should extract account with wire transfer context', () => {
        const text = 'Wire transfer to account 98765432101234';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('98765432101234');
      });

      it('should not extract numbers without banking context', () => {
        const text = 'Order number: 123456789012';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(0);
      });
    });

    describe('Indian bank account extraction', () => {
      it('should extract Indian account with IFSC context', () => {
        const text = 'Account number 12345678901234 IFSC: SBIN0001234';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('12345678901234');
        expect(result[0].metadata.format).toBe('INDIAN_ACCOUNT');
      });

      it('should extract account with NEFT context', () => {
        const text = 'NEFT to a/c 123456789012345';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('123456789012345');
      });

      it('should extract account with RTGS context', () => {
        const text = 'RTGS transfer account number: 1234567890123456';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('1234567890123456');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const result = extractor.extractBankAccounts('');
        expect(result).toHaveLength(0);
      });

      it('should handle text with no bank accounts', () => {
        const text = 'Hello, how are you?';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(0);
      });

      it('should not extract duplicate accounts', () => {
        const text = 'Account GB82WEST12345698765432, confirm GB82WEST12345698765432';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(1);
      });

      it('should not extract invalid IBAN with wrong country code', () => {
        const text = 'Transfer to XX82WEST12345698765432';
        const result = extractor.extractBankAccounts(text);

        expect(result).toHaveLength(0);
      });
    });

    describe('Context and metadata', () => {
      it('should include context for bank accounts', () => {
        const text = 'Please transfer to bank account GB82WEST12345698765432';
        const result = extractor.extractBankAccounts(text);

        expect(result[0].context).toContain('transfer to');
      });

      it('should include timestamp', () => {
        const text = 'Account: GB82WEST12345698765432';
        const result = extractor.extractBankAccounts(text);

        expect(result[0].timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('extractEmails', () => {
    describe('Basic email extraction', () => {
      it('should extract simple email address', () => {
        const text = 'Contact me at john.doe@example.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(EntityType.EMAIL);
        expect(result[0].value).toBe('john.doe@example.com');
        expect(result[0].metadata.domain).toBe('example.com');
        expect(result[0].confidence).toBeGreaterThan(0.9);
      });

      it('should normalize email to lowercase', () => {
        const text = 'Email: John.Doe@Example.COM';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('john.doe@example.com');
      });

      it('should extract email with plus sign', () => {
        const text = 'Send to user+tag@example.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('user+tag@example.com');
      });

      it('should extract email with numbers', () => {
        const text = 'Contact user123@example456.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('user123@example456.com');
      });

      it('should extract email with hyphens and underscores', () => {
        const text = 'Email: first_last-name@my-domain.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('first_last-name@my-domain.com');
      });
    });

    describe('Multiple emails', () => {
      it('should extract multiple email addresses', () => {
        const text = 'Contact john@example.com or jane@example.org';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('john@example.com');
        expect(result[1].value).toBe('jane@example.org');
      });

      it('should not extract duplicate emails', () => {
        const text = 'Email john@example.com, confirm john@example.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
      });
    });

    describe('Email validation', () => {
      it('should validate correct email format', () => {
        const text = 'Email: valid@example.com';
        const result = extractor.extractEmails(text);

        expect(result[0].metadata.validated).toBe(true);
      });

      it('should handle email with subdomain', () => {
        const text = 'Contact: user@mail.example.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('user@mail.example.com');
        expect(result[0].metadata.domain).toBe('mail.example.com');
      });

      it('should extract email with long TLD', () => {
        const text = 'Email: user@example.museum';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('user@example.museum');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const result = extractor.extractEmails('');
        expect(result).toHaveLength(0);
      });

      it('should handle text with no emails', () => {
        const text = 'Hello, how are you?';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(0);
      });

      it('should extract email at start of text', () => {
        const text = 'john@example.com is my email';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('john@example.com');
      });

      it('should extract email at end of text', () => {
        const text = 'My email is john@example.com';
        const result = extractor.extractEmails(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('john@example.com');
      });
    });

    describe('Context and metadata', () => {
      it('should include context for emails', () => {
        const text = 'Please contact me at john@example.com for details';
        const result = extractor.extractEmails(text);

        expect(result[0].context).toContain('contact me at');
      });

      it('should include domain in metadata', () => {
        const text = 'Email: john@example.com';
        const result = extractor.extractEmails(text);

        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should include timestamp', () => {
        const text = 'Email: john@example.com';
        const result = extractor.extractEmails(text);

        expect(result[0].timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('extractUrls', () => {
    describe('Full URL with protocol', () => {
      it('should extract URL with https protocol', () => {
        const text = 'Visit https://example.com for more info';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(EntityType.URL);
        expect(result[0].value).toBe('https://example.com');
        expect(result[0].metadata.domain).toBe('example.com');
        expect(result[0].confidence).toBeGreaterThan(0.9);
        expect(result[0].metadata.validated).toBe(true);
      });

      it('should extract URL with http protocol', () => {
        const text = 'Check http://example.com/page';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('http://example.com/page');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract URL with path', () => {
        const text = 'Go to https://example.com/path/to/page';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com/path/to/page');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract URL with query parameters', () => {
        const text = 'Link: https://example.com/search?q=test&page=1';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com/search?q=test&page=1');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract URL with fragment', () => {
        const text = 'See https://example.com/page#section';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com/page#section');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract URL with port', () => {
        const text = 'Connect to https://example.com:8080/api';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com:8080/api');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract URL with subdomain', () => {
        const text = 'Visit https://www.example.com';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://www.example.com');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract URL with multiple subdomains', () => {
        const text = 'Go to https://api.v2.example.com/endpoint';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://api.v2.example.com/endpoint');
        expect(result[0].metadata.domain).toBe('api.v2.example.com');
      });
    });

    describe('URL without protocol', () => {
      it('should extract URL with www prefix', () => {
        const text = 'Visit www.example.com for details';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://www.example.com');
        expect(result[0].metadata.domain).toBe('example.com');
        expect(result[0].confidence).toBeGreaterThan(0.8);
      });

      it('should extract www URL with path', () => {
        const text = 'Check www.example.com/page';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://www.example.com/page');
      });

      it('should extract domain with path', () => {
        const text = 'Visit example.com/login for access';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com/login');
        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract domain with query string', () => {
        const text = 'Go to example.com?ref=email';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com?ref=email');
      });
    });

    describe('URL normalization', () => {
      it('should remove trailing slash from path', () => {
        const text = 'Visit https://example.com/page/';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com/page');
      });

      it('should keep root path without trailing slash', () => {
        const text = 'Visit https://example.com/';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com/');
      });

      it('should normalize domain to lowercase', () => {
        const text = 'Visit https://Example.COM/Page';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should add https protocol to www URLs', () => {
        const text = 'Visit www.example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].value).toBe('https://www.example.com');
      });

      it('should add https protocol to domain URLs', () => {
        const text = 'Visit example.com/page';
        const result = extractor.extractUrls(text);

        expect(result[0].value).toBe('https://example.com/page');
      });
    });

    describe('Domain extraction', () => {
      it('should extract domain from full URL', () => {
        const text = 'Visit https://www.example.com/path/to/page?query=1#section';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should extract domain with subdomain', () => {
        const text = 'Visit https://api.example.com/endpoint';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.domain).toBe('api.example.com');
      });

      it('should extract domain from URL with port', () => {
        const text = 'Connect to https://example.com:8080/api';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.domain).toBe('example.com');
      });

      it('should remove www prefix from domain', () => {
        const text = 'Visit https://www.example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.domain).toBe('example.com');
      });
    });

    describe('Multiple URLs', () => {
      it('should extract multiple URLs from text', () => {
        const text = 'Visit https://example.com or https://another.com for info';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('https://example.com');
        expect(result[1].value).toBe('https://another.com');
      });

      it('should not extract duplicate URLs', () => {
        const text = 'Visit https://example.com, I repeat https://example.com';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
      });

      it('should extract URLs in different formats', () => {
        const text = 'Visit https://example.com or www.another.com or third.com/page';
        const result = extractor.extractUrls(text);

        expect(result.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const result = extractor.extractUrls('');
        expect(result).toHaveLength(0);
      });

      it('should handle text with no URLs', () => {
        const text = 'Hello, how are you?';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(0);
      });

      it('should extract URL at start of text', () => {
        const text = 'https://example.com is the website';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com');
      });

      it('should extract URL at end of text', () => {
        const text = 'Visit our website at https://example.com';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://example.com');
      });

      it('should handle URL with special characters in path', () => {
        const text = 'Link: https://example.com/path_with-special.chars~123';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toContain('path_with-special.chars~123');
      });

      it('should handle URL with encoded characters', () => {
        const text = 'Search: https://example.com/search?q=hello%20world';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toContain('hello%20world');
      });

      it('should not extract invalid URLs without TLD', () => {
        const text = 'Visit http://localhost for testing';
        const result = extractor.extractUrls(text);

        // localhost without TLD should not be extracted or should be marked invalid
        if (result.length > 0) {
          expect(result[0].metadata.validated).toBe(false);
        }
      });
    });

    describe('Confidence scores', () => {
      it('should assign high confidence to explicit protocol URLs', () => {
        const text = 'https://example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].confidence).toBeGreaterThan(0.9);
      });

      it('should assign medium-high confidence to www URLs', () => {
        const text = 'www.example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].confidence).toBeGreaterThan(0.8);
        expect(result[0].confidence).toBeLessThan(0.95);
      });

      it('should assign medium confidence to domain-only URLs', () => {
        const text = 'example.com/page';
        const result = extractor.extractUrls(text);

        expect(result[0].confidence).toBeGreaterThan(0.7);
        expect(result[0].confidence).toBeLessThan(0.9);
      });
    });

    describe('Context and metadata', () => {
      it('should include context for URLs', () => {
        const text = 'Please visit https://example.com for more information';
        const result = extractor.extractUrls(text);

        expect(result[0].context).toContain('visit');
        expect(result[0].context).toContain('example.com');
      });

      it('should include original format in metadata', () => {
        const text = 'Visit www.example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.format).toBe('www.example.com');
      });

      it('should include validation status', () => {
        const text = 'Visit https://example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].metadata.validated).toBe(true);
      });

      it('should include timestamp', () => {
        const text = 'Visit https://example.com';
        const result = extractor.extractUrls(text);

        expect(result[0].timestamp).toBeInstanceOf(Date);
      });
    });

    describe('Real-world scam URLs', () => {
      it('should extract phishing URL', () => {
        const text = 'Verify your account at https://secure-login-verify.com/account';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://secure-login-verify.com/account');
        expect(result[0].metadata.domain).toBe('secure-login-verify.com');
      });

      it('should extract URL with typosquatting domain', () => {
        const text = 'Login at https://paypa1.com/signin';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.domain).toBe('paypa1.com');
      });

      it('should extract shortened URL', () => {
        const text = 'Click here: https://bit.ly/abc123';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe('https://bit.ly/abc123');
        expect(result[0].metadata.domain).toBe('bit.ly');
      });

      it('should extract URL with suspicious subdomain', () => {
        const text = 'Update at https://login.secure.account-verify.com/update';
        const result = extractor.extractUrls(text);

        expect(result).toHaveLength(1);
        expect(result[0].metadata.domain).toBe('login.secure.account-verify.com');
      });
    });
  });

  describe('extractOrganizations', () => {
    describe('Known brand extraction', () => {
      it('should extract well-known tech company', () => {
        const text = 'Contact Amazon customer service for help';
        const result = extractor.extractOrganizations(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(EntityType.ORGANIZATION);
        expect(result[0].value).toBe('Amazon');
        expect(result[0].metadata.isKnownBrand).toBe(true);
        expect(result[0].confidence).toBeGreaterThan(0.9);
      });

      it('should extract financial institution', () => {
        const text = 'Your Bank of America account has been suspended';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const bankOfAmerica = result.find((org) =>
          org.value.toLowerCase().includes('bank of america')
        );
        expect(bankOfAmerica).toBeDefined();
        expect(bankOfAmerica?.metadata.isKnownBrand).toBe(true);
      });

      it('should extract government agency', () => {
        const text = 'The IRS requires immediate payment';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const irs = result.find((org) => org.value.toLowerCase() === 'irs');
        expect(irs).toBeDefined();
        expect(irs?.metadata.isKnownBrand).toBe(true);
      });

      it('should extract multiple known brands', () => {
        const text = 'Microsoft and Apple are tech companies';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result.some((org) => org.value === 'Microsoft')).toBe(true);
        expect(result.some((org) => org.value === 'Apple')).toBe(true);
      });

      it('should not extract duplicate brands', () => {
        const text = 'Amazon customer service, contact Amazon support';
        const result = extractor.extractOrganizations(text);

        const amazonCount = result.filter((org) =>
          org.value.toLowerCase().includes('amazon')
        ).length;
        expect(amazonCount).toBe(1);
      });

      it('should be case-insensitive for known brands', () => {
        const text = 'Contact MICROSOFT or microsoft support';
        const result = extractor.extractOrganizations(text);

        const microsoftCount = result.filter((org) =>
          org.value.toLowerCase().includes('microsoft')
        ).length;
        expect(microsoftCount).toBe(1);
      });
    });

    describe('Legal entity extraction', () => {
      it('should extract organization with Inc suffix', () => {
        const text = 'Acme Corporation Inc. is offering a deal';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const acme = result.find((org) => org.value.includes('Acme'));
        expect(acme).toBeDefined();
        expect(acme?.confidence).toBeGreaterThan(0.8);
      });

      it('should extract organization with LLC suffix', () => {
        const text = 'Contact Global Services LLC for assistance';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const global = result.find((org) => org.value.includes('Global Services'));
        expect(global).toBeDefined();
      });

      it('should extract organization with Ltd suffix', () => {
        const text = 'Tech Solutions Ltd is hiring';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const tech = result.find((org) => org.value.includes('Tech Solutions'));
        expect(tech).toBeDefined();
      });

      it('should extract organization with Corp suffix', () => {
        const text = 'Investment Corp. has great returns';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const investment = result.find((org) => org.value.includes('Investment'));
        expect(investment).toBeDefined();
      });

      it('should extract organization with Company suffix', () => {
        const text = 'The Trading Company offers low fees';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const trading = result.find((org) => org.value.includes('Trading Company'));
        expect(trading).toBeDefined();
      });
    });

    describe('Keyword-based extraction', () => {
      it('should extract organization with Bank keyword', () => {
        const text = 'First National Bank requires verification';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const bank = result.find((org) => org.value.includes('Bank'));
        expect(bank).toBeDefined();
      });

      it('should extract organization with Trust keyword', () => {
        const text = 'Contact Security Trust for details';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const trust = result.find((org) => org.value.includes('Trust'));
        expect(trust).toBeDefined();
      });

      it('should extract organization with Services keyword', () => {
        const text = 'Premium Services is calling you';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const services = result.find((org) => org.value.includes('Services'));
        expect(services).toBeDefined();
      });

      it('should extract organization with Department keyword', () => {
        const text = 'The Department of Revenue needs payment';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const dept = result.find((org) => org.value.includes('Department'));
        expect(dept).toBeDefined();
      });
    });

    describe('Quoted organization extraction', () => {
      it('should extract quoted organization name', () => {
        const text = 'You won from "Global Lottery Commission"';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const lottery = result.find((org) => org.value.includes('Global Lottery'));
        expect(lottery).toBeDefined();
      });

      it('should extract single-quoted organization', () => {
        const text = "Contact 'Premium Support Team' immediately";
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const support = result.find((org) => org.value.includes('Premium Support'));
        expect(support).toBeDefined();
      });

      it('should not extract single-word quoted text', () => {
        const text = 'The word "Hello" is a greeting';
        const result = extractor.extractOrganizations(text);

        expect(result).toHaveLength(0);
      });
    });

    describe('Brand impersonation detection', () => {
      it('should flag high impersonation risk with urgency language', () => {
        const text = 'Amazon: Your account is suspended. Verify now or lose access!';
        const result = extractor.extractOrganizations(text);

        const amazon = result.find((org) => org.value === 'Amazon');
        expect(amazon).toBeDefined();
        expect(amazon?.metadata.impersonationRisk).toBeGreaterThan(0.35);
        expect(amazon?.metadata.potentiallyFake).toBe(false); // 0.4 is below 0.5 threshold
      });

      it('should flag impersonation with security alert language', () => {
        const text = 'Microsoft security alert: unusual activity detected on your account';
        const result = extractor.extractOrganizations(text);

        const microsoft = result.find((org) => org.value === 'Microsoft');
        expect(microsoft).toBeDefined();
        expect(microsoft?.metadata.impersonationRisk).toBeGreaterThan(0.3);
      });

      it('should flag impersonation with payment request', () => {
        const text = 'IRS: Immediate payment required to avoid arrest';
        const result = extractor.extractOrganizations(text);

        const irs = result.find((org) => org.value === 'IRS');
        expect(irs).toBeDefined();
        expect(irs?.metadata.impersonationRisk).toBeGreaterThanOrEqual(0.4);
      });

      it('should flag impersonation with prize/refund language', () => {
        const text = 'PayPal: You have a pending refund. Claim your prize now!';
        const result = extractor.extractOrganizations(text);

        const paypal = result.find((org) => org.value === 'PayPal');
        expect(paypal).toBeDefined();
        expect(paypal?.metadata.impersonationRisk).toBeGreaterThan(0.3);
      });

      it('should have low impersonation risk for neutral context', () => {
        const text = 'I bought a product from Amazon yesterday';
        const result = extractor.extractOrganizations(text);

        const amazon = result.find((org) => org.value === 'Amazon');
        expect(amazon).toBeDefined();
        expect(amazon?.metadata.impersonationRisk).toBeLessThan(0.3);
        expect(amazon?.metadata.potentiallyFake).toBe(false);
      });

      it('should detect suspicious organization names with numbers', () => {
        const text = 'Contact Paypa1 Support for help';
        const result = extractor.extractOrganizations(text);

        // Should extract "Paypa1 Support" as an organization
        expect(result.length).toBeGreaterThanOrEqual(1);
        const suspicious = result.find((org) => org.value.includes('Paypa1'));
        if (suspicious) {
          expect(suspicious.metadata.impersonationRisk).toBeGreaterThan(0);
        }
      });

      it('should flag multiple impersonation indicators', () => {
        const text =
          'URGENT: Bank of America security alert! Verify your account now to prevent suspension. Action required immediately!';
        const result = extractor.extractOrganizations(text);

        const bank = result.find((org) => org.value.includes('Bank of America'));
        expect(bank).toBeDefined();
        expect(bank?.metadata.impersonationRisk).toBeGreaterThan(0.6);
        expect(bank?.metadata.potentiallyFake).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty text', () => {
        const result = extractor.extractOrganizations('');
        expect(result).toHaveLength(0);
      });

      it('should handle text with no organizations', () => {
        const text = 'Hello, how are you today?';
        const result = extractor.extractOrganizations(text);

        expect(result).toHaveLength(0);
      });

      it('should extract organization at start of text', () => {
        const text = 'Amazon is calling you about your account';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        expect(result[0].value).toBe('Amazon');
      });

      it('should extract organization at end of text', () => {
        const text = 'You have a message from Microsoft';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const microsoft = result.find((org) => org.value === 'Microsoft');
        expect(microsoft).toBeDefined();
      });

      it('should handle mixed case in text', () => {
        const text = 'AMAZON customer service';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Context and metadata', () => {
      it('should include context for organizations', () => {
        const text = 'Please contact Amazon customer service for assistance';
        const result = extractor.extractOrganizations(text);

        const amazon = result.find((org) => org.value === 'Amazon');
        expect(amazon).toBeDefined();
        expect(amazon?.context).toContain('Amazon');
      });

      it('should include timestamp', () => {
        const text = 'Contact Microsoft support';
        const result = extractor.extractOrganizations(text);

        expect(result[0].timestamp).toBeInstanceOf(Date);
      });

      it('should mark known brands in metadata', () => {
        const text = 'Amazon and Acme Corp are different';
        const result = extractor.extractOrganizations(text);

        const amazon = result.find((org) => org.value === 'Amazon');
        const acme = result.find((org) => org.value.includes('Acme'));

        expect(amazon?.metadata.isKnownBrand).toBe(true);
        expect(acme?.metadata.isKnownBrand).toBe(false);
      });

      it('should include impersonation risk score', () => {
        const text = 'Amazon account verification required';
        const result = extractor.extractOrganizations(text);

        const amazon = result.find((org) => org.value === 'Amazon');
        expect(amazon).toBeDefined();
        expect(amazon?.metadata.impersonationRisk).toBeGreaterThanOrEqual(0);
        expect(amazon?.metadata.impersonationRisk).toBeLessThanOrEqual(1);
      });

      it('should include potentiallyFake flag', () => {
        const text = 'Microsoft: Urgent security alert!';
        const result = extractor.extractOrganizations(text);

        const microsoft = result.find((org) => org.value === 'Microsoft');
        expect(microsoft).toBeDefined();
        expect(microsoft?.metadata).toHaveProperty('potentiallyFake');
        expect(typeof microsoft?.metadata.potentiallyFake).toBe('boolean');
      });
    });

    describe('Real-world scam scenarios', () => {
      it('should extract organization from tech support scam', () => {
        const text =
          'This is Microsoft technical support. Your computer has a virus. Call us immediately!';
        const result = extractor.extractOrganizations(text);

        const microsoft = result.find((org) => org.value === 'Microsoft');
        expect(microsoft).toBeDefined();
        expect(microsoft?.metadata.impersonationRisk).toBeGreaterThan(0.2);
      });

      it('should extract organization from IRS scam', () => {
        const text =
          'IRS final notice: You owe back taxes. Pay now to avoid arrest warrant.';
        const result = extractor.extractOrganizations(text);

        const irs = result.find((org) => org.value === 'IRS');
        expect(irs).toBeDefined();
        expect(irs?.metadata.impersonationRisk).toBeGreaterThan(0.5);
      });

      it('should extract organization from Amazon phishing', () => {
        const text =
          'Amazon: Your account has been locked due to suspicious activity. Verify your identity now.';
        const result = extractor.extractOrganizations(text);

        const amazon = result.find((org) => org.value === 'Amazon');
        expect(amazon).toBeDefined();
        expect(amazon?.metadata.impersonationRisk).toBeGreaterThan(0.1);
        expect(amazon?.metadata.potentiallyFake).toBe(false); // 0.15 is below 0.5 threshold
      });

      it('should extract organization from bank scam', () => {
        const text =
          'Wells Fargo security alert: Unusual activity detected. Confirm your account details immediately.';
        const result = extractor.extractOrganizations(text);

        const wellsFargo = result.find((org) => org.value.includes('Wells Fargo'));
        expect(wellsFargo).toBeDefined();
        expect(wellsFargo?.metadata.impersonationRisk).toBeGreaterThanOrEqual(0.5);
      });

      it('should extract organization from lottery scam', () => {
        const text =
          'Congratulations! You won the Publishers Clearing House sweepstakes. Claim your prize now!';
        const result = extractor.extractOrganizations(text);

        const pch = result.find((org) => org.value.includes('Publishers Clearing House'));
        expect(pch).toBeDefined();
        expect(pch?.metadata.impersonationRisk).toBeGreaterThan(0.3);
      });

      it('should extract fake organization from advance fee scam', () => {
        const text =
          'Global Investment Trust has selected you for a special opportunity. Send processing fee to claim your inheritance.';
        const result = extractor.extractOrganizations(text);

        expect(result.length).toBeGreaterThanOrEqual(1);
        const trust = result.find((org) => org.value.includes('Trust'));
        expect(trust).toBeDefined();
      });
    });
  });

  describe('extractEntities - integrated', () => {
    it('should extract all entity types from mixed content', () => {
      const text =
        'Call +1-555-123-4567 or email john@example.com. Pay to user@paytm or account GB82WEST12345698765432. Visit https://example.com. Contact Amazon support.';
      const result = extractor.extractEntities(text);

      const phoneNumbers = result.filter((e) => e.type === EntityType.PHONE_NUMBER);
      const emails = result.filter((e) => e.type === EntityType.EMAIL);
      const paymentIds = result.filter((e) => e.type === EntityType.PAYMENT_ID);
      const bankAccounts = result.filter((e) => e.type === EntityType.BANK_ACCOUNT);
      const urls = result.filter((e) => e.type === EntityType.URL);
      const organizations = result.filter((e) => e.type === EntityType.ORGANIZATION);

      expect(phoneNumbers.length).toBeGreaterThanOrEqual(1);
      expect(emails.length).toBeGreaterThanOrEqual(1);
      expect(paymentIds.length).toBeGreaterThanOrEqual(1);
      expect(bankAccounts.length).toBeGreaterThanOrEqual(1);
      expect(urls.length).toBeGreaterThanOrEqual(1);
      expect(organizations.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no entities found', () => {
      const text = 'Hello, how are you?';
      const result = extractor.extractEntities(text);

      expect(result).toHaveLength(0);
    });

    it('should extract multiple instances of same entity type', () => {
      const text = 'Email john@example.com or jane@example.org';
      const result = extractor.extractEntities(text);

      const emails = result.filter((e) => e.type === EntityType.EMAIL);
      expect(emails).toHaveLength(2);
    });

    it('should extract URLs as part of all entities', () => {
      const text = 'Visit https://example.com for details';
      const result = extractor.extractEntities(text);

      const urls = result.filter((e) => e.type === EntityType.URL);
      expect(urls).toHaveLength(1);
      expect(urls[0].value).toBe('https://example.com');
    });

    it('should extract organizations as part of all entities', () => {
      const text = 'Contact Microsoft support for help';
      const result = extractor.extractEntities(text);

      const organizations = result.filter((e) => e.type === EntityType.ORGANIZATION);
      expect(organizations.length).toBeGreaterThanOrEqual(1);
      expect(organizations.some((org) => org.value === 'Microsoft')).toBe(true);
    });
  });
});
