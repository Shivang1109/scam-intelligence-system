/**
 * Structured Logger
 * Provides consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  conversationId?: string;
  agentId?: string;
  state?: string;
  component?: string;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel)) {
      this.minLevel = envLevel as LogLevel;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : undefined,
      };
      console.error(this.formatLog(LogLevel.ERROR, message, errorContext));
    }
  }

  // Convenience methods for specific events
  stateTransition(conversationId: string, fromState: string, toState: string, event: string): void {
    this.info('State transition', {
      conversationId,
      component: 'StateMachine',
      fromState,
      toState,
      event,
    });
  }

  entityExtracted(conversationId: string, entityType: string, count: number): void {
    this.info('Entities extracted', {
      conversationId,
      component: 'NLPExtractor',
      entityType,
      count,
    });
  }

  signalDetected(conversationId: string, signalType: string, confidence: number): void {
    this.info('Scam signal detected', {
      conversationId,
      component: 'ScamSignalDetector',
      signalType,
      confidence,
    });
  }

  conversationCreated(conversationId: string, persona: string): void {
    this.info('Conversation created', {
      conversationId,
      component: 'AgentController',
      persona,
    });
  }

  conversationTerminated(conversationId: string, reason: string): void {
    this.info('Conversation terminated', {
      conversationId,
      component: 'Agent',
      reason,
    });
  }

  apiRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.info('API request', {
      component: 'API',
      method,
      path,
      statusCode,
      duration,
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
