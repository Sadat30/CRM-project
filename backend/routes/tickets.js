const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const status = req.query.status;
    const tenantFilter = getTenantFilter(req, 't');
    const query = status
      ? `SELECT t.*, c.name as customer_name, c.email as customer_email, u.full_name as assigned_to_name
         FROM tickets t
         LEFT JOIN contacts c ON t.customer_id = c.id
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.status = ? AND ${tenantFilter.sql}
         ORDER BY t.created_at DESC`
      : `SELECT t.*, c.name as customer_name, c.email as customer_email, u.full_name as assigned_to_name
         FROM tickets t
         LEFT JOIN contacts c ON t.customer_id = c.id
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE ${tenantFilter.sql}
         ORDER BY t.created_at DESC`;
    
    const [rows] = await pool.query(query, status ? [status, ...tenantFilter.params] : tenantFilter.params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 't');
    const [rows] = await pool.query(
      `SELECT t.*, c.name as customer_name, c.email as customer_email, c.company as customer_company,
       u.full_name as assigned_to_name, u.email as assigned_to_email
       FROM tickets t
       LEFT JOIN contacts c ON t.customer_id = c.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = ? AND ${tenantFilter.sql} LIMIT 1`,
      [req.params.id, ...tenantFilter.params]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const { customer_id, title, description, priority, workflow_stage } = req.body;
    
    if (!title || !customer_id) {
      return res.status(400).json({ error: 'Title and customer_id are required' });
    }
    
    // Verify customer belongs to tenant
    const tenantFilter = getTenantFilter(req, 'c');
    const [customerCheck] = await pool.query(
      `SELECT id FROM contacts c WHERE c.id = ? AND ${tenantFilter.sql}`,
      [customer_id, ...tenantFilter.params]
    );
    if (customerCheck.length === 0) {
      return res.status(400).json({ error: 'Customer not found or access denied' });
    }
    
    // Calculate SLA due date (default: 72 hours from now)
    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + 72);
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [r] = await connection.query(
        'INSERT INTO tickets (customer_id, title, description, status, priority, workflow_stage, sla_due_date, assigned_to, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [customer_id, title, description, 'open', priority || 'medium', workflow_stage || 'open', slaDueDate, req.user.role === 'admin' ? req.user.id : null, req.tenant_id]
      );
      
      const ticketId = r.insertId;
      
      // Log activity
      await connection.query(
        'INSERT INTO activity_timeline (ticket_id, contact_id, user_id, activity_type, title, description, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ticketId, customer_id, req.user.id, 'ticket_created', `Ticket created: ${title}`, description || 'New support ticket created', req.tenant_id]
      );
      
      await connection.commit();
      res.json({ ok: true, id: ticketId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update ticket
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, workflow_stage, assigned_to, resolved_at } = req.body;
    
    // Verify ticket belongs to tenant
    const tenantFilter = getTenantFilter(req, 't');
    const [checkRows] = await pool.query(
      `SELECT * FROM tickets t WHERE t.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const currentTicket = checkRows[0];
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const updates = [];
      const values = [];
      
      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
        if (status === 'closed') {
          updates.push('resolved_at = CURRENT_TIMESTAMP');
        }
      }
      if (priority !== undefined) {
        updates.push('priority = ?');
        values.push(priority);
      }
      if (workflow_stage !== undefined) {
        updates.push('workflow_stage = ?');
        values.push(workflow_stage);
      }
      if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        values.push(assigned_to);
      }
      if (resolved_at !== undefined) {
        updates.push('resolved_at = ?');
        values.push(resolved_at);
      }
      
      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      
      await connection.query(
        `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      // Log activity
      const activityDesc = status !== undefined && status !== currentTicket.status
        ? `Ticket status changed from "${currentTicket.status}" to "${status}"`
        : 'Ticket was updated';
      
      await connection.query(
        'INSERT INTO activity_timeline (ticket_id, contact_id, user_id, activity_type, title, description, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.params.id, currentTicket.customer_id, req.user.id, 'ticket_updated', `Ticket updated: ${title || currentTicket.title}`, activityDesc, req.tenant_id]
      );
      
      await connection.commit();
      res.json({ ok: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete ticket
router.delete('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    await pool.query(
      `DELETE FROM tickets WHERE id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get ticket workflows
router.get('/workflows/list', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'tw');
    const [rows] = await pool.query(
      `SELECT * FROM ticket_workflows tw WHERE ${tenantFilter.sql} ORDER BY tw.is_default DESC, tw.name ASC`,
      tenantFilter.params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create ticket workflow
router.post('/workflows', async (req, res) => {
  try {
    const { name, stages, sla_policy } = req.body;
    
    if (!name || !stages) {
      return res.status(400).json({ error: 'Name and stages are required' });
    }
    
    const [r] = await pool.query(
      'INSERT INTO ticket_workflows (name, stages, sla_policy, tenant_id) VALUES (?, ?, ?, ?)',
      [name, JSON.stringify(stages), sla_policy ? JSON.stringify(sla_policy) : null, req.tenant_id]
    );
    
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get ticket timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'at');
    const [rows] = await pool.query(
      `SELECT at.*, u.full_name as user_name, u.email as user_email
       FROM activity_timeline at
       LEFT JOIN users u ON at.user_id = u.id
       WHERE at.ticket_id = ? AND ${tenantFilter.sql}
       ORDER BY at.created_at DESC
       LIMIT 100`,
      [req.params.id, ...tenantFilter.params]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

