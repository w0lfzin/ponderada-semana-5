/**
 * @fileoverview Logging utility
 * @module utils/logger
 * @requires winston
 */

const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'order-assignment-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const restString = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
          return `${timestamp} ${level}: ${message} ${restString}`;
        })
      )
    })
  ]
});

// Add integration metrics logger
logger.logIntegrationMetrics = (metrics) => {
  logger.info('Integration metrics', { metrics });
};

module.exports = logger; 