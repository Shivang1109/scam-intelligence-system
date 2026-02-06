/**
 * Express.js API Server
 * Main server setup with middleware configuration
 */

import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler, requestLogger } from './middleware';
import { AgentController } from '../agents/AgentController';
import { createConversationRoutes } from './routes/conversations';
import { createReportRoutes } from './routes/reports';
import { ReportRepository } from '../persistence/interfaces';

export class APIServer {
  private app: Application;
  private port: number;
  private agentController?: AgentController;
  private reportRepository?: ReportRepository;

  constructor(
    port: number = 3000, 
    agentController?: AgentController,
    reportRepository?: ReportRepository
  ) {
    this.app = express();
    this.port = port;
    this.agentController = agentController;
    this.reportRepository = reportRepository;
    this.setupMiddleware();
    this.setupRoutes();
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

    // TODO: Add route handlers for metrics
    // These will be implemented in future tasks
  }

  /**
   * Set up error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
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

  /**
   * Set the agent controller
   * Useful for setting up the controller after server initialization
   */
  public setAgentController(agentController: AgentController): void {
    this.agentController = agentController;
    // Re-setup routes to include conversation routes
    this.setupRoutes();
  }

  /**
   * Set the report repository
   * Useful for setting up the repository after server initialization
   */
  public setReportRepository(reportRepository: ReportRepository): void {
    this.reportRepository = reportRepository;
    // Re-setup routes to include report routes
    this.setupRoutes();
  }
}
