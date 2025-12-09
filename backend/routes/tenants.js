const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { setTenantContext, requireTenant } = require('../middleware/tenant');

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(setTenantContext);

// Get all tenants (super admin only)
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, 
       (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
       (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id) as contact_count,
       (SELECT COUNT(*) FROM deals WHERE tenant_id = t.id) as deal_count
       FROM tenants t
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single tenant
router.get('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, 
       (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count
       FROM tenants t
       WHERE t.id = ?`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create tenant (super admin only)
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, domain, settings } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO tenants (name, slug, domain, settings) VALUES (?, ?, ?, ?)',
      [name, slug, domain, settings ? JSON.stringify(settings) : null]
    );
    
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update tenant (super admin only)
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, domain, settings } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (slug !== undefined) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
      }
      updates.push('slug = ?');
      values.push(slug);
    }
    if (domain !== undefined) {
      updates.push('domain = ?');
      values.push(domain);
    }
    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(settings));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    
    await pool.query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete tenant (super admin only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    // Prevent deleting default tenant
    const [rows] = await pool.query('SELECT slug FROM tenants WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    if (rows[0].slug === 'default') {
      return res.status(400).json({ error: 'Cannot delete default tenant' });
    }
    
    await pool.query('DELETE FROM tenants WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get current user's tenant info
router.get('/current/info', requireTenant, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, domain, settings FROM tenants WHERE id = ?',
      [req.tenant_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

