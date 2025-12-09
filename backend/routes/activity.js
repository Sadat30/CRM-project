const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

// Get unified activity timeline
// Supports filtering by contact_id, deal_id, ticket_id, or user_id
router.get('/', async (req, res) => {
  try {
    const { contact_id, deal_id, ticket_id, user_id, activity_type, limit = 100 } = req.query;
    const tenantFilter = getTenantFilter(req, 'at');
    
    let query = `SELECT at.*, 
                 u.full_name as user_name, u.email as user_email,
                 c.name as contact_name,
                 d.title as deal_title
                 FROM activity_timeline at
                 LEFT JOIN users u ON at.user_id = u.id
                 LEFT JOIN contacts c ON at.contact_id = c.id
                 LEFT JOIN deals d ON at.deal_id = d.id
                 WHERE ${tenantFilter.sql}`;
    const params = [...tenantFilter.params];
    
    if (contact_id) {
      query += ` AND at.contact_id = ?`;
      params.push(contact_id);
    }
    if (deal_id) {
      query += ` AND at.deal_id = ?`;
      params.push(deal_id);
    }
    if (ticket_id) {
      query += ` AND at.ticket_id = ?`;
      params.push(ticket_id);
    }
    if (user_id) {
      query += ` AND at.user_id = ?`;
      params.push(user_id);
    }
    if (activity_type) {
      query += ` AND at.activity_type = ?`;
      params.push(activity_type);
    }
    
    query += ` ORDER BY at.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create activity (for automated capture)
router.post('/', async (req, res) => {
  try {
    const { contact_id, deal_id, ticket_id, activity_type, title, description, metadata } = req.body;
    
    if (!activity_type || !title) {
      return res.status(400).json({ error: 'activity_type and title are required' });
    }
    
    const [r] = await pool.query(
      'INSERT INTO activity_timeline (contact_id, deal_id, ticket_id, user_id, activity_type, title, description, metadata, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [contact_id, deal_id, ticket_id, req.user.id, activity_type, title, description, metadata ? JSON.stringify(metadata) : null, req.tenant_id]
    );
    
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

