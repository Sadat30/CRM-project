const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../db');

class AIService {
  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GOOGLE_AI_API_KEY not set. AI features will not work.');
      this.genAI = null;
      this.model = null;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.apiKey = apiKey;
    
    // Initialize model lazily - will be set on first use after checking available models
    this.model = null;
    this.modelName = null;
    this.modelsChecked = false;
  }

  /**
   * Retry function with exponential backoff for 503 errors
   */
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const is503 = err.code === 503 || 
                      err.status === 503 || 
                      err.status === 'UNAVAILABLE' ||
                      (err.message && err.message.includes('overloaded')) ||
                      (err.message && err.message.includes('503'));
        
        if (is503 && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`⚠️  Gemini API overloaded (503). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not 503 or last attempt, throw the error
        throw err;
      }
    }
  }

  /**
   * List available models and find a working one
   */
  async findWorkingModel() {
    if (this.modelsChecked && this.model) {
      return this.model;
    }

    try {
      // Default to gemini-2.5-flash (confirmed working, free tier)
      // User can override with GEMINI_MODEL env var
      const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      
      try {
        console.log(`Initializing AI model: ${defaultModel}`);
        const testModel = this.genAI.getGenerativeModel({ model: defaultModel });
        // Quick test with retry logic
        const result = await this.retryWithBackoff(async () => {
          return await testModel.generateContent('Hi');
        }, 2, 1000);
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          this.model = testModel;
          this.modelName = defaultModel;
          this.modelsChecked = true;
          console.log(`✅ AI Service initialized with model: ${defaultModel}`);
          return this.model;
        }
      } catch (err) {
        console.log(`❌ Model ${defaultModel} failed: ${err.message}`);
        console.log('Trying fallback models...');
      }

      // Fallback: Try other available models
      const fallbackModels = [
        'gemini-2.0-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash-001',
        'gemini-2.5-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro'
      ];

      for (const modelName of fallbackModels) {
        try {
          console.log(`Trying fallback model: ${modelName}`);
          const testModel = this.genAI.getGenerativeModel({ model: modelName });
          const result = await this.retryWithBackoff(async () => {
            return await testModel.generateContent('Hi');
          }, 2, 1000);
          const response = await result.response;
          const text = response.text();
          
          if (text) {
            this.model = testModel;
            this.modelName = modelName;
            this.modelsChecked = true;
            console.log(`✅ Successfully initialized with fallback model: ${modelName}`);
            return this.model;
          }
        } catch (err) {
          console.log(`❌ Fallback model ${modelName} failed: ${err.message.split('\n')[0]}`);
          continue;
        }
      }

      // If all fail, try with 'models/' prefix
      const allModels = [defaultModel, ...fallbackModels];
      const prefixedModels = allModels.map(m => `models/${m.replace('models/', '')}`);
      for (const modelName of prefixedModels) {
        try {
          const testModel = this.genAI.getGenerativeModel({ model: modelName });
          const result = await this.retryWithBackoff(async () => {
            return await testModel.generateContent('test');
          }, 2, 1000);
          if (result.response.text()) {
            this.model = testModel;
            this.modelName = modelName;
            this.modelsChecked = true;
            console.log(`✅ Successfully initialized with model: ${modelName}`);
            return this.model;
          }
        } catch (err) {
          continue;
        }
      }

      throw new Error('No working Gemini models found. Please check your API key and model availability.');
    } catch (err) {
      console.error('Error finding working model:', err);
      throw err;
    }
  }

  /**
   * Process customer message and generate response
   */
  async processMessage(message, customerContext) {
    if (!this.genAI) {
      return {
        text: 'AI service is not configured. Please set GOOGLE_AI_API_KEY environment variable.',
        intent: 'error',
        entities: {}
      };
    }

    try {
      // Ensure we have a working model
      const model = await this.findWorkingModel();
      if (!model) {
        throw new Error('No working AI model available');
      }

      const prompt = this.buildPrompt(message, customerContext);
      
      // Use retry logic for generateContent calls
      const result = await this.retryWithBackoff(async () => {
        return await model.generateContent(prompt);
      }, 3, 2000); // 3 retries, starting with 2 second delay
      
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from AI model');
      }

      // Extract intent and entities from response
      const { intent, entities } = this.extractIntentAndEntities(message, text);

      return {
        text: text,
        intent: intent,
        entities: entities,
        rawResponse: text
      };
    } catch (err) {
      console.error('AI Service Error:', err);
      
      // Check if it's a 503 error
      const is503 = err.code === 503 || 
                    err.status === 503 || 
                    err.status === 'UNAVAILABLE' ||
                    (err.message && err.message.includes('overloaded')) ||
                    (err.message && err.message.includes('503'));
      
      if (is503) {
        return {
          text: 'I apologize, but the AI service is currently overloaded. Please try again in a few moments.',
          intent: 'error',
          entities: {},
          error: 'Service temporarily unavailable (503)',
          retry: true
        };
      }
      
      // Reset model cache on error to retry next time
      if (err.message && err.message.includes('not found')) {
        this.model = null;
        this.modelsChecked = false;
      }
      
      return {
        text: 'I apologize, but I encountered an error processing your request. Please try again or contact support.',
        intent: 'error',
        entities: {},
        error: err.message
      };
    }
  }

  /**
   * Build prompt with customer context and available functions
   */
  buildPrompt(message, customerContext) {
    const { contactId, tenantId, customerName, customerEmail, recentTickets } = customerContext;

    return `You are a helpful customer support chatbot for SimpleCRM.

Customer Information:
- Name: ${customerName || 'Customer'}
- Email: ${customerEmail || 'N/A'}
- Contact ID: ${contactId}

Recent Tickets: ${recentTickets ? recentTickets.map(t => `#${t.id} - ${t.title} (${t.status})`).join(', ') : 'None'}

Available Actions:
1. ticket_lookup(ticket_id) - Get details of a specific ticket by ID
2. account_info() - Get customer account information
3. create_ticket(title, description, priority) - Create a new support ticket
4. search_knowledge_base(query) - Search help articles

Instructions:
- Be friendly, professional, and helpful
- If customer asks about a ticket, extract the ticket ID and use ticket_lookup
- If customer wants to create a ticket, extract title and description
- Keep responses concise but informative
- If you don't know something, admit it and offer to help find the answer

Customer Message: "${message}"

Respond naturally and helpfully. If the customer mentions a ticket number, acknowledge it and indicate you'll look it up.`;
  }

  /**
   * Extract intent and entities from message
   */
  extractIntentAndEntities(message, aiResponse) {
    const lowerMessage = message.toLowerCase();
    const intent = this.detectIntent(lowerMessage);
    const entities = this.extractEntities(lowerMessage);

    return { intent, entities };
  }

  /**
   * Detect intent from message
   */
  detectIntent(message) {
    if (message.match(/ticket\s*#?\s*(\d+)|ticket\s+(\d+)|#(\d+)/i)) {
      return 'ticket_lookup';
    }
    if (message.match(/create|new|open|submit.*ticket/i)) {
      return 'create_ticket';
    }
    if (message.match(/account|profile|my\s+info|account\s+status/i)) {
      return 'account_info';
    }
    if (message.match(/help|support|article|knowledge|faq/i)) {
      return 'search_knowledge_base';
    }
    return 'general_inquiry';
  }

  /**
   * Extract entities from message
   */
  extractEntities(message) {
    const entities = {};

    // Extract ticket ID
    const ticketMatch = message.match(/ticket\s*#?\s*(\d+)|ticket\s+(\d+)|#(\d+)/i);
    if (ticketMatch) {
      entities.ticket_id = parseInt(ticketMatch[1] || ticketMatch[2] || ticketMatch[3]);
    }

    // Extract priority
    if (message.match(/\b(urgent|high|critical|emergency)\b/i)) {
      entities.priority = 'high';
    } else if (message.match(/\b(low|minor)\b/i)) {
      entities.priority = 'low';
    } else {
      entities.priority = 'medium';
    }

    return entities;
  }

  /**
   * Get customer context for AI
   */
  async getCustomerContext(contactId, tenantId) {
    try {
      // Get customer info
      const [contacts] = await pool.query(
        'SELECT id, name, email, company FROM contacts WHERE id = ? AND tenant_id = ?',
        [contactId, tenantId]
      );

      const customer = contacts[0] || {};

      // Get recent tickets
      const [tickets] = await pool.query(
        `SELECT id, title, status, priority, created_at 
         FROM tickets 
         WHERE customer_id = ? AND tenant_id = ? 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [contactId, tenantId]
      );

      return {
        contactId,
        tenantId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerCompany: customer.company,
        recentTickets: tickets
      };
    } catch (err) {
      console.error('Error getting customer context:', err);
      return { contactId, tenantId };
    }
  }

}

module.exports = new AIService();

