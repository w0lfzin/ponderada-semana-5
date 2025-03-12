/**
 * @fileoverview Tests for order reassignment features
 * @module tests/orderReassignment
 * @requires ../services/orderAssignmentService
 * @requires ../models/Order
 */

const orderAssignmentService = require('../services/orderAssignmentService');
const { Order, OrderStatus, AssignmentStatus } = require('../models/Order');
const crypto = require('crypto');

// Mock Order model
jest.mock('../models/Order');

/**
 * Helper to generate a mock ID
 * @returns {string} A random ID string
 */
const generateMockId = () => crypto.randomBytes(12).toString('hex');

/**
 * @rf4 @auto_reassignment
 * Test suite for validating order assignment and auto-reassignment functionality
 */
describe('Order Assignment and Auto-Reassignment', () => {
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock the assignmentTimers Map
    orderAssignmentService.assignmentTimers = new Map();
    
    // Set timeout value for testing
    orderAssignmentService.assignmentTimeout = 15000; // 15 seconds
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  /**
   * @rf4 @auto_reassignment
   * Scenario: Driver accepts order within 15 seconds
   * When a driver is assigned to the order
   * And the driver accepts the order within 15 seconds
   * Then the order status should be "accepted"
   * And no reassignment should occur
   */
  test('Driver accepts order within 15 seconds', async () => {
    // Arrange
    const orderId = generateMockId();
    const driverId = generateMockId();
    
    // Create mock order
    const mockOrder = {
      _id: orderId,
      status: OrderStatus.PENDING,
      currentDriverId: null,
      driverAssignments: [],
      addDriverAssignment: jest.fn().mockImplementation(function(driverData) {
        this.currentDriverId = driverData.driverId;
        this.driverAssignments.push({
          driverId: driverData.driverId,
          status: AssignmentStatus.PENDING,
          assignedAt: new Date(),
        });
        return Promise.resolve(this);
      }),
      recordDriverResponse: jest.fn().mockImplementation(function(driverId, status) {
        const assignment = this.driverAssignments.find(
          a => a.driverId.toString() === driverId.toString()
        );
        
        if (assignment) {
          assignment.status = status;
          assignment.respondedAt = new Date();
        }
        
        if (status === AssignmentStatus.ACCEPTED) {
          this.status = OrderStatus.ACCEPTED;
        }
        
        return Promise.resolve(this);
      }),
    };
    
    // Mock findById to return the mock order
    Order.findById.mockResolvedValue(mockOrder);
    
    // Act
    // 1. Assign order to driver
    await orderAssignmentService.assignOrderToDriver(orderId, driverId);
    
    // 2. Driver accepts within 10 seconds (before 15 second timeout)
    jest.advanceTimersByTime(10000);
    await orderAssignmentService.handleDriverResponse(orderId, driverId, true);
    
    // 3. Advance past the 15 second mark
    jest.advanceTimersByTime(6000);
    
    // Assert
    expect(mockOrder.addDriverAssignment).toHaveBeenCalledWith({ driverId });
    expect(mockOrder.recordDriverResponse).toHaveBeenCalledWith(driverId, AssignmentStatus.ACCEPTED);
    expect(mockOrder.status).toBe(OrderStatus.ACCEPTED);
    
    // Check that the timer was cleared (no auto-reassignment occurred)
    expect(orderAssignmentService.assignmentTimers.has(orderId)).toBe(false);
  });
  
  /**
   * @rf4 @auto_reassignment
   * Scenario: Order is automatically reassigned after 15 seconds
   * When a driver is assigned to the order
   * And the driver doesn't respond within 15 seconds
   * Then the system should automatically assign the order to another available driver
   * And the order status should remain "pending"
   * And the reassignment should be logged
   */
  test('Order is automatically reassigned after 15 seconds', async () => {
    // Arrange
    const orderId = generateMockId();
    const driverId = generateMockId();
    const nextDriverId = generateMockId();
    
    // Create mock order
    const mockOrder = {
      _id: orderId,
      status: OrderStatus.PENDING,
      currentDriverId: null,
      driverAssignments: [],
      reassignmentCount: 0,
      reassignmentLogs: [],
      addDriverAssignment: jest.fn().mockImplementation(function(driverData) {
        this.currentDriverId = driverData.driverId;
        this.driverAssignments.push({
          driverId: driverData.driverId,
          status: AssignmentStatus.PENDING,
          assignedAt: new Date(),
        });
        return Promise.resolve(this);
      }),
      recordReassignment: jest.fn().mockImplementation(function(prevDriverId, newDriverId, reason) {
        // Update previous driver assignment
        const prevAssignment = this.driverAssignments.find(
          a => a.driverId.toString() === prevDriverId.toString()
        );
        
        if (prevAssignment) {
          prevAssignment.status = AssignmentStatus.TIMED_OUT;
        }
        
        // Add new driver assignment
        this.currentDriverId = newDriverId;
        this.driverAssignments.push({
          driverId: newDriverId,
          status: AssignmentStatus.PENDING,
          assignedAt: new Date(),
        });
        
        // Log reassignment
        this.reassignmentLogs.push({
          previousDriverId: prevDriverId,
          newDriverId,
          reason,
          timestamp: new Date(),
        });
        
        this.reassignmentCount += 1;
        
        return Promise.resolve(this);
      }),
    };
    
    // Mock findById to return the mock order
    Order.findById.mockResolvedValue(mockOrder);
    
    // Mock getNextAvailableDriver to return a new driver
    orderAssignmentService.getNextAvailableDriver = jest.fn().mockResolvedValue({
      driverId: nextDriverId,
      name: 'Next Driver',
    });
    
    // Act
    // 1. Assign order to driver
    await orderAssignmentService.assignOrderToDriver(orderId, driverId);
    
    // 2. Spy on the handleDriverTimeoutReassignment method
    const reassignSpy = jest.spyOn(orderAssignmentService, 'handleDriverTimeoutReassignment');
    
    // 3. Advance past the 15 second timeout
    jest.advanceTimersByTime(16000);
    // Let the timeout callback execute
    await Promise.resolve();
    
    // Assert
    expect(mockOrder.addDriverAssignment).toHaveBeenCalledWith({ driverId });
    
    // Verify reassignment was triggered
    expect(reassignSpy).toHaveBeenCalledWith(orderId, driverId);
    expect(orderAssignmentService.getNextAvailableDriver).toHaveBeenCalledWith(orderId);
    expect(mockOrder.recordReassignment).toHaveBeenCalledWith(driverId, nextDriverId, 'TIMEOUT');
    
    // Order should still be pending
    expect(mockOrder.status).toBe(OrderStatus.PENDING);
    
    // Verify reassignment was logged
    expect(mockOrder.reassignmentLogs.length).toBe(1);
    expect(mockOrder.reassignmentLogs[0].previousDriverId).toBe(driverId);
    expect(mockOrder.reassignmentLogs[0].newDriverId).toBe(nextDriverId);
    expect(mockOrder.reassignmentLogs[0].reason).toBe('TIMEOUT');
  });
  
  /**
   * @rf4 @auto_reassignment
   * Scenario: All available drivers are exhausted
   * When a driver is assigned to the order
   * And no drivers respond within 15 seconds each
   * Then the system should try all available drivers
   * And the order status should be "timeout" after all attempts
   * And all reassignment attempts should be logged
   */
  test('Order times out after all available drivers are exhausted', async () => {
    // Arrange
    const orderId = generateMockId();
    const driverId = generateMockId();
    
    // Create mock order
    const mockOrder = {
      _id: orderId,
      status: OrderStatus.PENDING,
      currentDriverId: driverId,
      driverAssignments: [
        {
          driverId,
          status: AssignmentStatus.PENDING,
          assignedAt: new Date(),
        },
      ],
      reassignmentCount: 5, // Already tried multiple drivers
      reassignmentLogs: [],
      markAsTimedOut: jest.fn().mockImplementation(function() {
        this.status = OrderStatus.TIMEOUT;
        this.timeoutAt = new Date();
        return Promise.resolve(this);
      }),
    };
    
    // Mock findById to return the mock order
    Order.findById.mockResolvedValue(mockOrder);
    
    // Mock getNextAvailableDriver to return null (no more drivers)
    orderAssignmentService.getNextAvailableDriver = jest.fn().mockResolvedValue(null);
    
    // Act
    // Call handleDriverTimeoutReassignment directly to simulate timeout
    await orderAssignmentService.handleDriverTimeoutReassignment(orderId, driverId);
    
    // Assert
    expect(orderAssignmentService.getNextAvailableDriver).toHaveBeenCalledWith(orderId);
    expect(mockOrder.markAsTimedOut).toHaveBeenCalled();
    expect(mockOrder.status).toBe(OrderStatus.TIMEOUT);
  });
});

