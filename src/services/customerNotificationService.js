/**
 * @fileoverview Customer Notification Service
 * @module services/customerNotificationService
 * @requires ./openaiService
 * @requires ./orderAssignmentService
 * @requires ../utils/logger
 */

const openaiService = require('./openaiService');
const orderAssignmentService = require('./orderAssignmentService');
const logger = require('../utils/logger');

/**
 * @class CustomerNotificationService
 * @description Service to handle customer notifications about order status
 */
class CustomerNotificationService {
  /**
   * Constructor for CustomerNotificationService
   * @constructor
   */
  constructor() {
    // Configure notification settings
    this.enableReassignmentNotifications = process.env.ENABLE_REASSIGNMENT_NOTIFICATIONS === 'true';
    this.maxNotificationsPerOrder = parseInt(process.env.MAX_NOTIFICATIONS_PER_ORDER || '3');
    
    // Track notifications sent per order to prevent spam
    this.notificationCounters = new Map();
    
    logger.info(`CustomerNotificationService initialized. Reassignment notifications enabled: ${this.enableReassignmentNotifications}`);
  }
  
  /**
   * Generate and send order status notification to customer
   * @async
   * @function notifyCustomerAboutOrderStatus
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   * @param {string} queryType - Query type (general_status, reassignment_reason, etc.)
   * @returns {Promise<Object>} Notification details
   */
  async notifyCustomerAboutOrderStatus(orderId, customerId, queryType = 'general_status') {
    try {
      // Check notification limit for this order
      if (this.shouldLimitNotifications(orderId)) {
        logger.warn(`Notification limit reached for order ${orderId}`);
        return {
          success: false,
          orderId,
          customerId,
          message: 'Notification limit reached for this order',
        };
      }
      
      // Get order status
      const orderStatus = await orderAssignmentService.getOrderStatus(orderId);
      
      // Generate message using OpenAI
      const startTime = Date.now();
      const message = await openaiService.generateOrderStatusMessage(orderStatus, queryType);
      const responseTime = Date.now() - startTime;
      
      // Log notification
      this.incrementNotificationCounter(orderId);
      
      logger.info(`Customer notification sent for order ${orderId}`, {
        customerId,
        queryType,
        responseTime,
        notificationCount: this.getNotificationCount(orderId),
      });
      
      // In a real system, you would actually send this message to the customer
      // through your notification channel (SMS, email, app notification, etc.)
      
      return {
        success: true,
        orderId,
        customerId,
        queryType,
        message,
        sentAt: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      logger.error(`Error sending notification for order ${orderId}:`, error);
      
      return {
        success: false,
        orderId,
        customerId,
        error: error.message,
      };
    }
  }
  
  /**
   * Notify customer about order reassignment
   * @async
   * @function notifyCustomerAboutReassignment
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   * @param {number} reassignmentCount - Number of reassignments
   * @returns {Promise<Object>} Notification details
   */
  async notifyCustomerAboutReassignment(orderId, customerId, reassignmentCount) {
    // Skip notification if disabled
    if (!this.enableReassignmentNotifications) {
      logger.debug(`Reassignment notifications disabled, skipping for order ${orderId}`);
      return { success: false, orderId, skipped: true };
    }
    
    // Skip first reassignment notification to reduce noise
    if (reassignmentCount <= 1) {
      logger.debug(`Skipping first reassignment notification for order ${orderId}`);
      return { success: false, orderId, skipped: true };
    }
    
    return this.notifyCustomerAboutOrderStatus(orderId, customerId, 'reassignment_reason');
  }
  
  /**
   * Notify customer about order timeout
   * @async
   * @function notifyCustomerAboutTimeout
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Notification details
   */
  async notifyCustomerAboutTimeout(orderId, customerId) {
    // Always notify about timeouts as they're critical
    return this.notifyCustomerAboutOrderStatus(orderId, customerId, 'timeout_explanation');
  }
  
  /**
   * Check if we should limit notifications for this order
   * @function shouldLimitNotifications
   * @param {string} orderId - Order ID
   * @returns {boolean} Whether to limit notifications
   */
  shouldLimitNotifications(orderId) {
    return this.getNotificationCount(orderId) >= this.maxNotificationsPerOrder;
  }
  
  /**
   * Get notification count for an order
   * @function getNotificationCount
   * @param {string} orderId - Order ID
   * @returns {number} Notification count
   */
  getNotificationCount(orderId) {
    return this.notificationCounters.get(orderId) || 0;
  }
  
  /**
   * Increment notification counter for an order
   * @function incrementNotificationCounter
   * @param {string} orderId - Order ID
   */
  incrementNotificationCounter(orderId) {
    const currentCount = this.getNotificationCount(orderId);
    this.notificationCounters.set(orderId, currentCount + 1);
  }
  
  /**
   * Handle customer chatbot query
   * @async
   * @function handleCustomerChatbotQuery
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID
   * @param {string} query - Customer query text
   * @returns {Promise<Object>} Chatbot response
   */
  async handleCustomerChatbotQuery(orderId, customerId, query) {
    try {
      // Determine query type from text
      const queryType = this.determineQueryType(query);
      
      // Get response from OpenAI
      const orderStatus = await orderAssignmentService.getOrderStatus(orderId);
      
      const startTime = Date.now();
      const response = await openaiService.generateOrderStatusMessage(orderStatus, queryType);
      const responseTime = Date.now() - startTime;
      
      logger.info(`Chatbot response generated for order ${orderId}`, {
        customerId,
        queryType,
        responseTime,
      });
      
      return {
        success: true,
        orderId,
        customerId,
        queryType,
        response,
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error) {
      logger.error(`Error handling chatbot query for order ${orderId}:`, error);
      
      return {
        success: false,
        orderId,
        customerId,
        error: error.message,
      };
    }
  }
  
  /**
   * Determine query type from customer message
   * @function determineQueryType
   * @param {string} query - Customer query text
   * @returns {string} Query type
   */
  determineQueryType(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('atraso') || queryLower.includes('demora')) {
      return 'delay_explanation';
    }
    
    if (queryLower.includes('novo motorista') || queryLower.includes('reatribuição')) {
      return 'reassignment_reason';
    }
    
    if (queryLower.includes('cancelar') || queryLower.includes('cancelamento')) {
      return 'timeout_explanation';
    }
    
    // Default to general status
    return 'general_status';
  }
}

module.exports = new CustomerNotificationService(); 