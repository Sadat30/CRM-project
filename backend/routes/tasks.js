const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

router.get('/', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 't');
    const [rows] = await pool.query(
      `SELECT * FROM tasks t WHERE (t.assigned_to = ? OR t.assigned_to IS NULL) AND ${tenantFilter.sql} ORDER BY t.due_date ASC LIMIT 500`,
      [req.user.id, ...tenantFilter.params]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, type, due_date, contact_id } = req.body;
    
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
    
    const [r] = await pool.query(
      'INSERT INTO tasks (title, type, due_date, assigned_to, contact_id, tenant_id) VALUES (?,?,?,?,?,?)',
      [title, type, due_date, req.user.id, contact_id, req.tenant_id]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/complete', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    await pool.query(
      `UPDATE tasks SET completed = 1 WHERE id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
