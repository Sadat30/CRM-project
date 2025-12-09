const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

// Get all pipeline stages (ordered by display_order)
router.get('/', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'ps');
    const [rows] = await pool.query(
      `SELECT * FROM pipeline_stages ps WHERE ${tenantFilter.sql} ORDER BY ps.display_order ASC`,
      tenantFilter.params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new pipeline stage
router.post('/', async (req, res) => {
  try {
    const { name, display_order, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Stage name is required' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO pipeline_stages (name, display_order, color, tenant_id) VALUES (?, ?, ?, ?)',
      [name, display_order || 0, color || '#3B82F6', req.tenant_id]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update pipeline stage (including reordering)
router.put('/:id', async (req, res) => {
  try {
    const { name, display_order, color } = req.body;
    
    // Verify stage belongs to tenant
    const tenantFilter = getTenantFilter(req, 'ps');
    const [checkRows] = await pool.query(
      `SELECT id FROM pipeline_stages ps WHERE ps.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(display_order);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    await pool.query(
      `UPDATE pipeline_stages SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reorder all stages (bulk update)
router.post('/reorder', async (req, res) => {
  try {
    const { stages } = req.body; // Array of {id, display_order}
    if (!Array.isArray(stages)) {
      return res.status(400).json({ error: 'Stages must be an array' });
    }
    
    // Verify all stages belong to tenant
    const tenantFilter = getTenantFilter(req, 'ps');
    const stageIds = stages.map(s => s.id);
    const placeholders = stageIds.map(() => '?').join(',');
    const [checkRows] = await pool.query(
      `SELECT id FROM pipeline_stages ps WHERE ps.id IN (${placeholders}) AND ${tenantFilter.sql}`,
      [...stageIds, ...tenantFilter.params]
    );
    if (checkRows.length !== stageIds.length) {
      return res.status(400).json({ error: 'Some stages not found or access denied' });
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const stage of stages) {
        await connection.query(
          'UPDATE pipeline_stages SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [stage.display_order, stage.id]
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

// Delete pipeline stage
router.delete('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'ps');
    const [rows] = await pool.query(
      `SELECT is_default FROM pipeline_stages ps WHERE ps.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    if (rows[0].is_default) {
      return res.status(400).json({ error: 'Cannot delete default stage' });
    }
    
    await pool.query('DELETE FROM pipeline_stages WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

