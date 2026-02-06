/**
 * Report Generator Interface
 */

import { IntelligenceReport } from '../types';

export interface ReportGenerator {
  generateReport(conversationId: string): Promise<IntelligenceReport>;
  validateReport(report: IntelligenceReport): boolean;
  exportReport(conversationId: string, format: string): Promise<string>;
}
