/**
 * In-Memory Report Repository Implementation
 * Provides Map-based storage for intelligence reports
 */

import { IntelligenceReport } from '../types';
import { ReportRepository } from './interfaces';

export class InMemoryReportRepository implements ReportRepository {
  private reports: Map<string, IntelligenceReport>;

  constructor() {
    this.reports = new Map();
  }

  async save(report: IntelligenceReport): Promise<void> {
    this.reports.set(report.conversationId, this.deepClone(report));
  }

  async findById(conversationId: string): Promise<IntelligenceReport | null> {
    const report = this.reports.get(conversationId);
    return report ? this.deepClone(report) : null;
  }

  async findAll(page: number, pageSize: number): Promise<IntelligenceReport[]> {
    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page number must be >= 1');
    }
    if (pageSize < 1) {
      throw new Error('Page size must be >= 1');
    }

    const allReports = Array.from(this.reports.values());
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return allReports
      .slice(startIndex, endIndex)
      .map((r) => this.deepClone(r));
  }

  async count(): Promise<number> {
    return this.reports.size;
  }

  /**
   * Deep clone to prevent external mutations
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear all reports (useful for testing)
   */
  clear(): void {
    this.reports.clear();
  }
}
