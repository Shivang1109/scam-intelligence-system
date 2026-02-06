/**
 * Unit tests for InMemoryReportRepository
 */

import { InMemoryReportRepository } from './InMemoryReportRepository';
import { IntelligenceReport, ScamType } from '../types';

describe('InMemoryReportRepository', () => {
  let repository: InMemoryReportRepository;

  beforeEach(() => {
    repository = new InMemoryReportRepository();
  });

  const createMockReport = (conversationId: string): IntelligenceReport => ({
    conversationId,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    persona: {
      id: 'persona-1',
      name: 'Test Persona',
    },
    scamClassification: {
      primaryType: ScamType.PHISHING,
      primaryConfidence: 0.85,
      secondaryTypes: [],
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    riskScore: {
      score: 75,
      breakdown: {
        signalScore: 20,
        entityScore: 15,
        classificationScore: 20,
        urgencyScore: 10,
        financialScore: 10,
      },
      calculatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    extractedEntities: [],
    scamSignals: [],
    conversationMetadata: {
      duration: 300,
      messageCount: 5,
      stateTransitions: [],
    },
    transcript: [],
  });

  describe('save', () => {
    it('should save a report', async () => {
      const report = createMockReport('conv-1');

      await repository.save(report);

      const retrieved = await repository.findById('conv-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.conversationId).toBe(report.conversationId);
      expect(retrieved?.riskScore.score).toBe(report.riskScore.score);
    });

    it('should overwrite existing report with same conversationId', async () => {
      const report1 = createMockReport('conv-1');
      const report2 = {
        ...createMockReport('conv-1'),
        riskScore: {
          ...report1.riskScore,
          score: 90,
        },
      };

      await repository.save(report1);
      await repository.save(report2);

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.riskScore.score).toBe(90);
    });

    it('should create independent copies to prevent external mutations', async () => {
      const report = createMockReport('conv-1');

      await repository.save(report);

      // Mutate original
      report.riskScore.score = 100;

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.riskScore.score).toBe(75);
    });
  });

  describe('findById', () => {
    it('should return report if it exists', async () => {
      const report = createMockReport('conv-1');
      await repository.save(report);

      const retrieved = await repository.findById('conv-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.conversationId).toBe(report.conversationId);
      expect(retrieved?.riskScore.score).toBe(report.riskScore.score);
    });

    it('should return null if report does not exist', async () => {
      const retrieved = await repository.findById('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should return independent copy to prevent external mutations', async () => {
      const report = createMockReport('conv-1');
      await repository.save(report);

      const retrieved = await repository.findById('conv-1');
      retrieved!.riskScore.score = 100;

      const retrievedAgain = await repository.findById('conv-1');
      expect(retrievedAgain?.riskScore.score).toBe(75);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no reports exist', async () => {
      const reports = await repository.findAll(1, 10);

      expect(reports).toEqual([]);
    });

    it('should return all reports when page size is large enough', async () => {
      const report1 = createMockReport('conv-1');
      const report2 = createMockReport('conv-2');
      const report3 = createMockReport('conv-3');

      await repository.save(report1);
      await repository.save(report2);
      await repository.save(report3);

      const reports = await repository.findAll(1, 10);

      expect(reports).toHaveLength(3);
      expect(reports.map((r) => r.conversationId).sort()).toEqual([
        'conv-1',
        'conv-2',
        'conv-3',
      ]);
    });

    it('should paginate results correctly', async () => {
      // Create 5 reports
      for (let i = 1; i <= 5; i++) {
        await repository.save(createMockReport(`conv-${i}`));
      }

      // Get first page (2 items)
      const page1 = await repository.findAll(1, 2);
      expect(page1).toHaveLength(2);

      // Get second page (2 items)
      const page2 = await repository.findAll(2, 2);
      expect(page2).toHaveLength(2);

      // Get third page (1 item)
      const page3 = await repository.findAll(3, 2);
      expect(page3).toHaveLength(1);

      // Verify no overlap
      const allIds = [
        ...page1.map((r) => r.conversationId),
        ...page2.map((r) => r.conversationId),
        ...page3.map((r) => r.conversationId),
      ];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('should return empty array for page beyond available data', async () => {
      await repository.save(createMockReport('conv-1'));

      const reports = await repository.findAll(5, 10);

      expect(reports).toEqual([]);
    });

    it('should throw error for invalid page number', async () => {
      await expect(repository.findAll(0, 10)).rejects.toThrow(
        'Page number must be >= 1'
      );
      await expect(repository.findAll(-1, 10)).rejects.toThrow(
        'Page number must be >= 1'
      );
    });

    it('should throw error for invalid page size', async () => {
      await expect(repository.findAll(1, 0)).rejects.toThrow(
        'Page size must be >= 1'
      );
      await expect(repository.findAll(1, -1)).rejects.toThrow(
        'Page size must be >= 1'
      );
    });

    it('should return independent copies', async () => {
      const report = createMockReport('conv-1');
      await repository.save(report);

      const reports = await repository.findAll(1, 10);
      reports[0].riskScore.score = 100;

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.riskScore.score).toBe(75);
    });
  });

  describe('count', () => {
    it('should return 0 when no reports exist', async () => {
      const count = await repository.count();

      expect(count).toBe(0);
    });

    it('should return correct count of reports', async () => {
      await repository.save(createMockReport('conv-1'));
      await repository.save(createMockReport('conv-2'));
      await repository.save(createMockReport('conv-3'));

      const count = await repository.count();

      expect(count).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all reports', async () => {
      await repository.save(createMockReport('conv-1'));
      await repository.save(createMockReport('conv-2'));
      await repository.save(createMockReport('conv-3'));

      repository.clear();

      const count = await repository.count();
      expect(count).toBe(0);
    });
  });

  describe('data isolation', () => {
    it('should maintain data integrity with nested objects', async () => {
      const report = createMockReport('conv-1');
      report.scamSignals = [
        {
          type: 'urgency' as any,
          confidence: 0.9,
          text: 'Act now!',
          context: 'Message content',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      await repository.save(report);

      // Mutate original
      report.scamSignals[0].text = 'MUTATED';

      const retrieved = await repository.findById('conv-1');
      expect(retrieved?.scamSignals[0].text).toBe('Act now!');
    });
  });
});
