const { Server } = require('socket.io');
const pool = require('../db');
const aiService = require('../services/aiService');

let io = null;

function initializeChatServer(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    const { sessionId, contactId, tenantId } = socket.handshake.query;

    if (!sessionId || !contactId || !tenantId) {
      socket.emit('error', { message: 'Missing required parameters' });
      socket.disconnect();
      return;
    }

    // Join session room
    socket.join(`session:${sessionId}`);

    // Handle incoming messages
    socket.on('message', async (data) => {
      try {
        const { session_id, text, contact_id } = data;

        // Save customer message to database
        const [messageResult] = await pool.query(
          `INSERT INTO chat_messages (session_id, sender_type, sender_id, message_text, message_type)
           VALUES (?, ?, ?, ?, ?)`,
          [session_id, 'customer', contact_id, text, 'text']
        );

        // Don't emit customer message back - frontend already shows it optimistically
        // Only emit bot responses

        // Show typing indicator
        socket.emit('typing', { typing: true });

        // Get customer context
        const customerContext = await aiService.getCustomerContext(contact_id, tenantId);

        // Process with AI
        const aiResponse = await aiService.processMessage(text, customerContext);

        // Handle CRM actions based on intent
        let crmData = null;
        let enhancedResponse = aiResponse.text;

        if (aiResponse.intent === 'ticket_lookup' && aiResponse.entities.ticket_id) {
          // Fetch ticket data
          const [tickets] = await pool.query(
            `SELECT t.*, u.full_name as assigned_to_name
             FROM tickets t
             LEFT JOIN users u ON t.assigned_to = u.id
             WHERE t.id = ? AND t.customer_id = ? AND t.tenant_id = ?`,
            [aiResponse.entities.ticket_id, contact_id, tenantId]
          );

          if (tickets.length > 0) {
            crmData = tickets[0];
            enhancedResponse = formatTicketResponse(tickets[0], aiResponse.text);
          } else {
            enhancedResponse = `I couldn't find ticket #${aiResponse.entities.ticket_id} in your account. Please check the ticket number and try again.`;
          }
        } else if (aiResponse.intent === 'create_ticket') {
          // Extract ticket details from message
          const title = extractTicketTitle(text);
          const description = text;

          if (title) {
            // Create ticket
            const slaDueDate = new Date();
            slaDueDate.setHours(slaDueDate.getHours() + 72);

            const [ticketResult] = await pool.query(
              `INSERT INTO tickets (customer_id, title, description, status, priority, 
               workflow_stage, sla_due_date, tenant_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                contact_id,
                title,
                description,
                'open',
                aiResponse.entities.priority || 'medium',
                'open',
                slaDueDate,
                tenantId
              ]
            );

            const ticketId = ticketResult.insertId;

            // Log activity
            await pool.query(
              `INSERT INTO activity_timeline (ticket_id, contact_id, activity_type, 
               title, description, tenant_id) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                ticketId,
                contact_id,
                'ticket_created',
                `Ticket created via chat: ${title}`,
                description,
                tenantId
              ]
            );

            enhancedResponse = `I've created a new ticket #${ticketId} for you: "${title}". Our team will get back to you soon!`;
            crmData = { ticket_id: ticketId, title, status: 'open' };
          }
        }

        // Save bot response to database
        const [botMessageResult] = await pool.query(
          `INSERT INTO chat_messages (session_id, sender_type, message_text, message_type, 
           ai_intent, ai_entities, crm_data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            session_id,
            'bot',
            enhancedResponse,
            'text',
            aiResponse.intent,
            JSON.stringify(aiResponse.entities),
            crmData ? JSON.stringify(crmData) : null
          ]
        );

        // Update session last message time
        await pool.query(
          'UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
          [session_id]
        );

        // Log AI query
        await pool.query(
          `INSERT INTO chat_ai_queries (session_id, message_id, contact_id, tenant_id, 
           query_text, intent, entities, ai_response, crm_data_fetched)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session_id,
            messageResult.insertId,
            contact_id,
            tenantId,
            text,
            aiResponse.intent,
            JSON.stringify(aiResponse.entities),
            enhancedResponse,
            crmData ? JSON.stringify(crmData) : null
          ]
        );

        // Hide typing indicator
        socket.emit('typing', { typing: false });

        // Send bot response
        const botMessage = {
          id: botMessageResult.insertId,
          session_id: session_id,
          sender_type: 'bot',
          message_text: enhancedResponse,
          message_type: 'text',
          ai_intent: aiResponse.intent,
          ai_entities: aiResponse.entities,
          created_at: new Date().toISOString()
        };

        socket.emit('message', botMessage);
      } catch (err) {
        console.error('Error processing message:', err);
        socket.emit('typing', { typing: false });
        socket.emit('message', {
          id: Date.now(),
          session_id: data.session_id,
          sender_type: 'bot',
          message_text: 'I apologize, but I encountered an error. Please try again or contact support.',
          message_type: 'text',
          created_at: new Date().toISOString()
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

function formatTicketResponse(ticket, aiText) {
  const statusEmoji = {
    'open': '🔴',
    'in_progress': '🟡',
    'resolved': '🟢',
    'closed': '⚫'
  };

  return `${aiText}\n\n📋 *Ticket Details:*\n` +
    `ID: #${ticket.id}\n` +
    `Title: ${ticket.title}\n` +
    `Status: ${statusEmoji[ticket.status] || '⚪'} ${ticket.status}\n` +
    `Priority: ${ticket.priority}\n` +
    (ticket.assigned_to_name ? `Assigned to: ${ticket.assigned_to_name}\n` : '') +
    (ticket.description ? `\nDescription: ${ticket.description}` : '');
}

function extractTicketTitle(message) {
  // First, try to extract quoted text
  const quotedMatch = message.match(/"([^"]+)"/);
  if (quotedMatch) return quotedMatch[1].trim();

  // Remove common ticket creation phrases (case insensitive)
  let cleaned = message.trim();
  
  // Patterns to remove from the beginning
  const removePatterns = [
    /^(create|make|open|add|new)\s+(a\s+)?ticket\s+(for|about|regarding|concerning)\s+/i,
    /^(i\s+)?(need|want|would like|request)\s+(a\s+)?ticket\s+(for|about|regarding|concerning)\s+/i,
    /^(can\s+you|please|could\s+you)\s+(create|make|open|add)\s+(a\s+)?ticket\s+(for|about|regarding|concerning)\s+/i,
    /^(i\s+)?(have|am\s+experiencing|am\s+facing)\s+(an?\s+)?(issue|problem|bug|error)\s+(with|in|on|about)\s+/i,
    /^(there\s+is|there's)\s+(an?\s+)?(issue|problem|bug|error)\s+(with|in|on|about)\s+/i,
    /^(help\s+with|support\s+for|assistance\s+with)\s+/i,
  ];

  // Try each pattern
  for (const pattern of removePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(match[0].length).trim();
      break;
    }
  }

  // If we still have the full message, try to find the issue after common connectors
  if (cleaned === message.trim()) {
    const afterConnectors = cleaned.match(/(?:for|about|regarding|concerning|with|on|in)\s+(.+)/i);
    if (afterConnectors) {
      cleaned = afterConnectors[1].trim();
    }
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Take first sentence if it's too long, or limit to 100 characters
  const sentenceMatch = cleaned.match(/^([^.!?]+)/);
  if (sentenceMatch) {
    cleaned = sentenceMatch[1].trim();
  }

  // Limit length
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100).trim();
    // Remove partial word at the end
    cleaned = cleaned.replace(/\s+\w+$/, '');
  }

  // Fallback: if we couldn't extract anything meaningful, use original message
  if (!cleaned || cleaned.length < 3) {
    const fallback = message.trim();
    return fallback.length > 100 ? fallback.substring(0, 100) : fallback;
  }

  return cleaned;
}

function getIO() {
  return io;
}

module.exports = { initializeChatServer, getIO };

