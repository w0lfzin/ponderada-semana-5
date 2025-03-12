/**
 * @fileoverview Order Routes
 * @module routes/orderRoutes
 * @requires express
 * @requires ../controllers/orderController
 */

const express = require('express');
const orderController = require('../controllers/orderController');
const router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: Create a new order in the system
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - orderDetails
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               orderDetails:
 *                 type: object
 *                 properties:
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                   totalAmount:
 *                     type: number
 *                   deliveryAddress:
 *                     type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', orderController.createOrder);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     description: Retrieve order details by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:orderId', orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   get:
 *     summary: Get order status
 *     description: Retrieve the current status of an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:orderId/status', orderController.getOrderStatus);

/**
 * @swagger
 * /api/orders/{orderId}/assign:
 *   post:
 *     summary: Assign order to driver
 *     description: Assign an order to a specific driver
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: string
 *                 description: Driver ID
 *     responses:
 *       200:
 *         description: Order assigned successfully
 *       400:
 *         description: Bad request - Missing driver ID
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/:orderId/assign', orderController.assignOrderToDriver);

/**
 * @swagger
 * /api/orders/{orderId}/driver-response:
 *   post:
 *     summary: Handle driver response to assignment
 *     description: Record whether a driver accepts or rejects an order assignment
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *               - accepted
 *             properties:
 *               driverId:
 *                 type: string
 *                 description: Driver ID
 *               accepted:
 *                 type: boolean
 *                 description: Whether the driver accepted the order
 *     responses:
 *       200:
 *         description: Driver response recorded successfully
 *       400:
 *         description: Bad request - Missing required fields
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/:orderId/driver-response', orderController.handleDriverResponse);

module.exports = router; 