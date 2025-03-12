/**
 * @fileoverview OpenAI API Integration Documentation as Code
 * 
 * This file documents the integration with OpenAI API for customer notifications
 * related to order reassignments. It's not meant to be executed, but serves as
 * documentation in code form.
 */

/**
 * @name OpenAIIntegrationSLA
 * @description Service Level Agreement for OpenAI API Integration
 */
const integrationSLA = {
  /**
   * Availability requirements
   */
  availability: {
    target: '99.9%',
    measurement: 'Percentage of successful API calls',
    mitigationStrategy: 'Fallback mechanism provides predefined responses when API is unavailable',
  },
  
  /**
   * Performance requirements
   */
  performance: {
    responseTime: {
      target: '< 2 seconds',
      threshold: '5 seconds',
      action: 'Log warning when response time exceeds 2 seconds, error when exceeds 5 seconds',
    },
    throughput: {
      target: '50 requests/minute',
      limitation: 'Respect OpenAI API rate limits',
    },
  },
  
  /**
   * Error handling
   */
  errorHandling: {
    retryStrategy: {
      maxRetries: 3,
      backoffFactor: 2, // Exponential backoff
      initialDelay: 1000, // 1 second initial delay
    },
    errorCategorization: [
      { type: 'Timeout', code: 'ERR_TIMEOUT', action: 'Retry with backoff' },
      { type: 'Rate Limit', code: 'ERR_RATE_LIMIT', action: 'Exponential backoff with jitter' },
      { type: 'Authentication', code: 'ERR_AUTH', action: 'Alert and use fallback' },
      { type: 'Internal Server', code: 'ERR_SERVER', action: 'Retry with backoff' },
      { type: 'Bad Request', code: 'ERR_BAD_REQUEST', action: 'Log and use fallback' },
    ],
  },
  
  /**
   * Monitoring
   */
  monitoring: {
    metrics: [
      { name: 'response_time', description: 'Time taken for API to respond', unit: 'ms', threshold: 5000 },
      { name: 'success_rate', description: 'Percentage of successful calls', unit: '%', threshold: 95 },
      { name: 'token_usage', description: 'Number of tokens used in requests/responses', unit: 'tokens' },
      { name: 'error_rate', description: 'Percentage of failed calls', unit: '%', threshold: 5 },
    ],
    logging: {
      level: 'info',
      fields: [
        'requestId',
        'endpoint',
        'model',
        'responseTime',
        'success',
        'tokenUsage',
        'errorType',
        'timestamp',
      ],
    },
  },
};

/**
 * @name OpenAIApiRequirements
 * @description Technical requirements for OpenAI API integration
 */
const apiRequirements = {
  /**
   * API endpoint details
   */
  endpoint: {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: [
      { name: 'Authorization', value: 'Bearer ${OPENAI_API_KEY}' },
      { name: 'Content-Type', value: 'application/json' },
    ],
  },
  
  /**
   * Request parameters
   */
  request: {
    model: 'gpt-4o-mini',
    required: ['model', 'messages'],
    optional: ['temperature', 'max_tokens', 'n', 'stream'],
    defaultValues: {
      temperature: 0.7,
      max_tokens: 300,
      n: 1,
      stream: false,
    },
    validation: {
      messages: 'Array of message objects with role and content',
      model: 'Must be a valid OpenAI model identifier',
    },
  },
  
  /**
   * Response structure
   */
  response: {
    structure: {
      id: 'Unique identifier for the completion',
      object: 'Type of object (always "chat.completion")',
      created: 'Timestamp for when the completion was created',
      model: 'Model used for completion',
      choices: 'Array of completion choices',
      usage: 'Token usage information',
    },
    parsing: {
      mainContentPath: 'choices[0].message.content',
      tokenUsagePath: 'usage.total_tokens',
      errorPath: 'error.message',
    },
  },
  
  /**
   * Rate limiting
   */
  rateLimiting: {
    strategy: 'Token bucket',
    limits: {
      requestsPerMinute: 60,
      tokensPerMinute: 60000,
    },
    handling: 'Exponential backoff with jitter',
  },
  
  /**
   * Version handling
   */
  versionHandling: {
    currentVersion: 'v1',
    compatibility: 'Check API response format for breaking changes',
    migration: 'Document migration steps for each API version update',
  },
};

/**
 * @name PromptTemplates
 * @description Templates for prompts sent to OpenAI API
 */
