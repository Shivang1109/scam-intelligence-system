/**
 * NLP Extractor Implementation
 * Extracts structured entities from conversation text
 */

import {
  Entity,
  EntityType,
  PhoneNumber,
  PaymentId,
  URL,
  Organization,
  BankAccount,
  Email,
} from '../types';
import { NLPExtractor as INLPExtractor } from './interfaces';
import { logger } from '../utils/logger';

export class NLPExtractor implements INLPExtractor {
  /**
   * Extract all entities from text
   * Detects language and uses regional format variations
   */
  extractEntities(text: string, conversationId?: string): Entity[] {
    const entities: Entity[] = [];

    // Detect language once for all extractions
    const { language } = this.detectLanguage(text);

    entities.push(...this.extractPhoneNumbers(text, language));
    entities.push(...this.extractPaymentIds(text, language));
    entities.push(...this.extractUrls(text));
    entities.push(...this.extractOrganizations(text));
    entities.push(...this.extractBankAccounts(text));
    entities.push(...this.extractEmails(text));

    // Log entity extraction
    if (conversationId && entities.length > 0) {
      const entityCounts = entities.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(entityCounts).forEach(([type, count]) => {
        logger.entityExtracted(conversationId, type, count);
      });
    }

    return entities;
  }

  /**
   * Extract phone numbers from text
   * Supports international formats with country codes
   * Normalizes to E.164 format
   * Handles regional format variations
   */
  extractPhoneNumbers(text: string, language?: string): PhoneNumber[] {
    const phoneNumbers: PhoneNumber[] = [];
    const timestamp = new Date();

    // Detect language if not provided
    if (!language) {
      const detection = this.detectLanguage(text);
      language = detection.language;
    }

    // Regex patterns for international phone numbers
    // Pattern 1: +[country code][number] (E.164 format)
    // Pattern 2: [country code] [number] with various separators
    // Pattern 3: (country code) number
    const patterns = [
      // E.164 format: +1234567890 to +123456789012345
      /\+(\d{1,3})[\s.-]?(\d{1,4})[\s.-]?(\d{1,4})[\s.-]?(\d{1,9})/g,
      // Format with parentheses: +1 (234) 567-8900
      /\+(\d{1,3})[\s.-]?\((\d{1,4})\)[\s.-]?(\d{1,4})[\s.-]?(\d{1,9})/g,
      // Format with country code in parentheses: (1) 234-567-8900 or (44) 20-7946-0958
      /\((\d{1,3})\)[\s.-]?(\d{2,4})[\s.-]?(\d{3,4})[\s.-]?(\d{2,9})/g,
      // Format without plus: 1 234 567 8900, 1-234-567-8900
      /(?:^|[^\d+])(\d{1,3})[\s.-](\d{3,4})[\s.-](\d{3,4})[\s.-]?(\d{2,9})(?:[^\d]|$)/g,
      // 10-digit format with separators: 555-123-4567
      /(?:^|[^\d+])(\d{3})[\s.-](\d{3})[\s.-](\d{4})(?:[^\d]|$)/g,
      // Simple format: 10-15 digits with optional separators
      /(?:^|[^\d+])(\d{10,15})(?:[^\d]|$)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0].trim();
        const context = this.extractContext(text, match.index, fullMatch.length);

        // Extract digits only
        const digitsOnly = fullMatch.replace(/\D/g, '');

        // Skip if too short or too long
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          continue;
        }

        // Determine country code and normalize to E.164
        const { normalized, countryCode, confidence } = this.normalizePhoneNumber(
          digitsOnly,
          fullMatch,
          language
        );

        // Skip duplicates
        if (phoneNumbers.some((p) => p.value === normalized)) {
          continue;
        }

