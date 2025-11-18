/**
 * Centralized error handling utilities
 * Provides consistent error handling across the application
 */

export class AppError extends Error {
  constructor(message, type = 'GENERAL', statusCode = 500, context = '') {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export const ErrorTypes = {
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  GENERAL: 'GENERAL'
};

/**
 * Handle and format errors consistently
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @returns {Object} Formatted error object
 */
export const handleError = (error, context = '') => {
  const timestamp = new Date().toISOString();
  
  // Log error details for debugging
  console.error(`[${timestamp}] [${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    type: error.type,
    statusCode: error.statusCode
  });
  
  // Log to external service in production
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
    logToExternalService(error, context);
  }
  
  return {
    message: getUserFriendlyMessage(error),
    type: error.type || ErrorTypes.GENERAL,
    statusCode: error.statusCode || 500,
    context,
    timestamp,
    originalMessage: error.message
  };
};

/**
 * Convert technical error messages to user-friendly ones
 * @param {Error} error - The error to convert
 * @returns {string} User-friendly error message
 */
const getUserFriendlyMessage = (error) => {
  const message = error.message || '';
  
  // API-related errors
  if (message.includes('403') || message.includes('forbidden')) {
    return '🔒 Service temporarily unavailable. Please check your API configuration.';
  }
  
  if (message.includes('429') || message.includes('rate limit')) {
    return '⏱️ Service is busy. Please try again in a few minutes.';
  }
  
  if (message.includes('401') || message.includes('unauthorized')) {
    return '🔐 Authentication required. Please log in again.';
  }
  
  // Network-related errors
  if (message.includes('network') || message.includes('fetch') || message.includes('ENOTFOUND')) {
    return '🌐 Network connection issue. Please check your internet connection.';
  }
  
  if (message.includes('timeout')) {
    return '⏰ Request timed out. Please try again.';
  }
  
  // Database-related errors
  if (message.includes('database')) {
    return '💾 Database connection issue. Please try again later.';
  }
  
  // AI service errors
  if (message.includes('AI')) {
    return '🤖 AI service temporarily unavailable. Please try again later.';
  }
  
  // Generic fallback
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Log errors to external service (placeholder)
 * @param {Error} error - The error to log
 * @param {string} context - Context where the error occurred
 */
const logToExternalService = (error, context) => {
  // TODO: Implement external error logging
  // Example: Sentry.captureException(error, { tags: { context } });
};

/**
 * Create a retry mechanism for failed operations
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} Result of the operation
 */
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new AppError(
          `Operation failed after ${maxRetries} attempts: ${error.message}`,
          ErrorTypes.GENERAL,
          500,
          'withRetry'
        );
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

/**
 * Async error boundary for handling promise rejections
 * @param {Function} asyncFn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
export const asyncErrorHandler = (asyncFn) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const handledError = handleError(error, asyncFn.name);
      throw new AppError(
        handledError.message,
        handledError.type,
        handledError.statusCode,
        handledError.context
      );
    }
  };
};
