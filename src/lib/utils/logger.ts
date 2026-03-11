/**
 * Centralized logging utility
 * 
 * Provides consistent logging across the application with different log levels.
 * In production, these can be replaced with a proper logging service.
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

// ============================================================================
// Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// In production, you might want to send errors to a service like Sentry
const shouldLogToConsole = isDevelopment || !isProduction;

// ============================================================================
// Logger Implementation
// ============================================================================

function createLogger(namespace?: string): Logger {
  const prefix = namespace ? `[${namespace}]` : '';

  return {
    debug: (...args: unknown[]) => {
      if (shouldLogToConsole) {
        // eslint-disable-next-line no-console
        console.debug(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLogToConsole) {
        // eslint-disable-next-line no-console
        console.info(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLogToConsole) {
        // eslint-disable-next-line no-console
        console.warn(prefix, ...args);
      }
      // In production, you might want to track warnings
    },
    error: (...args: unknown[]) => {
      if (shouldLogToConsole) {
        // eslint-disable-next-line no-console
        console.error(prefix, ...args);
      }
      // In production, send to error tracking service
      // Example: Sentry.captureException(error)
    },
  };
}

// ============================================================================
// Default Logger
// ============================================================================

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a namespaced logger
 */
export function createLoggerWithNamespace(namespace: string): Logger {
  return createLogger(namespace);
}

// ============================================================================
// Specialized Loggers
// ============================================================================

export const storageLogger = createLoggerWithNamespace('Storage');
export const authLogger = createLoggerWithNamespace('Auth');
export const contextLogger = createLoggerWithNamespace('Context');
