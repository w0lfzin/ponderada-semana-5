/**
 * @fileoverview Global error handling middleware
 * @module middleware/errorHandler
 * @requires ../utils/logger
 */

const logger = require('../utils/logger');

/**
 * Error response class for API responses
 * @class ApiError
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Object} [data={}] - Additional data about the error
   * @param {boolean} [isOperational=true] - Whether this is an operational error
   */
  constructor(statusCode, message, data = {}, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a Bad Request error (400)
 * @function badRequest
 * @param {string} message - Error message
 * @param {Object} [data={}] - Additional data
 * @returns {ApiError} The error object
 */
const badRequest = (message, data = {}) => {
  return new ApiError(400, message, data);
};

/**
 * Create a Not Found error (404)
 * @function notFound
 * @param {string} message - Error message
 * @param {Object} [data={}] - Additional data
 * @returns {ApiError} The error object
 */
const notFound = (message, data = {}) => {
  return new ApiError(404, message, data);
};

/**
 * Create an Internal Server Error (500)
 * @function serverError
 * @param {string} message - Error message
 * @param {Object} [data={}] - Additional data
 * @param {boolean} [isOperational=true] - Whether this is an operational error
 * @returns {ApiError} The error object
 */
const serverError = (message, data = {}, isOperational = true) => {
  return new ApiError(500, message, data, isOperational);
};

/**
 * Global error handling middleware
 * @function errorHandler
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Object} Response with error details
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Internal Server Error';
  let errorData = err.data || {};
  const isOperational = err.isOperational !== undefined ? err.isOperational : true;

  // Don't leak error details in production for non-operational errors
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    errorMessage = 'Internal Server Error';
    errorData = {};
  }

  // Log error
  const logError = {
    requestId: req.id,
    url: req.originalUrl,
    method: req.method,
    statusCode,
    message: err.message,
    stack: err.stack,
    isOperational,
  };

  if (statusCode >= 500) {
    logger.error('Server error', logError);
  } else {
    logger.warn('Client error', logError);
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: errorMessage,
    data: errorData,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,
  ApiError,
  badRequest,
  notFound,
  serverError,
}; 