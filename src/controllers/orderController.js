/**
 * @fileoverview Order Controller
 * @module controllers/orderController
 * @requires ../models/Order
 * @requires ../services/orderAssignmentService
 * @requires ../services/customerNotificationService
 * @requires ../middleware/errorHandler
 * @requires ../utils/logger
 */

const { Order, OrderStatus } = require('../models/Order');
const orderAssignmentService = require('../services/orderAssignmentService');
const customerNotificationService = require('../services/customerNotificationService');
const { badRequest, notFound } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Create a new order
 * @async
 * @function createOrder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with created order
 */
const createOrder = async (req, res, next) => {
  try {
    const { customerId, orderDetails } = req.body;
    
    if (!customerId || !orderDetails) {
      return next(badRequest('Missing required fields: customerId and orderDetails'));
    }
    
    const newOrder = new Order({
      customerId,
      orderDetails,
      status: OrderStatus.PENDING,
    });
    
    await newOrder.save();
    
    logger.info(`New order created: ${newOrder._id}`, {
      customerId,
      totalAmount: orderDetails.totalAmount,
    });
    
    return res.status(201).json({
      success: true,
      order: newOrder,
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    return next(error);
  }
};

/**
 * Get order by ID
 * @async
 * @function getOrderById
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with order details
 */
const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return next(notFound(`Order not found: ${orderId}`));
    }
    
    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    logger.error(`Error fetching order ${req.params.orderId}:`, error);
    return next(error);
  }
};

/**
 * Assign order to driver
 * @async
 * @function assignOrderToDriver
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with assignment details
 */
const assignOrderToDriver = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return next(badRequest('Driver ID is required'));
    }
    
    const updatedOrder = await orderAssignmentService.assignOrderToDriver(orderId, driverId);
    
    return res.status(200).json({
      success: true,
      message: `Order ${orderId} assigned to driver ${driverId}`,
      order: updatedOrder,
    });
  } catch (error) {
    logger.error(`Error assigning order ${req.params.orderId}:`, error);
    return next(error);
  }
};

/**
 * Handle driver response to assignment
 * @async
 * @function handleDriverResponse
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with updated order
 */
const handleDriverResponse = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { driverId, accepted } = req.body;
    
    if (driverId === undefined || accepted === undefined) {
      return next(badRequest('Driver ID and response (accepted) are required'));
    }
    
    const updatedOrder = await orderAssignmentService.handleDriverResponse(
      orderId,
      driverId,
      accepted
    );
    
    // If order was reassigned, notify customer
    if (!accepted && updatedOrder.reassignmentCount > 0) {
      // Send notification asynchronously
      customerNotificationService.notifyCustomerAboutReassignment(
        orderId,
        updatedOrder.customerId,
        updatedOrder.reassignmentCount
      ).catch(error => {
        logger.error(`Failed to send reassignment notification for order ${orderId}:`, error);
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Driver ${driverId} ${accepted ? 'accepted' : 'rejected'} order ${orderId}`,
      order: updatedOrder,
    });
  } catch (error) {
    logger.error(`Error handling driver response for order ${req.params.orderId}:`, error);
    return next(error);
  }
};

/**
 * Get order status
 * @async
 * @function getOrderStatus
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Promise<Object>} Response with order status
 */
const getOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const orderStatus = await orderAssignmentService.getOrderStatus(orderId);
    
    return res.status(200).json({
      success: true,
      orderStatus,
    });
  } catch (error) {
    logger.error(`Error getting status for order ${req.params.orderId}:`, error);
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  assignOrderToDriver,
  handleDriverResponse,
  getOrderStatus,
}; 