const promptTemplates = {
  /**
   * System message defining the assistant's role
   */
  systemMessage: `
    Você é um assistente virtual para uma empresa de delivery. 
    Sua função é explicar aos clientes o status de seus pedidos de forma clara e empática.
    Seja educado e profissional, mas também amigável. 
    Não entre em detalhes técnicos complexos, mas explique de forma simplificada os tempos 
    de espera por resposta dos motoristas (15 segundos) e o processo de reatribuição.
    Contexto do pedido: {{orderContext}}
  `,
  
  /**
   * Templates for different types of customer queries
   */
  queryTemplates: {
    general_status: `
      Por favor, informe o cliente sobre o status do pedido #{{orderId}}. 
      Status atual: {{status}}.
    `,
    
    reassignment_reason: `
      Explique educadamente por que o pedido #{{orderId}} está sendo reatribuído 
      para outro motorista. Número de reatribuições: {{reassignmentCount}}.
    `,
    
    delay_explanation: `
      Explique o atraso para o pedido #{{orderId}} que foi reatribuído {{reassignmentCount}} vezes. 
      Seja empático e assegure que estamos trabalhando para entregar o pedido o mais rápido possível.
    `,
    
    timeout_explanation: `
      Explique gentilmente ao cliente que seu pedido #{{orderId}} não pôde ser atribuído 
      após múltiplas tentativas. Status: {{status}}. Ofereça cancelar o pedido ou tentar novamente.
    `,
  },
  
  /**
   * Technical requirements to include in prompts
   */
  technicalRequirements: `
    Requisitos técnicos na resposta:
    - Mencione que tentamos atribuir motoristas por até 15 segundos cada
    - Explique nosso processo de reatribuição automática quando não há resposta
    - Seja preciso sobre o número de reatribuições: {{reassignmentCount}}
    - Se status for "timeout", explique que esgotamos todas as tentativas
  `,
  
  /**
   * Fallback responses when API is unavailable
   */
  fallbackResponses: {
    general_status: `O status atual do seu pedido #{{orderId}} é: {{status}}. Obrigado pela paciência.`,
    
    reassignment_reason: `Estamos reatribuindo seu pedido #{{orderId}} para outro motorista para garantir a entrega mais rápida possível. Pedimos desculpas pelo inconveniente.`,
    
    delay_explanation: `Pedimos desculpas pelo atraso no seu pedido #{{orderId}}. Estamos trabalhando para entregá-lo o mais rápido possível.`,
    
    timeout_explanation: `Infelizmente, não conseguimos encontrar um motorista disponível para seu pedido #{{orderId}} após várias tentativas. Por favor, entre em contato com nosso suporte para assistência.`,
  },
};

/**
 * @name QualityControlChecks
 * @description Quality control checks for OpenAI integration
 */
const qualityControlChecks = {
  /**
   * Response quality checks
   */
  responseQuality: {
    mustInclude: [
      { scenario: 'reassignment', keyword: '15 segundos', reason: 'Must explain timeout period' },
      { scenario: 'timeout', keyword: 'todas as tentativas', reason: 'Must explain exhausted attempts' },
    ],
    mustNotInclude: [
      { scenario: 'all', keyword: 'não sei', reason: 'Avoid uncertainty in responses' },
      { scenario: 'all', keyword: 'erro', reason: 'Avoid mentioning errors to customers' },
    ],
    responseLength: {
      min: 50,
      max: 500,
      check: 'Warning if outside bounds',
    },
  },
  
  /**
   * Performance checks
   */
  performanceChecks: {
    responseTime: {
      warning: 2000, // 2 seconds
      error: 5000, // 5 seconds
      action: 'Log and alert if exceeding thresholds',
    },
    tokenUsage: {
      target: 'Minimize token usage while maintaining quality',
      monitoring: 'Track token usage per request type',
    },
  },
  
  /**
   * Integration testing
   */
  integrationTesting: {
    testCases: [
      { scenario: 'Driver accepts within time', expectedStatus: 'accepted' },
      { scenario: 'Driver times out once', expectedReassignment: true },
      { scenario: 'All drivers exhausted', expectedStatus: 'timeout' },
    ],
    testFrequency: 'Run integration tests on each deployment',
    coverage: 'All API request/response patterns must be tested',
  },
};

// Export integration documentation
module.exports = {
  integrationSLA,
  apiRequirements,
  promptTemplates,
  qualityControlChecks,
}; 