/**
 * @fileoverview Order model definition
 * @module models/Order
 * @requires ../config/database
 */

const { getCollection } = require('../config/database');
const crypto = require('crypto');

/**
 * Order status enum values
 * @readonly
 * @enum {string}
 */
const OrderStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
};

/**
 * Assignment status enum values
 * @readonly
 * @enum {string}
 */
const AssignmentStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  TIMED_OUT: 'timed_out',
};

/**
 * Generate a unique ID
 * @function generateId
 * @returns {string} A unique ID
 */
function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Order class for in-memory storage
 * @class Order
 */
class Order {
  /**
   * Create a new order
   * @param {Object} orderData - Order data
   */
  constructor(orderData) {
    this._id = orderData._id || generateId();
    this.customerId = orderData.customerId;
    this.orderDetails = orderData.orderDetails || {
      items: [],
      totalAmount: 0,
      deliveryAddress: '',
      deliveryCoordinates: { latitude: 0, longitude: 0 }
    };
    this.status = orderData.status || OrderStatus.PENDING;
    this.currentDriverId = orderData.currentDriverId || null;
    this.driverAssignments = orderData.driverAssignments || [];
    this.createdAt = orderData.createdAt || new Date();
    this.updatedAt = orderData.updatedAt || new Date();
    this.completedAt = orderData.completedAt || null;
    this.timeoutAt = orderData.timeoutAt || null;
    this.assignmentTimeout = orderData.assignmentTimeout || 15; // seconds
    this.reassignmentCount = orderData.reassignmentCount || 0;
    this.reassignmentLogs = orderData.reassignmentLogs || [];
  }

  /**
   * Save the order to the in-memory database
   * @async
   * @returns {Promise<Order>} The saved order
   */
  async save() {
    this.updatedAt = new Date();
    const ordersCollection = getCollection('orders');
    ordersCollection.set(this._id, this);
    return Promise.resolve(this);
  }

  /**
   * Add a new driver assignment
   * @method addDriverAssignment
   * @param {Object} driverData - Driver assignment data
   * @param {string} driverData.driverId - Driver ID
   * @returns {Promise<Order>} Updated order object
   */
  async addDriverAssignment(driverData) {
    this.currentDriverId = driverData.driverId;
    this.driverAssignments.push({
      _id: generateId(),
      driverId: driverData.driverId,
      status: AssignmentStatus.PENDING,
      assignedAt: new Date(),
    });
    
    this.reassignmentCount = this.driverAssignments.length - 1;
    
    return this.save();
  }

  /**
   * Record driver response to assignment
   * @method recordDriverResponse
   * @param {string} driverId - Driver ID
   * @param {string} status - Response status (accepted, rejected)
   * @returns {Promise<Order>} Updated order object
   */
  async recordDriverResponse(driverId, status) {
    // Find the current assignment for this driver
    const assignment = this.driverAssignments.find(
      a => a.driverId.toString() === driverId.toString() && 
          a.status === AssignmentStatus.PENDING
    );
    
    if (!assignment) {
      throw new Error('No pending assignment found for this driver');
    }
    
    // Update the assignment
    assignment.status = status;
    assignment.respondedAt = new Date();
    assignment.responseTime = assignment.respondedAt - assignment.assignedAt;
    
    // Update order status if accepted
    if (status === AssignmentStatus.ACCEPTED) {
      this.status = OrderStatus.ACCEPTED;
    }
    
    return this.save();
  }

  /**
   * Record a reassignment when driver times out
   * @method recordReassignment
   * @param {string} previousDriverId - Previous driver ID
   * @param {string} newDriverId - New driver ID
   * @param {string} reason - Reason for reassignment
   * @returns {Promise<Order>} Updated order object
   */
  async recordReassignment(previousDriverId, newDriverId, reason) {
    // Update previous driver assignment
    const prevAssignment = this.driverAssignments.find(
      a => a.driverId.toString() === previousDriverId.toString() && 
          a.status === AssignmentStatus.PENDING
    );
    
    if (prevAssignment) {
      prevAssignment.status = AssignmentStatus.TIMED_OUT;
      prevAssignment.respondedAt = new Date();
      prevAssignment.responseTime = prevAssignment.respondedAt - prevAssignment.assignedAt;
    }
    
    // Add new driver assignment
    this.currentDriverId = newDriverId;
    this.driverAssignments.push({
      _id: generateId(),
      driverId: newDriverId,
      status: AssignmentStatus.PENDING,
      assignedAt: new Date(),
    });
    
    // Record reassignment log
    this.reassignmentLogs.push({
      _id: generateId(),
      previousDriverId,
      newDriverId,
      reason,
      timestamp: new Date(),
    });
    
    this.reassignmentCount += 1;
    
    return this.save();
  }

  /**
   * Mark order as timed out after all drivers exhausted
   * @method markAsTimedOut
   * @returns {Promise<Order>} Updated order object
   */
  async markAsTimedOut() {
    this.status = OrderStatus.TIMEOUT;
    this.timeoutAt = new Date();
    return this.save();
  }

  /**
   * Find an order by ID
   * @static
   * @async
   * @param {string} id - Order ID
   * @returns {Promise<Order|null>} The found order or null
   */
  static async findById(id) {
    const ordersCollection = getCollection('orders');
    const orderData = ordersCollection.get(id);
    return orderData ? Promise.resolve(new Order(orderData)) : Promise.resolve(null);
  }

  /**
   * Find orders by a query
   * @static
   * @async
   * @param {Object} query - Query object
   * @returns {Promise<Order[]>} Array of orders
   */
  static async find(query = {}) {
    const ordersCollection = getCollection('orders');
    const orders = [];
    
    for (const [id, orderData] of ordersCollection.entries()) {
      let matches = true;
      
      // Check if order matches all query criteria
      for (const [key, value] of Object.entries(query)) {
        if (orderData[key] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        orders.push(new Order(orderData));
      }
    }
    
    return Promise.resolve(orders);
  }

  /**
   * Find one order by a query
   * @static
   * @async
   * @param {Object} query - Query object
   * @returns {Promise<Order|null>} The found order or null
   */
  static async findOne(query = {}) {
    const orders = await Order.find(query);
    return orders.length > 0 ? orders[0] : null;
  }

  /**
   * Delete an order by ID
   * @static
   * @async
   * @param {string} id - Order ID
   * @returns {Promise<boolean>} Whether the order was deleted
   */
  static async deleteById(id) {
    const ordersCollection = getCollection('orders');
    return Promise.resolve(ordersCollection.delete(id));
  }
}

module.exports = {
  Order,
  OrderStatus,
  AssignmentStatus,
}; 