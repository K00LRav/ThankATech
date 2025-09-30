/**
 * Production-safe logging utility
 * Only logs in development, silent in production unless it's an error
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  // Always log errors, even in production
  error: (...args: any[]) => {
    console.error(...args);
  },

  // Only log warnings in development
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  // Only log info in development
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  // Only log debug in development
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('🐛', ...args);
    }
  },

  // Success messages - only in development
  success: (...args: any[]) => {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  }
};

export default logger;