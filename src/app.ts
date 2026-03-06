/**
 * Application Entry Point
 * Wires all components together and starts the server
 */

import 'dotenv/config';
import { APIServer } from './api/server';
import { AgentController } from './agents/AgentController';
import { StateMachine } from './agents/StateMachine';
import { PersonaManager } from './agents/PersonaManager';
import { NLPExtractor } from './nlp/NLPExtractor';
import { ScamSignalDetector } from './nlp/ScamSignalDetector';
import { ScamClassifier } from './scoring/ScamClassifier';
import { RiskScorer } from './scoring/RiskScorer';
import { HybridAnalyzer } from './ai/HybridAnalyzer';
import { ReportGenerator } from './reporting/ReportGenerator';
import { InMemoryConversationRepository } from './persistence/InMemoryConversationRepository';
import { InMemoryReportRepository } from './persistence/InMemoryReportRepository';

/**
 * Application class
 * Manages component lifecycle and dependency injection
 */
export class Application {
  private server?: APIServer;
  private agentController?: AgentController;

  /**
   * Initialize all components and wire them together
   */
  public async initialize(): Promise<void> {
    console.log('🔧 Initializing Scam Intelligence System...');

    // Initialize persistence layer
    console.log('📦 Setting up persistence layer...');
    const conversationRepository = new InMemoryConversationRepository();
    const reportRepository = new InMemoryReportRepository();

    // Initialize NLP components
    console.log('🧠 Initializing NLP components...');
    const nlpExtractor = new NLPExtractor();
    const signalDetector = new ScamSignalDetector();

    // Initialize AI components
    console.log('🤖 Initializing AI components...');
    const hybridAnalyzer = new HybridAnalyzer(process.env.OPENAI_API_KEY);
    if (hybridAnalyzer.isAIEnabled()) {
      console.log('✅ AI enhancement enabled (OpenAI)');
    } else {
      console.log('⚠️  AI enhancement disabled (no API key) - using rule-based only');
    }

    // Initialize Claude Persona Engine
    const { ClaudePersonaEngine } = await import('./ai/ClaudePersonaEngine');
    const claudeEngine = new ClaudePersonaEngine(process.env.ANTHROPIC_API_KEY);
    if (claudeEngine.isEnabled()) {
      console.log('✅ Claude Persona Engine enabled');
    } else {
      console.log('⚠️  Claude Persona Engine disabled (no API key) - using fallback responses');
    }

    // Initialize scoring components
    console.log('📊 Initializing scoring components...');
    const scamClassifier = new ScamClassifier();
    const riskScorer = new RiskScorer();

    // Initialize reporting (used by API server)
    console.log('📝 Initializing report generator...');
    new ReportGenerator(riskScorer);

    // Initialize agent management
    console.log('🤖 Initializing agent management...');
    const stateMachine = new StateMachine();
    const personaManager = new PersonaManager();

    // Create agent controller with all dependencies
    this.agentController = new AgentController(
      stateMachine,
      personaManager,
      nlpExtractor,
      signalDetector,
      scamClassifier,
      riskScorer,
      conversationRepository,
      hybridAnalyzer,
      claudeEngine
    );

    // Initialize API server
    console.log('🌐 Initializing API server...');
    const port = parseInt(process.env.PORT || '3000', 10);
    this.server = new APIServer(port, this.agentController, reportRepository, hybridAnalyzer);

    console.log('✅ All components initialized successfully');
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    if (!this.server) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    console.log('🚀 Starting Scam Intelligence System...');
    this.server.start();
    console.log('✅ System is ready to accept requests');
  }

  /**
   * Shutdown the application gracefully
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Scam Intelligence System...');

    if (this.agentController) {
      await this.agentController.shutdown();
    }

    console.log('✅ Shutdown complete');
  }

  /**
   * Get the API server instance (for testing)
   */
  public getServer(): APIServer | undefined {
    return this.server;
  }

  /**
   * Get the agent controller instance (for testing)
   */
  public getAgentController(): AgentController | undefined {
    return this.agentController;
  }
}

/**
 * Main entry point
 */
async function main() {
  const app = new Application();

  try {
    await app.initialize();
    await app.start();

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM signal');
      await app.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT signal');
      await app.shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}
