/**
 * @fileoverview Main Routes
 * @module routes/index
 * @requires express
 * @requires ./orderRoutes
 * @requires ./chatRoutes
 */

const express = require('express');
const orderRoutes = require('./orderRoutes');
const chatRoutes = require('./chatRoutes');
const { notFound } = require('../middleware/errorHandler');
const router = express.Router();

// Add API version and timestamp to all responses
router.use((req, res, next) => {
  res.locals.apiVersion = '1.0.0';
  res.locals.timestamp = new Date().toISOString();
  
  // Override res.json to include API metadata
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object') {
      const meta = {
        apiVersion: res.locals.apiVersion,
        timestamp: res.locals.timestamp,
      };
      
      return originalJson.call(this, { ...data, meta });
    }
    return originalJson.call(this, data);
  };
  
  next();
});

// Register all routes
router.use('/orders', orderRoutes);
router.use('/chat', chatRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'Order Reassignment Notification API',
    timestamp: new Date().toISOString(),
  });
});

// API documentation redirect
router.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// 404 handler for API routes
router.use((req, res, next) => {
  next(notFound(`API endpoint not found: ${req.originalUrl}`));
});

module.exports = router; 