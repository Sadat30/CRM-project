const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

// Get all deals with contact info, grouped by stage
router.get('/', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'd');
    const [rows] = await pool.query(
      `SELECT d.*, c.name as contact_name, c.email as contact_email, c.company as contact_company,
       ps.name as stage_name, ps.color as stage_color, ps.display_order
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN pipeline_stages ps ON d.stage = ps.name AND ps.tenant_id = d.tenant_id
       WHERE ${tenantFilter.sql}
       ORDER BY d.stage_order ASC, d.created_at DESC
       LIMIT 500`,
      tenantFilter.params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get deals by stage
router.get('/by-stage/:stage', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'd');
    const [rows] = await pool.query(
      `SELECT d.*, c.name as contact_name, c.email as contact_email, c.company as contact_company
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       WHERE d.stage = ? AND ${tenantFilter.sql}
       ORDER BY d.stage_order ASC, d.created_at DESC`,
      [req.params.stage, ...tenantFilter.params]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create new deal
router.post('/', async (req, res) => {
  try {
    const { title, contact_id, stage, value, probability, close_date, custom_properties } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Verify contact belongs to tenant if provided
    if (contact_id) {
      const tenantFilter = getTenantFilter(req, 'c');
      const [contactCheck] = await pool.query(
        `SELECT id FROM contacts c WHERE c.id = ? AND ${tenantFilter.sql}`,
        [contact_id, ...tenantFilter.params]
      );
      if (contactCheck.length === 0) {
        return res.status(400).json({ error: 'Contact not found or access denied' });
      }
    }
    
    // Get stage order if stage is provided (from tenant's stages)
    let stage_order = 0;
    if (stage) {
      const tenantFilter = getTenantFilter(req, 'ps');
      const [stageRows] = await pool.query(
        `SELECT display_order FROM pipeline_stages ps WHERE ps.name = ? AND ${tenantFilter.sql}`,
        [stage, ...tenantFilter.params]
      );
      if (stageRows.length > 0) {
        stage_order = stageRows[0].display_order;
      }
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [r] = await connection.query(
        'INSERT INTO deals (title, contact_id, stage, value, probability, close_date, owner_id, stage_order, custom_properties, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, contact_id, stage || 'New', value || 0, probability || 0, close_date, req.user.id, stage_order, custom_properties ? JSON.stringify(custom_properties) : null, req.tenant_id]
      );
      
      const dealId = r.insertId;
      
      // Log activity
      await connection.query(
        'INSERT INTO activity_timeline (deal_id, contact_id, user_id, activity_type, title, description, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [dealId, contact_id, req.user.id, 'deal_created', `Deal created: ${title}`, `New deal "${title}" was created with value ${value || 0}`, req.tenant_id]
      );
      
      await connection.commit();
      res.json({ ok: true, id: dealId });
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

// Get single deal
router.get('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'd');
    const [rows] = await pool.query(
      `SELECT d.*, c.name as contact_name, c.email as contact_email, c.company as contact_company,
       ps.name as stage_name, ps.color as stage_color
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN pipeline_stages ps ON d.stage = ps.name AND ps.tenant_id = d.tenant_id
       WHERE d.id = ? AND ${tenantFilter.sql} LIMIT 1`,
      [req.params.id, ...tenantFilter.params]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const deal = rows[0];
    if (deal.custom_properties) {
      try {
        deal.custom_properties = JSON.parse(deal.custom_properties);
      } catch (e) {
        deal.custom_properties = {};
      }
    }
    
    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update deal (including stage change and drag-drop reordering)
router.put('/:id', async (req, res) => {
  try {
    const { stage, stage_order, title, contact_id, value, probability, close_date, custom_properties } = req.body;
    
    // Verify deal belongs to tenant
    const tenantFilter = getTenantFilter(req, 'd');
    const [checkRows] = await pool.query(
      `SELECT id, stage, title, contact_id FROM deals d WHERE d.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    const currentDeal = checkRows[0];
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const oldStage = currentDeal.stage;
      const updates = [];
      const values = [];
      
      if (stage !== undefined) {
        updates.push('stage = ?');
        values.push(stage);
        
        // Update stage_order based on new stage (from tenant's stages)
        const stageTenantFilter = getTenantFilter(req, 'ps');
        const [stageRows] = await connection.query(
          `SELECT display_order FROM pipeline_stages ps WHERE ps.name = ? AND ${stageTenantFilter.sql}`,
          [stage, ...stageTenantFilter.params]
        );
        if (stageRows.length > 0) {
          updates.push('stage_order = ?');
          values.push(stageRows[0].display_order);
        }
      }
      
      if (stage_order !== undefined) {
        updates.push('stage_order = ?');
        values.push(stage_order);
      }
      
      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (contact_id !== undefined) {
        updates.push('contact_id = ?');
        values.push(contact_id);
      }
      if (value !== undefined) {
        updates.push('value = ?');
        values.push(value);
      }
      if (probability !== undefined) {
        updates.push('probability = ?');
        values.push(probability);
      }
      if (close_date !== undefined) {
        updates.push('close_date = ?');
        values.push(close_date);
      }
      if (custom_properties !== undefined) {
        updates.push('custom_properties = ?');
        values.push(JSON.stringify(custom_properties));
      }
      
      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      
      await connection.query(
        `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      // Log activity if stage changed
      if (stage !== undefined && stage !== oldStage) {
        await connection.query(
          'INSERT INTO activity_timeline (deal_id, contact_id, user_id, activity_type, title, description, metadata, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            req.params.id,
            contact_id || currentDeal.contact_id,
            req.user.id,
            'deal_updated',
            `Deal stage changed: ${currentDeal.title}`,
            `Deal moved from "${oldStage}" to "${stage}"`,
            JSON.stringify({ old_stage: oldStage, new_stage: stage }),
            req.tenant_id
          ]
        );
      }
      
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

// Delete deal
router.delete('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    await pool.query(
      `DELETE FROM deals WHERE id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get deal activity timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'at');
    const [rows] = await pool.query(
      `SELECT at.*, u.full_name as user_name, u.email as user_email
       FROM activity_timeline at
       LEFT JOIN users u ON at.user_id = u.id
       WHERE at.deal_id = ? AND ${tenantFilter.sql}
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
