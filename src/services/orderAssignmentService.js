/**
 * @fileoverview Order Assignment Service
 * @module services/orderAssignmentService
 * @requires ../models/Order
 * @requires ../utils/logger
 */

const { Order, OrderStatus, AssignmentStatus } = require('../models/Order');
const logger = require('../utils/logger');

/**
 * @class OrderAssignmentService
 * @description Service to handle order assignments to drivers
 */
class OrderAssignmentService {
  /**
   * Constructor for OrderAssignmentService
   * @constructor
   */
  constructor() {
    this.assignmentTimeout = parseInt(process.env.DRIVER_ASSIGNMENT_TIMEOUT || '15000');
    this.maxAssignmentAttempts = parseInt(process.env.MAX_ASSIGNMENT_ATTEMPTS || '5');
    this.assignmentTimers = new Map(); // Track timers for each order
    
    logger.info(`OrderAssignmentService initialized with timeout: ${this.assignmentTimeout}ms, max attempts: ${this.maxAssignmentAttempts}`);
  }
  
  /**
   * Assign order to a driver
   * @async
   * @function assignOrderToDriver
   * @param {string} orderId - Order ID
   * @param {string} driverId - Driver ID
   * @returns {Promise<Object>} Updated order
   * @throws {Error} If assignment fails
   */
  async assignOrderToDriver(orderId, driverId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      if (order.status !== OrderStatus.PENDING) {
        throw new Error(`Cannot assign: Order ${orderId} has status ${order.status}`);
      }
      
      // Assign the driver
      await order.addDriverAssignment({ driverId });
      
      // Set up auto-reassignment timer
      this.setupAutoReassignment(orderId, driverId);
      
      logger.info(`Order ${orderId} assigned to driver ${driverId}`);
      
      return order;
    } catch (error) {
      logger.error(`Error assigning order ${orderId} to driver ${driverId}:`, error);
      throw error;
    }
  }
  
  /**
   * Set up auto-reassignment timer
   * @function setupAutoReassignment
   * @param {string} orderId - Order ID
   * @param {string} driverId - Driver ID
   */
  setupAutoReassignment(orderId, driverId) {
    // Clear any existing timer for this order
    if (this.assignmentTimers.has(orderId)) {
      clearTimeout(this.assignmentTimers.get(orderId));
    }
    
    // Create new timer for auto-reassignment
    const timer = setTimeout(async () => {
      try {
        await this.handleDriverTimeoutReassignment(orderId, driverId);
      } catch (error) {
        logger.error(`Auto-reassignment error for order ${orderId}:`, error);
      }
    }, this.assignmentTimeout);
    
    // Store timer reference
    this.assignmentTimers.set(orderId, timer);
    
    logger.debug(`Auto-reassignment timer set for order ${orderId}, driver ${driverId}: ${this.assignmentTimeout}ms`);
  }
  
  /**
   * Handle driver timeout reassignment
   * @async
   * @function handleDriverTimeoutReassignment
   * @param {string} orderId - Order ID
   * @param {string} driverId - Current driver ID
   * @returns {Promise<Object>} Updated order
   */
  async handleDriverTimeoutReassignment(orderId, driverId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Check if order still needs reassignment
      const currentAssignment = order.driverAssignments.find(
        a => a.driverId.toString() === driverId.toString() && 
            a.status === AssignmentStatus.PENDING
      );
      
      if (!currentAssignment) {
        logger.debug(`No reassignment needed for order ${orderId}: driver already responded`);
        return order;
      }
      
      // Get next available driver
      const nextDriver = await this.getNextAvailableDriver(orderId);
      
      if (!nextDriver) {
        logger.warn(`No more drivers available for order ${orderId} after ${order.reassignmentCount} attempts`);
        
        // Mark order as timed out
        await order.markAsTimedOut();
        
        // Clean up timer
        if (this.assignmentTimers.has(orderId)) {
          clearTimeout(this.assignmentTimers.get(orderId));
          this.assignmentTimers.delete(orderId);
        }
        
        return order;
      }
      
      // Reassign order to new driver
      await order.recordReassignment(driverId, nextDriver.driverId, 'TIMEOUT');
      
      // Set up new auto-reassignment timer
      this.setupAutoReassignment(orderId, nextDriver.driverId);
      
      logger.info(`Order ${orderId} reassigned from driver ${driverId} to ${nextDriver.driverId} after timeout`);
      
      return order;
    } catch (error) {
      logger.error(`Error handling timeout reassignment for order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle driver response to order assignment
   * @async
   * @function handleDriverResponse
   * @param {string} orderId - Order ID
   * @param {string} driverId - Driver ID
   * @param {boolean} accepted - Whether driver accepted order
   * @returns {Promise<Object>} Updated order
   */
  async handleDriverResponse(orderId, driverId, accepted) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Check if this driver is the current assignee
      if (order.currentDriverId.toString() !== driverId.toString()) {
        throw new Error(`Driver ${driverId} is not currently assigned to order ${orderId}`);
      }
      
      // Clear auto-reassignment timer
      if (this.assignmentTimers.has(orderId)) {
        clearTimeout(this.assignmentTimers.get(orderId));
        this.assignmentTimers.delete(orderId);
      }
      
      // Record response
      const status = accepted ? AssignmentStatus.ACCEPTED : AssignmentStatus.REJECTED;
      await order.recordDriverResponse(driverId, status);
      
      // If rejected, find next driver
      if (!accepted) {
        const nextDriver = await this.getNextAvailableDriver(orderId);
        
        if (!nextDriver) {
          logger.warn(`No more drivers available for order ${orderId} after ${order.reassignmentCount} attempts`);
          await order.markAsTimedOut();
          return order;
        }
        
        // Reassign order to new driver
        await order.recordReassignment(driverId, nextDriver.driverId, 'REJECTION');
        
        // Set up new auto-reassignment timer
        this.setupAutoReassignment(orderId, nextDriver.driverId);
      }
      
      logger.info(`Driver ${driverId} ${accepted ? 'accepted' : 'rejected'} order ${orderId}`);
      
      return order;
    } catch (error) {
      logger.error(`Error handling driver response for order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get next available driver for assignment
   * @async
   * @function getNextAvailableDriver
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} Next available driver or null if none found
   */
  async getNextAvailableDriver(orderId) {
    // This would normally call your driver service to find available drivers
    // For this example, we'll simulate it with fake drivers
    
    const order = await Order.findById(orderId);
    const previousDriverIds = order.driverAssignments.map(a => a.driverId.toString());
    
    // Check if we've reached max attempts
    if (previousDriverIds.length >= this.maxAssignmentAttempts) {
      return null;
    }
    
    // Mock available drivers (In a real system, you'd query your driver database)
    const availableDrivers = [
      { driverId: '6123456789abcdef01234567', name: 'Driver 1' },
      { driverId: '6123456789abcdef01234568', name: 'Driver 2' },
      { driverId: '6123456789abcdef01234569', name: 'Driver 3' },
      { driverId: '6123456789abcdef01234570', name: 'Driver 4' },
      { driverId: '6123456789abcdef01234571', name: 'Driver 5' },
    ];
    
    // Find a driver we haven't tried yet
    const nextDriver = availableDrivers.find(driver => !previousDriverIds.includes(driver.driverId));
    
    return nextDriver || null;
  }
  
  /**
   * Get order status including reassignment history
   * @async
   * @function getOrderStatus
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order status details
   */
  async getOrderStatus(orderId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      return {
        orderId: order._id,
        status: order.status,
        currentDriverId: order.currentDriverId,
        reassignmentCount: order.reassignmentCount,
        reassignmentLogs: order.reassignmentLogs,
        createdAt: order.createdAt,
        timeoutAt: order.timeoutAt,
        assignmentTimeout: order.assignmentTimeout,
        orderDetails: order.orderDetails,
      };
    } catch (error) {
      logger.error(`Error getting status for order ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Cleanup order timers
   * @function cleanupOrderTimers
   * @param {string} orderId - Order ID
   */
  cleanupOrderTimers(orderId) {
    if (this.assignmentTimers.has(orderId)) {
      clearTimeout(this.assignmentTimers.get(orderId));
      this.assignmentTimers.delete(orderId);
      logger.debug(`Cleaned up timer for order ${orderId}`);
    }
  }
}

module.exports = new OrderAssignmentService(); 