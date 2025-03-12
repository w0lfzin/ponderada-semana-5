/**
 * @fileoverview In-memory database configuration
 * @module config/database
 * @requires ../utils/logger
 */

const logger = require('../utils/logger');

// In-memory storage
const database = {
  orders: new Map(),
  drivers: new Map(),
  customers: new Map(),
};

/**
 * Initialize the in-memory database
 * @async
 * @function connectDatabase
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    // Log successful initialization
    logger.info('In-memory database initialized successfully');
    
    // Log database metrics
    logger.info(`Database collections: ${Object.keys(database).length}`);
    
    return Promise.resolve();
  } catch (error) {
    logger.error('In-memory database initialization failed:', error);
    throw error;
  }
};

/**
 * Close database connection (no-op for in-memory)
 * @async
 * @function disconnectDatabase
 * @returns {Promise<void>}
 */
const disconnectDatabase = async () => {
  try {
    // Clear all data
    Object.keys(database).forEach(collection => {
      database[collection].clear();
    });
    
    logger.info('In-memory database cleared');
    return Promise.resolve();
  } catch (error) {
    logger.error('Error clearing in-memory database:', error);
    throw error;
  }
};

/**
 * Get database collection
 * @function getCollection
 * @param {string} name - Collection name
 * @returns {Map} The collection Map
 */
const getCollection = (name) => {
  if (!database[name]) {
    database[name] = new Map();
  }
  return database[name];
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getCollection,
  database,
}; 