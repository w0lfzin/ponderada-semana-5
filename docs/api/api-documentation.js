/**
 * @fileoverview API Documentation as Code
 * 
 * This file documents the API endpoints for the Order Reassignment Notification system.
 * It's not meant to be executed, but serves as documentation in code form.
 */

/**
 * @name ApiVersion
 * @description API version information
 */
const apiVersion = {
  version: '1.0.0',
  releaseDate: '2023-05-15',
  baseUrl: '/api',
  contentType: 'application/json',
};

/**
 * @name OrderEndpoints
 * @description API endpoints for order management
 */
const orderEndpoints = {
  /**
   * Create a new order
   */
  createOrder: {
    path: '/orders',
    method: 'POST',
    description: 'Create a new order in the system',
    requestBody: {
      required: ['customerId', 'orderDetails'],
      properties: {
        customerId: {
          type: 'string',
          description: 'ID of the customer placing the order',
        },
        orderDetails: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number', minimum: 1 },
                  price: { type: 'number' },
                },
              },
            },
            totalAmount: { type: 'number' },
            deliveryAddress: { type: 'string' },
            deliveryCoordinates: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Order created successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                order: { type: 'object' },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      400: { description: 'Bad request - Missing required fields' },
      500: { description: 'Server error' },
    },
  },
  
  /**
   * Get order by ID
   */
  getOrderById: {
    path: '/orders/{orderId}',
    method: 'GET',
    description: 'Retrieve order details by ID',
    parameters: [
      {
        name: 'orderId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Order ID',
      },
    ],
    responses: {
      200: {
        description: 'Order retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                order: { type: 'object' },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      404: { description: 'Order not found' },
      500: { description: 'Server error' },
    },
  },
  
  /**
   * Get order status
   */
  getOrderStatus: {
    path: '/orders/{orderId}/status',
    method: 'GET',
    description: 'Retrieve the current status of an order',
    parameters: [
      {
        name: 'orderId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Order ID',
      },
    ],
    responses: {
      200: {
        description: 'Order status retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                orderStatus: {
                  type: 'object',
                  properties: {
                    orderId: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'accepted', 'completed', 'timeout', 'cancelled'] },
                    currentDriverId: { type: 'string' },
                    reassignmentCount: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      404: { description: 'Order not found' },
      500: { description: 'Server error' },
    },
  },
  
  /**
   * Assign order to driver
   */
  assignOrderToDriver: {
    path: '/orders/{orderId}/assign',
    method: 'POST',
    description: 'Assign an order to a specific driver',
    parameters: [
      {
        name: 'orderId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Order ID',
      },
    ],
    requestBody: {
      required: ['driverId'],
      properties: {
        driverId: {
          type: 'string',
          description: 'ID of the driver to assign',
        },
      },
    },
    responses: {
      200: {
        description: 'Order assigned successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                order: { type: 'object' },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      400: { description: 'Bad request - Missing driver ID' },
      404: { description: 'Order not found' },
      500: { description: 'Server error' },
    },
  },
  
  /**
   * Handle driver response
   */
  handleDriverResponse: {
    path: '/orders/{orderId}/driver-response',
    method: 'POST',
    description: 'Record whether a driver accepts or rejects an order assignment',
    parameters: [
      {
        name: 'orderId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Order ID',
      },
    ],
    requestBody: {
      required: ['driverId', 'accepted'],
      properties: {
        driverId: {
          type: 'string',
          description: 'ID of the driver responding',
        },
        accepted: {
          type: 'boolean',
          description: 'Whether the driver accepted the order',
        },
      },
    },
    responses: {
      200: {
        description: 'Driver response recorded successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                order: { type: 'object' },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      400: { description: 'Bad request - Missing required fields' },
      404: { description: 'Order not found' },
      500: { description: 'Server error' },
    },
  },
};

/**
 * @name ChatEndpoints
 * @description API endpoints for customer chat functionality
 */
const chatEndpoints = {
  /**
   * Handle chat query
   */
  handleChatQuery: {
    path: '/chat',
    method: 'POST',
    description: 'Process a customer chat message and return a response',
    requestBody: {
      required: ['orderId', 'customerId', 'message'],
      properties: {
        orderId: {
          type: 'string',
          description: 'ID of the order being discussed',
        },
        customerId: {
          type: 'string',
          description: 'ID of the customer sending the message',
        },
        message: {
          type: 'string',
          description: 'Customer\'s message content',
        },
      },
    },
    responses: {
      200: {
        description: 'Chat query processed successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                orderId: { type: 'string' },
                customerId: { type: 'string' },
                queryType: { type: 'string' },
                response: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                processingTime: { type: 'number' },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      400: { description: 'Bad request - Missing required fields' },
      500: { description: 'Server error' },
    },
  },
  
  /**
   * Get chat history
   */
  getChatHistory: {
    path: '/chat/history/{orderId}',
    method: 'GET',
    description: 'Retrieve the chat history for a specific order',
    parameters: [
      {
        name: 'orderId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Order ID',
      },
      {
        name: 'customerId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Customer ID',
      },
    ],
    responses: {
      200: {
        description: 'Chat history retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                orderId: { type: 'string' },
                customerId: { type: 'string' },
                history: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      sender: { type: 'string', enum: ['customer', 'bot'] },
                      message: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      400: { description: 'Bad request - Missing order ID' },
      500: { description: 'Server error' },
    },
  },
  
  /**
   * Get chat service health
   */
  getChatHealth: {
    path: '/chat/health',
    method: 'GET',
    description: 'Check health status of the chat service and its dependencies',
    responses: {
      200: {
        description: 'Health status retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                components: {
                  type: 'object',
                  properties: {
                    openai: { type: 'object' },
                    chatbot: { type: 'object' },
                  },
                },
                timestamp: { type: 'string', format: 'date-time' },
                meta: { type: 'object' },
              },
            },
          },
        },
      },
      500: { description: 'Server error' },
    },
  },
};

/**
 * @name RequiredHeaders
 * @description Required headers for API requests
 */
const requiredHeaders = {
  'Content-Type': {
    required: true,
    description: 'Must be application/json',
    example: 'application/json',
  },
};

/**
 * @name SecuritySchemes
 * @description Security schemes for API authentication
 */
const securitySchemes = {
  // For a real application, you would include authentication details here
  apiKey: {
    type: 'apiKey',
    name: 'X-API-Key',
    in: 'header',
    description: 'API key for authentication',
  },
};

/**
 * @name ApiErrorResponses
 * @description Common API error responses
 */
const apiErrorResponses = {
  400: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Missing required fields' },
            data: { type: 'object' },
            requestId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            meta: { type: 'object' },
          },
        },
      },
    },
  },
  404: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string', example: 'Resource not found' },
            data: { type: 'object' },
            requestId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            meta: { type: 'object' },
          },
        },
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'number', example: 500 },
            message: { type: 'string', example: 'Internal server error' },
            requestId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            meta: { type: 'object' },
          },
        },
      },
    },
  },
};

// Export API documentation
module.exports = {
  apiVersion,
  orderEndpoints,
  chatEndpoints,
  requiredHeaders,
  securitySchemes,
  apiErrorResponses,
}; 