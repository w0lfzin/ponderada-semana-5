/**
 * @fileoverview Chat Controller
 * @module controllers/chatController
 * @requires ../services/customerNotificationService
 * @requires ../middleware/errorHandler
 * @requires ../utils/logger
 */

const customerNotificationService = require('../services/customerNotificationService');
const { badRequest, notFound } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Handle customer chat query
 * @async
 * @function handleChatQuery
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with chatbot answer
 */
const handleChatQuery = async (req, res, next) => {
  try {
    const { orderId, customerId, message } = req.body;
    
    // Validate required fields
    if (!orderId || !customerId || !message) {
      return next(badRequest('Missing required fields: orderId, customerId, and message are required'));
    }
    
    // Log incoming chat query
    logger.info(`Received chat query for order ${orderId}`, {
      customerId,
      messageLength: message.length,
    });
    
    // Process query and get response
    const startTime = Date.now();
    const response = await customerNotificationService.handleCustomerChatbotQuery(
      orderId,
      customerId,
      message
    );
    const responseTime = Date.now() - startTime;
    
    // Add response time for monitoring
    response.processingTime = responseTime;
    
    // Return response to customer
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error handling chat query:', error);
    return next(error);
  }
};

/**
 * Get chat history for an order
 * @async
 * @function getChatHistory
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with chat history
 */
const getChatHistory = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { customerId } = req.query;
    
    if (!orderId) {
      return next(badRequest('Order ID is required'));
    }
    
    // In a real system, you would fetch the chat history from your database
    // For this example, we'll return a mock response
    
    return res.status(200).json({
      success: true,
      orderId,
      customerId: customerId || 'unknown',
      history: [
        {
          sender: 'customer',
          message: 'Where is my order?',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          sender: 'bot',
          message: 'Your order is currently being reassigned to a new driver. This happens when a driver doesn\'t respond within 15 seconds. We\'ve made 2 reassignments so far and are working to get your order delivered as soon as possible.',
          timestamp: new Date(Date.now() - 3590000).toISOString(),
        },
      ],
    });
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    return next(error);
  }
};

/**
 * Get health status of the chat service
 * @async
 * @function getHealthStatus
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with health status
 */
const getHealthStatus = async (req, res, next) => {
  try {
    // Check OpenAI API health
    const openaiService = require('../services/openaiService');
    const apiHealth = await openaiService.getApiHealth();
    
    return res.status(200).json({
      success: true,
      status: apiHealth.status === 'healthy' ? 'healthy' : 'degraded',
      components: {
        openai: apiHealth,
        chatbot: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error checking chat service health:', error);
    
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  handleChatQuery,
  getChatHistory,
  getHealthStatus,
}; 