        phoneNumbers.push({
          type: EntityType.PHONE_NUMBER,
          value: normalized,
          confidence,
          context,
          timestamp,
          metadata: {
            countryCode,
            format: fullMatch,
            validated: this.validatePhoneNumber(normalized),
          },
        });
      }
    }

    return phoneNumbers;
  }

  /**
   * Normalize phone number to E.164 format
   * Returns normalized number, country code, and confidence score
   * Uses regional information for better normalization
   */
  private normalizePhoneNumber(
    digitsOnly: string,
    originalFormat: string,
    language?: string
  ): { normalized: string; countryCode: string; confidence: number } {
    let countryCode = '';
    let nationalNumber = digitsOnly;
    let confidence = 0.5; // Base confidence

    // Get regional information if language is provided
    const regionalInfo = language ? this.getRegionalPhoneInfo(language) : null;

    // Check if it starts with a plus sign (explicit country code)
    if (originalFormat.startsWith('+')) {
      confidence = 0.9; // High confidence for explicit format

      // Extract country code (1-3 digits)
      if (digitsOnly.length >= 10) {
        // Try 1-digit country code (e.g., +1 for US/Canada)
        if (digitsOnly[0] === '1' && digitsOnly.length === 11) {
          countryCode = '1';
          nationalNumber = digitsOnly.slice(1);
        }
        // Try 2-digit country code
        else if (digitsOnly.length >= 11 && digitsOnly.length <= 13) {
          countryCode = digitsOnly.slice(0, 2);
          nationalNumber = digitsOnly.slice(2);
        }
        // Try 3-digit country code
        else if (digitsOnly.length >= 12) {
          countryCode = digitsOnly.slice(0, 3);
          nationalNumber = digitsOnly.slice(3);
        } else {
          // Default to 1 for shorter numbers
          countryCode = digitsOnly[0];
          nationalNumber = digitsOnly.slice(1);
        }
      }
    }
    // Check for common country code patterns
    else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      // US/Canada format: 1XXXXXXXXXX
      countryCode = '1';
      nationalNumber = digitsOnly.slice(1);
      confidence = 0.8;
    } else if (digitsOnly.length === 12 && ['44', '91', '86'].includes(digitsOnly.slice(0, 2))) {
      // UK (44), India (91), China (86)
      countryCode = digitsOnly.slice(0, 2);
      nationalNumber = digitsOnly.slice(2);
      confidence = 0.7;
    } else if (digitsOnly.length === 10) {
      // Assume regional default country code or US/Canada without country code
      countryCode = regionalInfo?.defaultCountryCode || '1';
      nationalNumber = digitsOnly;
      confidence = regionalInfo ? 0.7 : 0.6; // Higher confidence if we have regional info
    } else if (digitsOnly.length >= 11 && digitsOnly.length <= 13) {
      // Try to infer country code
      countryCode = digitsOnly.slice(0, digitsOnly.length - 10);
      nationalNumber = digitsOnly.slice(digitsOnly.length - 10);
      confidence = 0.5;
    } else {
      // Unknown format, use first digit as country code
      countryCode = digitsOnly[0] || '1';
      nationalNumber = digitsOnly.slice(1) || digitsOnly;
      confidence = 0.4;
    }

    // Construct E.164 format: +[country code][national number]
    const normalized = `+${countryCode}${nationalNumber}`;

    return { normalized, countryCode, confidence };
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(e164Number: string): boolean {
    // E.164 format: +[1-3 digit country code][4-14 digit number]
    const e164Pattern = /^\+\d{1,3}\d{4,14}$/;
    return e164Pattern.test(e164Number);
  }

  /**
   * Extract surrounding context for an entity
   */
  private extractContext(text: string, index: number, length: number): string {
    const contextRadius = 50;
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(text.length, index + length + contextRadius);
    return text.slice(start, end).trim();
  }

  /**
   * Extract payment IDs from text
   * Supports UPI IDs, wallet addresses, and other payment identifiers
   * Handles regional payment system variations
   */
  extractPaymentIds(text: string, language?: string): PaymentId[] {
    const paymentIds: PaymentId[] = [];
    const timestamp = new Date();

    // Detect language if not provided
    if (!language) {
      const detection = this.detectLanguage(text);
      language = detection.language;
    }

    // UPI ID pattern: username@bankname (e.g., user@paytm, 9876543210@ybl)
    const upiPattern = /\b([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)\b/g;
    let match;

    while ((match = upiPattern.exec(text)) !== null) {
      const value = match[1];
      const context = this.extractContext(text, match.index, value.length);

      // Validate UPI format (should have @ and valid characters)
      if (this.isValidUPI(value)) {
        // Skip duplicates
        if (paymentIds.some((p) => p.value === value)) {
          continue;
        }

        paymentIds.push({
          type: EntityType.PAYMENT_ID,
          value,
          confidence: 0.85,
          context,
          timestamp,
          metadata: {
            paymentSystem: 'UPI',
            format: value,
            validated: true,
          },
        });
      }
    }

    // Cryptocurrency wallet addresses
    // Bitcoin: 26-35 alphanumeric characters starting with 1, 3, or bc1
    const btcPattern = /\b([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g;
    while ((match = btcPattern.exec(text)) !== null) {
      const value = match[1];
      const context = this.extractContext(text, match.index, value.length);

      // Skip duplicates
      if (paymentIds.some((p) => p.value === value)) {
        continue;
      }

      paymentIds.push({
        type: EntityType.PAYMENT_ID,
        value,
        confidence: 0.8,
        context,
        timestamp,
        metadata: {
          paymentSystem: 'Bitcoin',
          format: value,
          validated: this.isValidBitcoinAddress(value),
        },
      });
    }

    // Ethereum: 0x followed by 40 hexadecimal characters
    const ethPattern = /\b(0x[a-fA-F0-9]{40})\b/g;
    while ((match = ethPattern.exec(text)) !== null) {
      const value = match[1];
      const context = this.extractContext(text, match.index, value.length);

      // Skip duplicates
      if (paymentIds.some((p) => p.value === value)) {
        continue;
      }

      paymentIds.push({
        type: EntityType.PAYMENT_ID,
        value,
        confidence: 0.8,
        context,
        timestamp,
        metadata: {
          paymentSystem: 'Ethereum',
          format: value,
          validated: true,
        },
      });
    }

    // PayPal transaction IDs: typically alphanumeric, 17 characters
    const paypalPattern = /\b([A-Z0-9]{17})\b/g;
    while ((match = paypalPattern.exec(text)) !== null) {
      const value = match[1];
      const context = this.extractContext(text, match.index, value.length);

      // Only consider as PayPal if context mentions paypal or transaction
      if (
        context.toLowerCase().includes('paypal') ||
        context.toLowerCase().includes('transaction')
      ) {
        // Skip duplicates
        if (paymentIds.some((p) => p.value === value)) {
          continue;
        }

        paymentIds.push({
          type: EntityType.PAYMENT_ID,
          value,
          confidence: 0.7,
          context,
          timestamp,
          metadata: {
            paymentSystem: 'PayPal',
            format: value,
            validated: true,
          },
        });
      }
    }

    // Regional payment systems based on language
    if (language === 'zh') {
      // Alipay ID: typically email or phone number format
      const alipayPattern = /\b(支付宝|alipay)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{11})\b/gi;
      while ((match = alipayPattern.exec(text)) !== null) {
        const value = match[2];
        const context = this.extractContext(text, match.index, value.length);

        if (paymentIds.some((p) => p.value === value)) {
          continue;
        }

        paymentIds.push({
          type: EntityType.PAYMENT_ID,
          value,
          confidence: 0.85,
          context,
          timestamp,
          metadata: {
            paymentSystem: 'Alipay',
            format: value,
            validated: true,
          },
        });
      }

      // WeChat Pay ID
      const wechatPattern = /\b(微信|wechat)[:\s]*([a-zA-Z0-9_-]{6,20})\b/gi;
      while ((match = wechatPattern.exec(text)) !== null) {
        const value = match[2];
        const context = this.extractContext(text, match.index, value.length);

        if (paymentIds.some((p) => p.value === value)) {
          continue;
        }

        paymentIds.push({
          type: EntityType.PAYMENT_ID,
          value,
          confidence: 0.85,
          context,
          timestamp,
          metadata: {
            paymentSystem: 'WeChat Pay',
            format: value,
            validated: true,
          },
        });
      }
    }

    // PIX (Brazilian instant payment system)
    if (language === 'pt') {
      // PIX key can be email, phone, CPF, or random key
      const pixPattern = /\b(pix|chave pix)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{11}|\d{14}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi;
      while ((match = pixPattern.exec(text)) !== null) {
        const value = match[2];
        const context = this.extractContext(text, match.index, value.length);

        if (paymentIds.some((p) => p.value === value)) {
          continue;
        }

        paymentIds.push({
          type: EntityType.PAYMENT_ID,
          value,
          confidence: 0.85,
          context,
          timestamp,
          metadata: {
            paymentSystem: 'PIX',
            format: value,
            validated: true,
          },
        });
      }
    }

    // SEPA (European payment system) - IBAN-based
    if (['fr', 'de', 'es', 'it'].includes(language || '')) {
      // SEPA reference: typically starts with RF followed by 2 check digits and up to 21 characters
      const sepaPattern = /\b(RF\d{2}[A-Z0-9]{1,21})\b/gi;
      while ((match = sepaPattern.exec(text)) !== null) {
        const value = match[1].toUpperCase();
        const context = this.extractContext(text, match.index, value.length);

        if (paymentIds.some((p) => p.value === value)) {
          continue;
        }

        paymentIds.push({
          type: EntityType.PAYMENT_ID,
          value,
          confidence: 0.8,
          context,
          timestamp,
          metadata: {
            paymentSystem: 'SEPA',
            format: value,
            validated: true,
          },
        });
      }
    }

    return paymentIds;
  }

  /**
   * Validate UPI ID format
   */
  private isValidUPI(upi: string): boolean {
    // UPI format: username@provider
    // Username can contain letters, numbers, dots, underscores, hyphens
    // Provider is typically a bank code or payment service
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiPattern.test(upi)) {
      return false;
    }

    // Common UPI providers
    const commonProviders = [
      'paytm',
      'ybl',
      'okaxis',
      'okicici',
      'oksbi',
      'okhdfc',
      'ibl',
      'axl',
      'upi',
      'gpay',
      'phonepe',
    ];

    const provider = upi.split('@')[1].toLowerCase();
    return commonProviders.some((p) => provider.includes(p));
  }

  /**
   * Validate Bitcoin address format
   */
  private isValidBitcoinAddress(address: string): boolean {
    // Basic validation for Bitcoin addresses
    // Legacy (P2PKH): starts with 1, 26-35 characters
    // Script (P2SH): starts with 3, 26-35 characters
    // Bech32 (SegWit): starts with bc1, 42-62 characters
    if (address.startsWith('1') || address.startsWith('3')) {
      return address.length >= 26 && address.length <= 35;
    } else if (address.startsWith('bc1')) {
      return address.length >= 42 && address.length <= 62;
    }
    return false;
  }

  /**
   * Extract URLs from text
   * TODO: Implement in task 4.3
   */
  /**
     * Extract URLs from text
     * Normalizes URLs (protocol, trailing slashes)
     * Extracts domain from full URLs
     */
    /**
       * Extract URLs from text
       * Normalizes URLs (protocol, trailing slashes)
       * Extracts domain from full URLs
       */
      extractUrls(text: string): URL[] {
        const urls: URL[] = [];
        const timestamp = new Date();

        // Track matched positions to avoid overlapping matches
        const matchedRanges: Array<{ start: number; end: number }> = [];

        // URL patterns
        // Pattern 1: Full URL with protocol (http:// or https://)
        // Pattern 2: URL without protocol (www.example.com or example.com/path)
        const patterns = [
          // Full URL with protocol: http://example.com or https://example.com/path
          /\b(https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,
          // URL with www prefix: www.example.com/path
          /\b(www\.[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,
          // Domain with path but no protocol: example.com/path (must have TLD and path/query)
          /\b([a-zA-Z0-9][-a-zA-Z0-9]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,6})([/?#][-a-zA-Z0-9()@:%_+.~#?&/=]+)/gi,
        ];

        const seenUrls = new Set<string>();

        // Helper function to check if a range overlaps with already matched ranges
        const isOverlapping = (start: number, end: number): boolean => {
          return matchedRanges.some(
            (range) =>
              (start >= range.start && start < range.end) ||
              (end > range.start && end <= range.end) ||
              (start <= range.start && end >= range.end)
          );
        };

        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            let rawUrl = match[1];

            // For pattern 3, combine domain and path
            if (match[2]) {
              rawUrl = match[1] + match[2];
            }

            // Check if this match overlaps with an already extracted URL
            const matchStart = match.index;
            const matchEnd = match.index + rawUrl.length;
            if (isOverlapping(matchStart, matchEnd)) {
              continue;
            }

            const context = this.extractContext(text, match.index, rawUrl.length);

            // Normalize the URL
            const { normalized, domain, confidence } = this.normalizeUrl(rawUrl);

            // Skip duplicates
            if (seenUrls.has(normalized)) {
              continue;
            }
            seenUrls.add(normalized);

            // Validate URL format
            const validated = this.validateUrl(normalized);

            urls.push({
              type: EntityType.URL,
              value: normalized,
              confidence,
              context,
              timestamp,
              metadata: {
                domain,
                format: rawUrl,
                validated,
              },
            });

            // Record this match to prevent overlaps
            matchedRanges.push({ start: matchStart, end: matchEnd });
          }
        }

        return urls;
      }

    /**
     * Normalize URL to standard format
     * - Add protocol if missing
     * - Remove trailing slashes (except for root path)
     * - Extract domain
     */
    /**
       * Normalize URL to standard format
       * - Add protocol if missing
       * - Remove trailing slashes (except for root path)
       * - Extract domain
       */
      private normalizeUrl(
        rawUrl: string
      ): { normalized: string; domain: string; confidence: number } {
        let normalized = rawUrl.trim();
        let confidence = 0.7; // Base confidence

        // Add protocol if missing
        if (!normalized.match(/^https?:\/\//i)) {
          if (normalized.startsWith('www.')) {
            normalized = 'https://' + normalized;
            confidence = 0.85; // High confidence for www prefix
          } else {
            normalized = 'https://' + normalized;
            confidence = 0.75; // Medium confidence for domain-only
          }
        } else {
          confidence = 0.95; // Highest confidence for explicit protocol
        }

        // Remove trailing slash (except for root path)
        // https://example.com/ -> keep as is (root path)
        // https://example.com/path/ -> https://example.com/path
        const urlParts = normalized.split('/');
        // If there are more than 3 parts (protocol, empty, domain, path...) and ends with slash
        if (normalized.endsWith('/') && urlParts.length > 4) {
          normalized = normalized.slice(0, -1);
        }

        // Extract domain from URL
        const domain = this.extractDomain(normalized);

        return { normalized, domain, confidence };
      }

    /**
     * Extract domain from full URL
     */
    private extractDomain(url: string): string {
      try {
        // Remove protocol
        let domain = url.replace(/^https?:\/\//i, '');

        // Remove path, query, and fragment
        domain = domain.split('/')[0];
        domain = domain.split('?')[0];
        domain = domain.split('#')[0];

        // Remove port if present
        domain = domain.split(':')[0];

        // Remove www prefix for consistency
        if (domain.startsWith('www.')) {
          domain = domain.slice(4);
        }

        return domain.toLowerCase();
      } catch (error) {
        return '';
      }
    }

    /**
     * Validate URL format
     */
    private validateUrl(url: string): boolean {
      try {
        // Check if URL has valid protocol
        if (!url.match(/^https?:\/\//i)) {
          return false;
        }

        // Check if URL has valid domain structure
        const domainPart = url.replace(/^https?:\/\//i, '').split('/')[0];

        // Domain should have at least one dot and valid characters
        if (!domainPart.includes('.')) {
          return false;
        }

        // Check for valid domain characters
        const domainPattern = /^[a-zA-Z0-9][-a-zA-Z0-9.]{0,253}[a-zA-Z0-9]$/;
        if (!domainPattern.test(domainPart.split(':')[0])) {
          return false;
        }

        // Check TLD is at least 2 characters
        const parts = domainPart.split('.');
        const tld = parts[parts.length - 1];
        if (tld.length < 2) {
          return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    }

  /**
   * Extract organization names from text
   * Uses NER patterns and brand impersonation detection
   */
  extractOrganizations(text: string): Organization[] {
    const organizations: Organization[] = [];
    const timestamp = new Date();

    // Common organization indicators and patterns
    const organizationIndicators = [
      'Inc',
      'LLC',
      'Ltd',
      'Corporation',
      'Corp',
      'Company',
      'Co',
      'Group',
      'Bank',
      'Trust',
      'Services',
      'Solutions',
      'Technologies',
      'Tech',
      'Systems',
      'Enterprises',
      'Holdings',
      'Partners',
      'Associates',
      'Foundation',
      'Institute',
      'Agency',
      'Department',
      'Ministry',
      'Bureau',
    ];

    // Well-known brands that are commonly impersonated in scams
    const knownBrands = [
      // Tech companies
      'Amazon',
      'Microsoft',
      'Apple',
      'Google',
      'Facebook',
      'Meta',
      'Netflix',
      'PayPal',
      'eBay',
      'Twitter',
      'Instagram',
      'WhatsApp',
      'Telegram',
      'LinkedIn',
      'TikTok',
      'Snapchat',
      'YouTube',
      'Adobe',
      'Oracle',
      'IBM',
      'Intel',
      'Samsung',
      'Sony',
      'Dell',
      'HP',
      'Lenovo',
      // Financial institutions
      'Bank of America',
      'Wells Fargo',
      'Chase',
      'JPMorgan',
      'Citibank',
      'HSBC',
      'Barclays',
      'Goldman Sachs',
      'Morgan Stanley',
      'American Express',
      'Visa',
      'Mastercard',
      'Discover',
      'Capital One',
      'US Bank',
      'PNC Bank',
      'TD Bank',
      'ICICI Bank',
      'HDFC Bank',
      'State Bank of India',
      'SBI',
      'Axis Bank',
      'Kotak',
      // Government agencies
      'IRS',
      'FBI',
      'CIA',
      'NSA',
      'Social Security',
      'Medicare',
      'Medicaid',
      'Department of Justice',
      'Homeland Security',
      'Immigration',
      'Customs',
      'Border Protection',
      'Treasury',
      'Federal Reserve',
      // Delivery/Logistics
      'FedEx',
      'UPS',
      'DHL',
      'USPS',
      'Amazon Logistics',
      // Telecom
      'Verizon',
      'AT&T',
      'T-Mobile',
      'Sprint',
      'Comcast',
      'Xfinity',
      'Spectrum',
      // Other commonly impersonated
      'Geek Squad',
      'Norton',
      'McAfee',
      'Symantec',
      'Best Buy',
      'Walmart',
      'Target',
      'Costco',
      'Home Depot',
      'Publishers Clearing House',
      'Lottery Commission',
      'Sweepstakes',
    ];

    const seenOrganizations = new Set<string>();

    // Pattern 1: Known brands (case-insensitive)
    for (const brand of knownBrands) {
      const brandPattern = new RegExp(`\\b(${this.escapeRegex(brand)})\\b`, 'gi');
      let match;

      while ((match = brandPattern.exec(text)) !== null) {
        const value = match[1];
        const normalizedValue = value.trim();
        const lowerValue = normalizedValue.toLowerCase();

        // Skip duplicates
        if (seenOrganizations.has(lowerValue)) {
          continue;
        }
        seenOrganizations.add(lowerValue);

        const context = this.extractContext(text, match.index, value.length);

        // Check for brand impersonation indicators
        const impersonationScore = this.detectBrandImpersonation(context, normalizedValue);

        organizations.push({
          type: EntityType.ORGANIZATION,
          value: normalizedValue,
          confidence: 0.95, // High confidence for known brands
          context,
          timestamp,
          metadata: {
            isKnownBrand: true,
            impersonationRisk: impersonationScore,
            potentiallyFake: impersonationScore > 0.5,
            validated: true,
          },
        });
      }
    }

    // Pattern 2: Organization names with legal suffixes (Inc, LLC, Ltd, Corp, etc.)
    const legalSuffixPattern = new RegExp(
      `\\b([A-Z][A-Za-z0-9&\\s'-]{1,50}\\s+(?:${organizationIndicators.join('|')})\\.?)\\b`,
      'g'
    );
    let match;

    while ((match = legalSuffixPattern.exec(text)) !== null) {
      const value = match[1].trim();
      const lowerValue = value.toLowerCase();

      // Skip duplicates
      if (seenOrganizations.has(lowerValue)) {
        continue;
      }
      seenOrganizations.add(lowerValue);

      const context = this.extractContext(text, match.index, value.length);

      // Check for brand impersonation
      const impersonationScore = this.detectBrandImpersonation(context, value);

      organizations.push({
        type: EntityType.ORGANIZATION,
        value,
        confidence: 0.85, // High confidence for legal entity names
        context,
        timestamp,
        metadata: {
          isKnownBrand: false,
          impersonationRisk: impersonationScore,
          potentiallyFake: impersonationScore > 0.5,
          validated: true,
        },
      });
    }

    // Pattern 3: Organization names with common keywords (Bank, Trust, Services, etc.)
    const keywordPattern = new RegExp(
      `\\b([A-Z][A-Za-z0-9&\\s'-]{1,50}\\s+(?:${organizationIndicators.slice(10).join('|')}))\\b`,
      'g'
    );

    while ((match = keywordPattern.exec(text)) !== null) {
      const value = match[1].trim();
      const lowerValue = value.toLowerCase();

      // Skip duplicates
      if (seenOrganizations.has(lowerValue)) {
        continue;
      }
      seenOrganizations.add(lowerValue);

      const context = this.extractContext(text, match.index, value.length);

      // Check for brand impersonation
      const impersonationScore = this.detectBrandImpersonation(context, value);

      organizations.push({
        type: EntityType.ORGANIZATION,
        value,
        confidence: 0.75, // Medium-high confidence for keyword-based matches
        context,
        timestamp,
        metadata: {
          isKnownBrand: false,
          impersonationRisk: impersonationScore,
          potentiallyFake: impersonationScore > 0.5,
          validated: true,
        },
      });
    }

    // Pattern 3b: Capitalized words followed by Support/Service/Team (for typosquatting detection)
    const supportPattern = /\b([A-Z][A-Za-z0-9]{2,20}\s+(?:Support|Service|Team|Help|Desk))\b/g;

    while ((match = supportPattern.exec(text)) !== null) {
      const value = match[1].trim();
      const lowerValue = value.toLowerCase();

      // Skip duplicates
      if (seenOrganizations.has(lowerValue)) {
        continue;
      }
      seenOrganizations.add(lowerValue);

      const context = this.extractContext(text, match.index, value.length);

      // Check for brand impersonation
      const impersonationScore = this.detectBrandImpersonation(context, value);

      organizations.push({
        type: EntityType.ORGANIZATION,
        value,
        confidence: 0.7, // Medium confidence for support-related names
        context,
        timestamp,
        metadata: {
          isKnownBrand: false,
          impersonationRisk: impersonationScore,
          potentiallyFake: impersonationScore > 0.5,
          validated: true,
        },
      });
    }

    // Pattern 4: Quoted organization names (e.g., "Acme Corporation")
    const quotedPattern = /["']([A-Z][A-Za-z0-9&\s'-]{2,50})["']/g;

    while ((match = quotedPattern.exec(text)) !== null) {
      const value = match[1].trim();
      const lowerValue = value.toLowerCase();

      // Only consider if it looks like an organization (has multiple words or capital letters)
      const wordCount = value.split(/\s+/).length;
      const hasMultipleCaps = (value.match(/[A-Z]/g) || []).length > 1;

      if (wordCount < 2 && !hasMultipleCaps) {
        continue;
      }

      // Skip duplicates
      if (seenOrganizations.has(lowerValue)) {
        continue;
      }
      seenOrganizations.add(lowerValue);

      const context = this.extractContext(text, match.index, value.length);

      // Check for brand impersonation
      const impersonationScore = this.detectBrandImpersonation(context, value);

      organizations.push({
        type: EntityType.ORGANIZATION,
        value,
        confidence: 0.7, // Medium confidence for quoted names
        context,
        timestamp,
        metadata: {
          isKnownBrand: false,
          impersonationRisk: impersonationScore,
          potentiallyFake: impersonationScore > 0.5,
          validated: true,
        },
      });
    }

    return organizations;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Detect brand impersonation patterns
   * Returns a score from 0 (no impersonation) to 1 (high impersonation risk)
   */
  private detectBrandImpersonation(context: string, organizationName: string): number {
    let score = 0;
    const contextLower = context.toLowerCase();
    const orgLower = organizationName.toLowerCase();

    // Impersonation indicators in context
    const impersonationIndicators = [
      'verify your account',
      'suspended account',
      'unusual activity',
      'security alert',
      'confirm your identity',
      'update your information',
      'claim your prize',
      'refund pending',
      'payment failed',
      'action required',
      'urgent',
      'immediate action',
      'click here',
      'verify now',
      'confirm now',
      'act now',
      'limited time',
      'expires',
      'locked account',
      'unauthorized access',
      'suspicious activity',
      'fraud alert',
      'representative',
      'customer service',
      'support team',
      'technical support',
      'help desk',
      'final notice',
      'arrest',
      'warrant',
      'legal action',
      'owe',
      'back taxes',
      'prize',
      'winner',
      'congratulations',
      'selected',
      'inheritance',
    ];

    // Check for impersonation indicators
    let indicatorCount = 0;
    for (const indicator of impersonationIndicators) {
      if (contextLower.includes(indicator)) {
        indicatorCount++;
      }
    }

    // More indicators = higher impersonation risk
    // Increased weight per indicator
    if (indicatorCount > 0) {
      score += Math.min(indicatorCount * 0.25, 0.7);
    }

    // Check for authority/urgency language
    const authorityKeywords = [
      'official',
      'authorized',
      'government',
      'federal',
      'department',
      'agency',
      'administration',
    ];

    for (const keyword of authorityKeywords) {
      if (contextLower.includes(keyword)) {
        score += 0.2;
        break;
      }
    }

    // Check for financial/payment context
    const financialKeywords = [
      'payment',
      'refund',
      'money',
      'transfer',
      'account',
      'credit card',
      'bank',
      'wire',
      'deposit',
    ];

    for (const keyword of financialKeywords) {
      if (contextLower.includes(keyword)) {
        score += 0.15;
        break;
      }
    }

    // Check for suspicious organization name patterns
    // Misspellings or variations of known brands
    const suspiciousPatterns = [
      /\d/, // Contains numbers (e.g., "Paypa1" instead of "PayPal")
      /[^a-zA-Z0-9\s&'-]/, // Contains unusual characters
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(orgLower)) {
        score += 0.2;
      }
    }

    // Cap the score at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Extract bank account numbers from text
   * Supports various formats including IBAN and domestic account numbers
   */
  extractBankAccounts(text: string): BankAccount[] {
    const bankAccounts: BankAccount[] = [];
    const timestamp = new Date();

    // IBAN pattern: 2 letter country code + 2 check digits + up to 30 alphanumeric characters
    const ibanPattern = /\b([A-Z]{2}\d{2}[A-Z0-9]{1,30})\b/g;
    let match;

    while ((match = ibanPattern.exec(text)) !== null) {
      const value = match[1];
      const context = this.extractContext(text, match.index, value.length);

      // Validate IBAN format
      if (this.isValidIBAN(value)) {
        // Skip duplicates
        if (bankAccounts.some((b) => b.value === value)) {
          continue;
        }

        const countryCode = value.slice(0, 2);
        bankAccounts.push({
          type: EntityType.BANK_ACCOUNT,
          value,
          confidence: 0.9,
          context,
          timestamp,
          metadata: {
            format: 'IBAN',
            countryCode,
            validated: true,
          },
        });
      }
    }

    // Domestic account numbers: 8-18 digits
    // Need to determine if US or Indian based on context
    const accountPattern = /\b(\d{8,18})\b/g;
    while ((match = accountPattern.exec(text)) !== null) {
      const value = match[1];
      const context = this.extractContext(text, match.index, value.length);
      const contextLower = context.toLowerCase();

      // Check for Indian banking context first (more specific)
      const indianBankingKeywords = [
        'ifsc',
        'neft',
        'rtgs',
        'imps',
        'upi',
      ];
      const hasIndianBankingContext = indianBankingKeywords.some((keyword) =>
        contextLower.includes(keyword)
      );

      if (hasIndianBankingContext) {
        // Skip duplicates
        if (bankAccounts.some((b) => b.value === value)) {
          continue;
        }

        bankAccounts.push({
          type: EntityType.BANK_ACCOUNT,
          value,
          confidence: 0.75,
          context,
          timestamp,
          metadata: {
            format: 'INDIAN_ACCOUNT',
            validated: value.length >= 9 && value.length <= 18,
          },
        });
        continue;
      }

      // Check for US/general banking context
      const bankingKeywords = [
        'account',
        'routing',
        'bank',
        'transfer',
        'deposit',
        'wire',
        'ach',
        'a/c',
        'account number',
      ];
      const hasBankingContext = bankingKeywords.some((keyword) =>
        contextLower.includes(keyword)
      );

      if (hasBankingContext && value.length >= 8 && value.length <= 17) {
        // Skip duplicates
        if (bankAccounts.some((b) => b.value === value)) {
          continue;
        }

        bankAccounts.push({
          type: EntityType.BANK_ACCOUNT,
          value,
          confidence: 0.7,
          context,
          timestamp,
          metadata: {
            format: 'US_ACCOUNT',
            validated: true,
          },
        });
      }
    }

    return bankAccounts;
  }

  /**
   * Validate IBAN format
   */
  private isValidIBAN(iban: string): boolean {
    // IBAN format: 2 letter country code + 2 check digits + up to 30 alphanumeric
    const ibanPattern = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
    if (!ibanPattern.test(iban)) {
      return false;
    }

    // Check length is within valid range (15-34 characters)
    if (iban.length < 15 || iban.length > 34) {
      return false;
    }

    // Validate country code is a known country
    const validCountryCodes = [
      'AD',
      'AE',
      'AL',
      'AT',
      'AZ',
      'BA',
      'BE',
      'BG',
      'BH',
      'BR',
      'BY',
      'CH',
      'CR',
      'CY',
      'CZ',
      'DE',
      'DK',
      'DO',
      'EE',
      'EG',
      'ES',
      'FI',
      'FO',
      'FR',
      'GB',
      'GE',
      'GI',
      'GL',
      'GR',
      'GT',
      'HR',
      'HU',
      'IE',
      'IL',
      'IQ',
      'IS',
      'IT',
      'JO',
      'KW',
      'KZ',
      'LB',
      'LC',
      'LI',
      'LT',
      'LU',
      'LV',
      'MC',
      'MD',
      'ME',
      'MK',
      'MR',
      'MT',
      'MU',
      'NL',
      'NO',
      'PK',
      'PL',
      'PS',
      'PT',
      'QA',
      'RO',
      'RS',
      'SA',
      'SE',
      'SI',
      'SK',
      'SM',
      'TN',
      'TR',
      'UA',
      'VA',
      'VG',
      'XK',
    ];

    const countryCode = iban.slice(0, 2);
    return validCountryCodes.includes(countryCode);
  }

  /**
   * Extract email addresses from text
   */
  extractEmails(text: string): Email[] {
    const emails: Email[] = [];
    const timestamp = new Date();

    // Email pattern: local-part@domain
    // Local part: alphanumeric, dots, hyphens, underscores, plus signs
    // Domain: alphanumeric, dots, hyphens with TLD
    const emailPattern =
      /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
    let match;

    while ((match = emailPattern.exec(text)) !== null) {
      const value = match[1].toLowerCase(); // Normalize to lowercase
      const context = this.extractContext(text, match.index, value.length);

      // Validate email format
      const isValid = this.isValidEmail(value);

      // Skip duplicates
      if (emails.some((e) => e.value === value)) {
        continue;
      }

      // Extract domain
      const domain = value.split('@')[1];

      emails.push({
        type: EntityType.EMAIL,
        value,
        confidence: isValid ? 0.95 : 0.7,
        context,
        timestamp,
        metadata: {
          domain,
          format: value,
          validated: isValid,
        },
      });
    }

    return emails;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    // RFC 5322 compliant email validation (simplified)
    const emailPattern =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      return false;
    }

    // Check for common invalid patterns
    const localPart = email.split('@')[0];
    const domain = email.split('@')[1];

    // Local part should not start or end with a dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }

    // Local part should not have consecutive dots
    if (localPart.includes('..')) {
      return false;
    }

    // Domain should have at least one dot
    if (!domain.includes('.')) {
      return false;
    }

    // Domain should not start or end with a dot or hyphen
    if (
      domain.startsWith('.') ||
      domain.endsWith('.') ||
      domain.startsWith('-') ||
      domain.endsWith('-')
    ) {
      return false;
    }

    return true;
  }

    /**
     * Detect the language of the text
     * Returns ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'de', 'hi', 'zh')
     */
    detectLanguage(text: string): { language: string; confidence: number } {
      // Simple language detection based on character patterns and common words
      // For production, consider using a library like franc or @vitalets/google-translate-api

      if (!text || text.trim().length === 0) {
        return { language: 'unknown', confidence: 0 };
      }

      const textLower = text.toLowerCase();
      let scores: Record<string, number> = {
        en: 0,
        es: 0,
        fr: 0,
        de: 0,
        hi: 0,
        zh: 0,
        ar: 0,
        ru: 0,
        pt: 0,
        it: 0,
      };

      // Check for language-specific characters
      // Hindi (Devanagari script)
      if (/[\u0900-\u097F]/.test(text)) {
        scores.hi += 10;
      }

      // Chinese (CJK Unified Ideographs)
      if (/[\u4E00-\u9FFF]/.test(text)) {
        scores.zh += 10;
      }

      // Arabic script
      if (/[\u0600-\u06FF]/.test(text)) {
        scores.ar += 10;
      }

      // Cyrillic script (Russian)
      if (/[\u0400-\u04FF]/.test(text)) {
        scores.ru += 10;
      }

      // Common English words
      const englishWords = [
        'the',
        'is',
        'are',
        'and',
        'or',
        'you',
        'your',
        'have',
        'has',
        'will',
        'can',
        'please',
        'thank',
        'hello',
        'account',
        'payment',
        'transfer',
        'bank',
        'call',
        'contact',
        'urgent',
        'verify',
        'confirm',
      ];
      for (const word of englishWords) {
        if (textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)) {
          scores.en += 0.5;
        }
      }

      // Common Spanish words
      const spanishWords = [
        'el',
        'la',
        'los',
        'las',
        'de',
        'del',
        'y',
        'o',
        'es',
        'está',
        'son',
        'por',
        'para',
        'con',
        'su',
        'usted',
        'hola',
        'gracias',
        'cuenta',
        'pago',
        'banco',
        'transferencia',
        'urgente',
      ];
      for (const word of spanishWords) {
        if (textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)) {
          scores.es += 0.5;
        }
      }

      // Common French words
      const frenchWords = [
        'le',
        'la',
        'les',
        'de',
        'du',
        'et',
        'ou',
        'est',
        'sont',
        'pour',
        'avec',
        'votre',
        'vous',
        'bonjour',
        'merci',
        'compte',
        'paiement',
        'banque',
        'transfert',
        'urgent',
      ];
      for (const word of frenchWords) {
        if (textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)) {
          scores.fr += 0.5;
        }
      }

      // Common German words
      const germanWords = [
        'der',
        'die',
        'das',
        'und',
        'oder',
        'ist',
        'sind',
        'für',
        'mit',
        'ihr',
        'ihre',
        'sie',
        'hallo',
        'danke',
        'konto',
        'zahlung',
        'bank',
        'überweisung',
        'dringend',
      ];
      for (const word of germanWords) {
        if (textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)) {
          scores.de += 0.5;
        }
      }

      // Common Portuguese words
      const portugueseWords = [
        'o',
        'a',
        'os',
        'as',
        'de',
        'do',
        'da',
        'e',
        'ou',
        'é',
        'são',
        'para',
        'com',
        'seu',
        'sua',
        'você',
        'olá',
        'obrigado',
        'conta',
        'pagamento',
        'banco',
        'transferência',
        'urgente',
      ];
      for (const word of portugueseWords) {
        if (textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)) {
          scores.pt += 0.5;
        }
      }

      // Common Italian words
      const italianWords = [
        'il',
        'lo',
        'la',
        'i',
        'gli',
        'le',
        'di',
        'e',
        'o',
        'è',
        'sono',
        'per',
        'con',
        'suo',
        'sua',
        'lei',
        'ciao',
        'grazie',
        'conto',
        'pagamento',
        'banca',
        'trasferimento',
        'urgente',
      ];
      for (const word of italianWords) {
        if (textLower.includes(` ${word} `) || textLower.startsWith(`${word} `) || textLower.endsWith(` ${word}`)) {
          scores.it += 0.5;
        }
      }

      // Find language with highest score
      let maxScore = 0;
      let detectedLanguage = 'en'; // Default to English

      for (const [lang, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          detectedLanguage = lang;
        }
      }

      // Calculate confidence based on score
      // Higher score = higher confidence
      const confidence = Math.min(maxScore / 5, 1.0); // Adjusted from /10 to /5 for better sensitivity

      // If confidence is too low, return unknown
      if (confidence < 0.2) { // Lowered from 0.3 to 0.2
        return { language: 'unknown', confidence: 0 };
      }

      return { language: detectedLanguage, confidence };
    }

    /**
     * Get regional phone number patterns and default country codes
     * Returns region-specific information for better phone number extraction
     */
    private getRegionalPhoneInfo(language: string): {
      defaultCountryCode: string;
      commonFormats: string[];
      region: string;
    } {
      const regionalInfo: Record<
        string,
        { defaultCountryCode: string; commonFormats: string[]; region: string }
      > = {
        en: {
          defaultCountryCode: '1',
          commonFormats: ['(XXX) XXX-XXXX', 'XXX-XXX-XXXX', 'XXX.XXX.XXXX'],
          region: 'US/Canada',
        },
        es: {
          defaultCountryCode: '34',
          commonFormats: ['XXX XX XX XX', '+34 XXX XX XX XX'],
          region: 'Spain',
        },
        fr: {
          defaultCountryCode: '33',
          commonFormats: ['XX XX XX XX XX', '+33 X XX XX XX XX'],
          region: 'France',
        },
        de: {
          defaultCountryCode: '49',
          commonFormats: ['XXXX XXXXXXX', '+49 XXX XXXXXXX'],
          region: 'Germany',
        },
        hi: {
          defaultCountryCode: '91',
          commonFormats: ['XXXXX-XXXXX', '+91 XXXXX XXXXX', 'XXXXXXXXXX'],
          region: 'India',
        },
        zh: {
          defaultCountryCode: '86',
          commonFormats: ['XXX XXXX XXXX', '+86 XXX XXXX XXXX'],
          region: 'China',
        },
        ar: {
          defaultCountryCode: '966',
          commonFormats: ['XX XXX XXXX', '+966 XX XXX XXXX'],
          region: 'Saudi Arabia',
        },
        ru: {
          defaultCountryCode: '7',
          commonFormats: ['XXX XXX-XX-XX', '+7 XXX XXX-XX-XX'],
          region: 'Russia',
        },
        pt: {
          defaultCountryCode: '55',
          commonFormats: ['(XX) XXXXX-XXXX', '+55 XX XXXXX-XXXX'],
          region: 'Brazil',
        },
        it: {
          defaultCountryCode: '39',
          commonFormats: ['XXX XXX XXXX', '+39 XXX XXX XXXX'],
          region: 'Italy',
        },
      };

      return (
        regionalInfo[language] || {
          defaultCountryCode: '1',
          commonFormats: ['XXX-XXX-XXXX'],
          region: 'Unknown',
        }
      );
    }
}
