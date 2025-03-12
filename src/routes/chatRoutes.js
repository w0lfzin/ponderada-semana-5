/**
 * @fileoverview Chat Routes
 * @module routes/chatRoutes
 * @requires express
 * @requires ../controllers/chatController
 */

const express = require('express');
const chatController = require('../controllers/chatController');
const router = express.Router();

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Handle customer chat query
 *     description: Process a customer chat message and return a response
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - customerId
 *               - message
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               message:
 *                 type: string
 *                 description: Customer message
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 response:
 *                   type: string
 *                   description: Chatbot response
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', chatController.handleChatQuery);

/**
 * @swagger
 * /api/chat/history/{orderId}:
 *   get:
 *     summary: Get chat history for an order
 *     description: Retrieve the chat history between customer and chatbot for a specific order
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       400:
 *         description: Bad request - Missing order ID
 *       500:
 *         description: Server error
 */
router.get('/history/:orderId', chatController.getChatHistory);

/**
 * @swagger
 * /api/chat/health:
 *   get:
 *     summary: Get chat service health status
 *     description: Check the health of the chat service and its dependencies
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/health', chatController.getHealthStatus);

module.exports = router; 