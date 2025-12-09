const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');

// Helper: Get custom fields for a contact
async function getCustomFields(contactId, tenantId) {
  const [fields] = await pool.query(
    'SELECT * FROM contact_custom_fields WHERE contact_id = ? AND (tenant_id = ? OR tenant_id IS NULL)',
    [contactId, tenantId]
  );
  return fields;
}

// Helper: Save custom fields for a contact
async function saveCustomFields(contactId, customFields, tenantId) {
  if (!customFields || !Array.isArray(customFields)) return;
  
  // Delete existing fields for this contact and tenant
  await pool.query('DELETE FROM contact_custom_fields WHERE contact_id = ? AND (tenant_id = ? OR tenant_id IS NULL)', [contactId, tenantId]);
  
  // Insert new fields
  for (const field of customFields) {
    if (field.field_name && field.field_value !== undefined) {
      await pool.query(
        'INSERT INTO contact_custom_fields (contact_id, field_name, field_value, field_type, tenant_id) VALUES (?, ?, ?, ?, ?)',
        [contactId, field.field_name, field.field_value, field.field_type || 'text', tenantId]
      );
    }
  }
}

// List contacts with optional search and custom fields
router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const tenantFilter = getTenantFilter(req, 'c');
    const [rows] = await pool.query(
      `SELECT c.* FROM contacts c WHERE ${tenantFilter.sql} AND (c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?) LIMIT 500`,
      [...tenantFilter.params, '%' + q + '%', '%' + q + '%', '%' + q + '%']
    );
    
    // Optionally include custom fields
    if (req.query.include_fields === 'true') {
      for (const contact of rows) {
        contact.custom_fields = await getCustomFields(contact.id, req.tenant_id);
      }
    }
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create contact with custom fields
router.post('/', async (req, res) => {
  try {
    const { name, company, phone, email, job_title, dob, notes, tags, custom_fields } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [r] = await connection.query(
        'INSERT INTO contacts (user_id, name, company, phone, email, job_title, dob, notes, tags, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, name, company, phone, email, job_title, dob, notes, tags, req.tenant_id]
      );
      
      const contactId = r.insertId;
      
      // Save custom fields if provided
      if (custom_fields) {
        await saveCustomFields(contactId, custom_fields, req.tenant_id);
      }
      
      // Log activity
      await connection.query(
        'INSERT INTO activity_timeline (contact_id, user_id, activity_type, title, description, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
        [contactId, req.user.id, 'contact_created', `Contact created: ${name}`, `New contact ${name} was created`, req.tenant_id]
      );
      
      await connection.commit();
      res.json({ ok: true, id: contactId });
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

// Get single contact with custom fields and relationships
router.get('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'c');
    const [rows] = await pool.query(
      `SELECT c.* FROM contacts c WHERE c.id = ? AND ${tenantFilter.sql} LIMIT 1`,
      [req.params.id, ...tenantFilter.params]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const contact = rows[0];
    
    // Get custom fields
    contact.custom_fields = await getCustomFields(contact.id, req.tenant_id);
    
    // Get relationships (only within same tenant)
    const [relationships] = await pool.query(
      `SELECT cr.*, c.name as related_contact_name, c.email as related_contact_email, c.company as related_contact_company
       FROM contact_relationships cr
       JOIN contacts c ON cr.related_contact_id = c.id
       WHERE cr.contact_id = ? AND cr.tenant_id = ? AND c.tenant_id = ?`,
      [contact.id, req.tenant_id, req.tenant_id]
    );
    contact.relationships = relationships;
    
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update contact with custom fields
router.put('/:id', async (req, res) => {
  try {
    const { name, company, phone, email, job_title, dob, notes, tags, custom_fields } = req.body;
    
    // Verify contact belongs to tenant
    const tenantFilter = getTenantFilter(req, 'c');
    const [checkRows] = await pool.query(
      `SELECT id FROM contacts c WHERE c.id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        'UPDATE contacts SET name=?, company=?, phone=?, email=?, job_title=?, dob=?, notes=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [name, company, phone, email, job_title, dob, notes, tags, req.params.id]
      );
      
      // Update custom fields if provided
      if (custom_fields) {
        await saveCustomFields(req.params.id, custom_fields, req.tenant_id);
      }
      
      // Log activity
      await connection.query(
        'INSERT INTO activity_timeline (contact_id, user_id, activity_type, title, description, tenant_id) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, req.user.id, 'contact_updated', `Contact updated: ${name || 'Contact'}`, 'Contact information was updated', req.tenant_id]
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

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req);
    await pool.query(
      `DELETE FROM contacts WHERE id = ? AND ${tenantFilter.sql}`,
      [req.params.id, ...tenantFilter.params]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get contact activity timeline
router.get('/:id/timeline', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'at');
    const [rows] = await pool.query(
      `SELECT at.*, u.full_name as user_name, u.email as user_email
       FROM activity_timeline at
       LEFT JOIN users u ON at.user_id = u.id
       WHERE at.contact_id = ? AND ${tenantFilter.sql}
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

// Add relationship between contacts
router.post('/:id/relationships', async (req, res) => {
  try {
    const { related_contact_id, relationship_type, notes } = req.body;
    
    if (!related_contact_id || !relationship_type) {
      return res.status(400).json({ error: 'related_contact_id and relationship_type are required' });
    }
    
    if (req.params.id === related_contact_id.toString()) {
      return res.status(400).json({ error: 'Contact cannot be related to itself' });
    }
    
    // Verify both contacts belong to same tenant
    const tenantFilter = getTenantFilter(req, 'c');
    const [checkRows] = await pool.query(
      `SELECT id FROM contacts c WHERE c.id IN (?, ?) AND ${tenantFilter.sql}`,
      [req.params.id, related_contact_id, ...tenantFilter.params, ...tenantFilter.params]
    );
    if (checkRows.length !== 2) {
      return res.status(400).json({ error: 'Both contacts must belong to the same tenant' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO contact_relationships (contact_id, related_contact_id, relationship_type, notes, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, related_contact_id, relationship_type, notes, req.tenant_id]
    );
    
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Relationship already exists' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete relationship
router.delete('/:id/relationships/:relId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM contact_relationships WHERE id = ? AND contact_id = ? AND tenant_id = ?',
      [req.params.relId, req.params.id, req.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
