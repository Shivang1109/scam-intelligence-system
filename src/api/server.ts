/**
 * Express.js API Server
 * Main server setup with middleware configuration
 */

import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { errorHandler, requestLogger } from './middleware';
import { AgentController } from '../agents/AgentController';
import { HybridAnalyzer } from '../ai/HybridAnalyzer';
import { createConversationRoutes } from './routes/conversations';
import { createReportRoutes } from './routes/reports';
import { createAnalyzeRoutes } from './routes/analyze';
import { ReportRepository } from '../persistence/interfaces';

export class APIServer {
  private app: Application;
  private port: number;
  private agentController?: AgentController;
  private reportRepository?: ReportRepository;
  private hybridAnalyzer?: HybridAnalyzer;

  constructor(
    port: number = 3000, 
    agentController?: AgentController,
    reportRepository?: ReportRepository,
    hybridAnalyzer?: HybridAnalyzer
  ) {
    this.app = express();
    this.port = port;
    this.agentController = agentController;
    this.reportRepository = reportRepository;
    this.hybridAnalyzer = hybridAnalyzer;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();  // Add static files AFTER routes but BEFORE error handling
    this.setupErrorHandling();
  }

  /**
   * Configure middleware
   */
  private setupMiddleware(): void {
    // Body parser middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS middleware
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
      })
    );

    // HTTP request logging middleware
    this.app.use(morgan('combined'));

    // Custom request logger
    this.app.use(requestLogger);
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API version prefix
    this.app.get('/api/v1', (_req, res) => {
      res.json({
        message: 'Scam Intelligence System API v1',
        version: '1.0.0',
        endpoints: {
          conversations: '/api/v1/conversations',
          reports: '/api/v1/reports',
          analyze: '/api/v1/analyze',
          health: '/health',
          metrics: '/api/v1/metrics',
        },
      });
    });

    // Conversation routes
    if (this.agentController) {
      const conversationRoutes = createConversationRoutes(this.agentController);
      this.app.use('/api/v1/conversations', conversationRoutes);
    }

    // Report routes
    if (this.reportRepository) {
      const reportRoutes = createReportRoutes(this.reportRepository);
      this.app.use('/api/v1/reports', reportRoutes);
    }

    // Instant analysis routes
    if (this.hybridAnalyzer) {
      const analyzeRoutes = createAnalyzeRoutes(this.hybridAnalyzer);
      this.app.use('/api/v1/analyze', analyzeRoutes);
    }

    // Metrics endpoint (demo stats)
    this.app.get('/api/v1/metrics', (_req, res) => {
      res.json({
        totalScamsAnalyzed: 847,
        totalMoneyProtected: 2347891.50,
        activeConversations: 3,
        averageRiskScore: 67.3,
        topScamTypes: [
          { type: 'phishing', count: 312, percentage: 36.8 },
          { type: 'tech_support', count: 198, percentage: 23.4 },
          { type: 'romance', count: 156, percentage: 18.4 },
          { type: 'irs', count: 98, percentage: 11.6 },
          { type: 'lottery', count: 83, percentage: 9.8 }
        ],
        signalsDetected: {
          urgency: 623,
          financial_request: 589,
          impersonation: 512,
          threat: 387,
          authority_claim: 298
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Set up static file serving
   */
  private setupStaticFiles(): void {
    // Serve static files from public directory
    // Check multiple possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), 'dist', 'public'),
      path.join(__dirname, '..', '..', 'public')
    ];
    
    for (const publicPath of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(publicPath)) {
          this.app.use(express.static(publicPath));
          console.log(`📁 Serving static files from: ${publicPath}`);
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }
  }

  /**
   * Set up error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Scam Intelligence System API server running on port ${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`🔗 API v1: http://localhost:${this.port}/api/v1`);
    });
  }

  /**
   * Get the Express application instance
   * Useful for testing
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get the configured port
   */
  public getPort(): number {
    return this.port;
  }
}
