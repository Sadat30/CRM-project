const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const aiService = require('../services/aiService');
const { requireAuth } = require('../middleware/auth');
const { setTenantContext, requireTenant } = require('../middleware/tenant');

// Configure multer for voice file uploads
const upload = multer({
  dest: 'uploads/voice/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Create new chat session
router.post('/sessions', requireAuth, setTenantContext, requireTenant, async (req, res) => {
  try {
    const { contact_id } = req.body;
    
    if (!contact_id) {
      return res.status(400).json({ error: 'contact_id is required' });
    }

    // Verify contact belongs to tenant
    const [contacts] = await pool.query(
      'SELECT id FROM contacts WHERE id = ? AND tenant_id = ?',
      [contact_id, req.tenant_id]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check for active session
    const [existingSessions] = await pool.query(
      'SELECT id FROM chat_sessions WHERE contact_id = ? AND tenant_id = ? AND status = "active" ORDER BY last_message_at DESC LIMIT 1',
      [contact_id, req.tenant_id]
    );

    let sessionId;
    if (existingSessions.length > 0) {
      sessionId = existingSessions[0].id;
    } else {
      // Create new session
      const [result] = await pool.query(
        'INSERT INTO chat_sessions (contact_id, tenant_id, status) VALUES (?, ?, ?)',
        [contact_id, req.tenant_id, 'active']
      );
      sessionId = result.insertId;

      // Add welcome message
      await pool.query(
        `INSERT INTO chat_messages (session_id, sender_type, message_text, message_type) 
         VALUES (?, ?, ?, ?)`,
        [sessionId, 'bot', 'Hello! I\'m here to help. How can I assist you today?', 'text']
      );
    }

    res.json({ session_id: sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get session messages
router.get('/sessions/:id/messages', requireAuth, setTenantContext, requireTenant, async (req, res) => {
  try {
    const sessionId = req.params.id;

    // Verify session belongs to tenant
    const [sessions] = await pool.query(
      'SELECT contact_id FROM chat_sessions WHERE id = ? AND tenant_id = ?',
      [sessionId, req.tenant_id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const [messages] = await pool.query(
      `SELECT id, session_id, sender_type, sender_id, message_text, message_type, 
       file_url, ai_intent, ai_entities, created_at
       FROM chat_messages 
       WHERE session_id = ? 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get ticket by ID (for customer)
router.get('/tickets/:id', requireAuth, setTenantContext, requireTenant, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const contactId = req.query.contact_id;

    if (!contactId) {
      return res.status(400).json({ error: 'contact_id is required' });
    }

    // Get ticket - verify it belongs to the customer
    const [tickets] = await pool.query(
      `SELECT t.*, c.name as customer_name, c.email as customer_email,
       u.full_name as assigned_to_name
       FROM tickets t
       LEFT JOIN contacts c ON t.customer_id = c.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = ? AND t.customer_id = ? AND t.tenant_id = ?`,
      [ticketId, contactId, req.tenant_id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(tickets[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create ticket from chat
router.post('/tickets', requireAuth, setTenantContext, requireTenant, async (req, res) => {
  try {
    const { contact_id, title, description, priority } = req.body;

    if (!contact_id || !title) {
      return res.status(400).json({ error: 'contact_id and title are required' });
    }

    // Verify contact belongs to tenant
    const [contacts] = await pool.query(
      'SELECT id FROM contacts WHERE id = ? AND tenant_id = ?',
      [contact_id, req.tenant_id]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + 72);

    const [result] = await pool.query(
      `INSERT INTO tickets (customer_id, title, description, status, priority, 
       workflow_stage, sla_due_date, tenant_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contact_id,
        title,
        description || '',
        'open',
        priority || 'medium',
        'open',
        slaDueDate,
        req.tenant_id
      ]
    );

    const ticketId = result.insertId;

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
        description || 'Ticket created from chatbot',
        req.tenant_id
      ]
    );

    res.json({ ok: true, ticket_id: ticketId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Process voice message
router.post('/voice', requireAuth, setTenantContext, requireTenant, upload.single('audio'), async (req, res) => {
  try {
    const { session_id, contact_id } = req.body;

    if (!session_id || !contact_id || !req.file) {
      return res.status(400).json({ error: 'session_id, contact_id, and audio file are required' });
    }

    // TODO: Implement voice transcription
    // For now, return placeholder
    res.json({
      ok: true,
      message: 'Voice message received. Transcription coming soon.',
      file_url: req.file.path
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Process AI query (internal use by WebSocket)
router.post('/ai/process', async (req, res) => {
  try {
    const { message, contact_id, tenant_id } = req.body;

    if (!message || !contact_id || !tenant_id) {
      return res.status(400).json({ error: 'message, contact_id, and tenant_id are required' });
    }

    // Get customer context
    const customerContext = await aiService.getCustomerContext(contact_id, tenant_id);

    // Process with AI
    const aiResponse = await aiService.processMessage(message, customerContext);

    // Handle CRM actions based on intent
    let crmData = null;
    if (aiResponse.intent === 'ticket_lookup' && aiResponse.entities.ticket_id) {
      // Fetch ticket data
      const [tickets] = await pool.query(
        `SELECT t.*, u.full_name as assigned_to_name
         FROM tickets t
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.id = ? AND t.customer_id = ? AND t.tenant_id = ?`,
        [aiResponse.entities.ticket_id, contact_id, tenant_id]
      );

      if (tickets.length > 0) {
        crmData = tickets[0];
        // Enhance AI response with ticket data
        aiResponse.text = this.formatTicketResponse(tickets[0], aiResponse.text);
      }
    }

    res.json({
      ...aiResponse,
      crm_data: crmData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