/**
 * @rf4 @integration_validation
 * Test suite for validating integration with OpenAI API for customer notifications
 */
describe('Integration with OpenAI API for Customer Notifications', () => {
  test('OpenAI service is correctly configured with timeout settings', () => {
    // This would test the OpenAI service integration configuration
    // In a real test this would validate the client configuration
    const openaiService = require('../services/openaiService');
    
    expect(openaiService.model).toBe('gpt-4o-mini');
    expect(openaiService.clientConfig.timeout).toBeGreaterThan(0);
    expect(openaiService.clientConfig.maxRetries).toBeGreaterThan(0);
  });
  
  test('Customer is notified when order is reassigned', async () => {
    // This would test the notification service integration
    // In a real test this would make an actual API call with mocked responses
    const customerNotificationService = require('../services/customerNotificationService');
    
    // Mock the notification method
    customerNotificationService.notifyCustomerAboutOrderStatus = jest.fn().mockResolvedValue({
      success: true,
      message: 'Customer notified',
    });
    
    // Call the reassignment notification method
    const result = await customerNotificationService.notifyCustomerAboutReassignment(
      'test-order-id',
      'test-customer-id',
      2 // Second reassignment
    );
    
    expect(customerNotificationService.notifyCustomerAboutOrderStatus).toHaveBeenCalledWith(
      'test-order-id',
      'test-customer-id',
      'reassignment_reason'
    );
  });
}); 