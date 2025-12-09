const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

// Get all knowledge base articles (with optional search)
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const category = req.query.category;
    const tenantFilter = getTenantFilter(req, 'kb');
    
    let query = `SELECT kb.*, u.full_name as created_by_name
                 FROM knowledge_base kb
                 LEFT JOIN users u ON kb.created_by = u.id
                 WHERE ${tenantFilter.sql}`;
    const params = [...tenantFilter.params];
    
    if (search) {
      query += ` AND (MATCH(kb.title, kb.content) AGAINST(? IN NATURAL LANGUAGE MODE) OR kb.title LIKE ? OR kb.content LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(search, searchTerm, searchTerm);
    }
    
    if (category) {
      query += ` AND kb.category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY kb.views DESC, kb.created_at DESC LIMIT 100`;
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'kb');
    const [rows] = await pool.query(
      `SELECT kb.*, u.full_name as created_by_name
       FROM knowledge_base kb
       LEFT JOIN users u ON kb.created_by = u.id
       WHERE kb.id = ? AND ${tenantFilter.sql} LIMIT 1`,
      [req.params.id, ...tenantFilter.params]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Increment views
    await pool.query('UPDATE knowledge_base SET views = views + 1 WHERE id = ?', [req.params.id]);
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create article (requires auth)
router.post('/', async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const [r] = await pool.query(
      'INSERT INTO knowledge_base (title, content, category, tags, created_by, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content, category, tags, req.user.id, req.tenant_id]
    );
    
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update article
router.put('/:id', async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    
    // Check if user created the article or is admin, and verify tenant
    const tenantFilter = getTenantFilter(req, 'kb');
    const [rows] = await pool.query(
      `SELECT created_by FROM knowledge_base kb WHERE kb.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    if (rows[0].created_by !== req.user.id && req.user.role !== 'admin' && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(tags);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    
    await pool.query(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete article
router.delete('/:id', async (req, res) => {
  try {
    // Check if user created the article or is admin, and verify tenant
    const tenantFilter = getTenantFilter(req, 'kb');
    const [rows] = await pool.query(
      `SELECT created_by FROM knowledge_base kb WHERE kb.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    if (rows[0].created_by !== req.user.id && req.user.role !== 'admin' && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await pool.query('DELETE FROM knowledge_base WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mark article as helpful/not helpful
router.post('/:id/feedback', async (req, res) => {
  try {
    const { helpful } = req.body;
    const tenantFilter = getTenantFilter(req, 'kb');
    
    // Verify article exists in tenant
    const [check] = await pool.query(
      `SELECT id FROM knowledge_base kb WHERE kb.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    if (helpful === true) {
      await pool.query('UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = ?', [req.params.id]);
    } else if (helpful === false) {
      await pool.query('UPDATE knowledge_base SET not_helpful_count = not_helpful_count + 1 WHERE id = ?', [req.params.id]);
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get('/categories/list', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'kb');
    const [rows] = await pool.query(
      `SELECT DISTINCT category FROM knowledge_base kb WHERE kb.category IS NOT NULL AND ${tenantFilter.sql} ORDER BY category`,
      tenantFilter.params
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

