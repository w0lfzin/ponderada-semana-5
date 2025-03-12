/**
 * @fileoverview OpenAI API Integration Service
 * @module services/openaiService
 * @requires openai
 * @requires ../utils/logger
 */

const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');

dotenv.config();

/**
 * @class OpenAIService
 * @description Service for integrating with OpenAI API
 */
class OpenAIService {
  /**
   * Creates an instance of OpenAIService
   * @constructor
   */
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    // Record API version and client config for monitoring
    this.apiVersion = this.client.apiVersion || 'unknown';
    this.clientConfig = {
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      baseURL: this.client.baseURL || 'https://api.openai.com/v1',
    };
    
    logger.info(`OpenAI Service initialized with model: ${this.model}, API version: ${this.apiVersion}`);
  }

  /**
   * Generate customer notification for order reassignment
   * @async
   * @function generateOrderStatusMessage
   * @param {Object} orderData - Order data
   * @param {string} orderData.orderId - Order ID
   * @param {string} orderData.status - Current order status
   * @param {number} orderData.reassignmentCount - Number of reassignments
   * @param {Array} [orderData.reassignmentLogs] - Logs of reassignments
   * @param {Object} orderData.orderDetails - Order details
   * @param {string} queryType - Type of customer query (delay, reassignment, etc.)
   * @returns {Promise<string>} Generated response message
   * @throws {Error} If API call fails
   */
  async generateOrderStatusMessage(orderData, queryType) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    
    try {
      // Prepare customer message based on query type
      let prompt;
      
      switch (queryType) {
        case 'general_status':
          prompt = `Por favor, informe o cliente sobre o status do pedido #${orderData.orderId}. Status atual: ${orderData.status}.`;
          break;
        case 'reassignment_reason':
          prompt = `Explique educadamente por que o pedido #${orderData.orderId} está sendo reatribuído para outro motorista. Número de reatribuições: ${orderData.reassignmentCount}.`;
          break;
        case 'delay_explanation':
          prompt = `Explique o atraso para o pedido #${orderData.orderId} que foi reatribuído ${orderData.reassignmentCount} vezes. Seja empático e assegure que estamos trabalhando para entregar o pedido o mais rápido possível.`;
          break;
        case 'timeout_explanation':
          prompt = `Explique gentilmente ao cliente que seu pedido #${orderData.orderId} não pôde ser atribuído após múltiplas tentativas. Status: ${orderData.status}. Ofereça cancelar o pedido ou tentar novamente.`;
          break;
        default:
          prompt = `Forneça informações sobre o pedido #${orderData.orderId}. Status atual: ${orderData.status}.`;
      }
      
      // Add technical requirements to the prompt
      prompt += `\n\nRequisitos técnicos na resposta:
      - Mencione que tentamos atribuir motoristas por até 15 segundos cada
      - Explique nosso processo de reatribuição automática quando não há resposta
      - Seja preciso sobre o número de reatribuições: ${orderData.reassignmentCount}
      - Se status for "timeout", explique que esgotamos todas as tentativas`;
      
      // Context about the order
      const context = JSON.stringify({
        orderId: orderData.orderId,
        status: orderData.status,
        reassignmentCount: orderData.reassignmentCount,
        orderDetails: orderData.orderDetails,
      });
      
      // Make API call with retry logic
      logger.debug(`Making OpenAI API call for order ${orderData.orderId}, query type: ${queryType}`);
      
      // Define system message
      const systemMessage = `Você é um assistente virtual para uma empresa de delivery. 
      Sua função é explicar aos clientes o status de seus pedidos de forma clara e empática.
      Seja educado e profissional, mas também amigável. 
      Não entre em detalhes técnicos complexos, mas explique de forma simplificada os tempos de espera por resposta dos motoristas (15 segundos) e o processo de reatribuição.
      Contexto do pedido: ${context}`;
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Log success metrics
      logger.logIntegrationMetrics({
        requestId,
        endpoint: 'chat.completions',
        model: this.model,
        responseTime,
        success: true,
        orderId: orderData.orderId,
        queryType,
        tokenUsage: response.usage || { total_tokens: 'unknown' },
      });
      
      return response.choices[0].message.content.trim();
      
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Log error metrics
      logger.logIntegrationMetrics({
        requestId,
        endpoint: 'chat.completions',
        model: this.model,
        responseTime,
        success: false,
        orderId: orderData.orderId,
        queryType,
        errorType: error.name,
        errorMessage: error.message,
      });
      
      logger.error(`OpenAI API Error: ${error.message}`, {
        requestId,
        orderId: orderData.orderId,
        stack: error.stack,
      });
      
      // Return fallback message
      return this.getFallbackMessage(orderData, queryType);
    }
  }
  
  /**
   * Get fallback message when API call fails
   * @function getFallbackMessage
   * @param {Object} orderData - Order data
   * @param {string} queryType - Type of customer query
   * @returns {string} Fallback message
   */
  getFallbackMessage(orderData, queryType) {
    switch (queryType) {
      case 'reassignment_reason':
        return `Estamos reatribuindo seu pedido #${orderData.orderId} para outro motorista para garantir a entrega mais rápida possível. Pedimos desculpas pelo inconveniente.`;
      case 'delay_explanation':
        return `Pedimos desculpas pelo atraso no seu pedido #${orderData.orderId}. Estamos trabalhando para entregá-lo o mais rápido possível.`;
      case 'timeout_explanation':
        return `Infelizmente, não conseguimos encontrar um motorista disponível para seu pedido #${orderData.orderId} após várias tentativas. Por favor, entre em contato com nosso suporte para assistência.`;
      default:
        return `O status atual do seu pedido #${orderData.orderId} é: ${orderData.status}. Obrigado pela paciência.`;
    }
  }
  
  /**
   * Get API health status
   * @async
   * @function getApiHealth
   * @returns {Promise<Object>} API health status
   */
  async getApiHealth() {
    try {
      // Make a simple API call to check if service is available
      await this.client.models.list();
      
      return {
        status: 'healthy',
        model: this.model,
        apiVersion: this.apiVersion,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`OpenAI API Health Check Failed: ${error.message}`);
      
      return {
        status: 'unhealthy',
        error: error.message,
        model: this.model,
        apiVersion: this.apiVersion,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = new OpenAIService(); 