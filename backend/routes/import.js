const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getTenantFilter } = require('../middleware/tenant');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper: Parse CSV file
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Helper: Parse Excel file
function parseExcel(buffer) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error('Failed to parse Excel file: ' + error.message);
  }
}

// Helper: Detect file type and parse
async function parseFile(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    return await parseCSV(buffer);
  } else if (['xlsx', 'xls'].includes(ext)) {
    return parseExcel(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload CSV or Excel file.');
  }
}

// Get file preview (first 5 rows) for field mapping
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const rows = await parseFile(req.file.buffer, req.file.originalname);
    const preview = rows.slice(0, 5);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    // Suggest field mappings based on header names
    const suggestedMappings = {};
    const fieldSynonyms = {
      name: ['name', 'full name', 'fullname', 'contact name', 'person', 'contact'],
      email: ['email', 'e-mail', 'email address', 'mail'],
      phone: ['phone', 'telephone', 'mobile', 'cell', 'phone number'],
      company: ['company', 'organization', 'org', 'business', 'firm'],
      job_title: ['job title', 'title', 'position', 'role', 'job'],
      notes: ['notes', 'note', 'comments', 'comment', 'description'],
      tags: ['tags', 'tag', 'categories', 'category']
    };
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();
      for (const [field, synonyms] of Object.entries(fieldSynonyms)) {
        if (synonyms.some(syn => lowerHeader.includes(syn))) {
          suggestedMappings[header] = field;
          break;
        }
      }
      if (!suggestedMappings[header]) {
        suggestedMappings[header] = `custom_${header.toLowerCase().replace(/\s+/g, '_')}`;
      }
    });
    
    res.json({
      headers,
      preview,
      suggestedMappings,
      totalRows: rows.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: Map CSV row to contact fields
function mapCSVRowToContact(row, fieldMapping) {
  const contact = {
    name: '',
    company: '',
    email: '',
    phone: '',
    job_title: '',
    notes: '',
    tags: '',
    custom_fields: []
  };
  
  // Standard field mapping
  for (const [csvField, dbField] of Object.entries(fieldMapping)) {
    if (row[csvField] && dbField.startsWith('custom_')) {
      const customFieldName = dbField.replace('custom_', '');
      contact.custom_fields.push({
        field_name: customFieldName,
        field_value: row[csvField],
        field_type: 'text'
      });
    } else if (dbField in contact) {
      contact[dbField] = row[csvField] || contact[dbField];
    }
  }
  
  return contact;
}

// Bulk import contacts from CSV/Excel
router.post('/contacts', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : {};
    const defaultMapping = {
      'Name': 'name',
      'Email': 'email',
      'Phone': 'phone',
      'Company': 'company',
      'Job Title': 'job_title',
      'Notes': 'notes',
      'Tags': 'tags'
    };
    
    const mapping = { ...defaultMapping, ...fieldMapping };
    
    // Parse file (CSV or Excel)
    const rows = await parseFile(req.file.buffer, req.file.originalname);
    
    // Create import job
    const [jobResult] = await pool.query(
      'INSERT INTO import_jobs (user_id, filename, status, total_rows, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.file.originalname, 'processing', rows.length, req.tenant_id]
    );
    
    const jobId = jobResult.insertId;
    
    // Process rows asynchronously
    processImportJob(jobId, req.user.id, rows, mapping).catch(err => {
      console.error('Import job error:', err);
    });
    
    res.json({ ok: true, job_id: jobId, message: 'Import started' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Process import job
async function processImportJob(jobId, userId, rows, mapping) {
  const connection = await pool.getConnection();
  let successful = 0;
  let failed = 0;
  const errors = [];
  
  try {
    await connection.beginTransaction();
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const contact = mapCSVRowToContact(row, mapping);
        
        if (!contact.name) {
          failed++;
          errors.push({ row: i + 1, error: 'Name is required' });
          continue;
        }
        
        // Get tenant_id from import job
        const [jobRow] = await connection.query('SELECT tenant_id FROM import_jobs WHERE id = ?', [jobId]);
        const tenantId = jobRow[0]?.tenant_id;
        
        // Insert contact
        const [contactResult] = await connection.query(
          'INSERT INTO contacts (user_id, name, company, phone, email, job_title, notes, tags, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [userId, contact.name, contact.company, contact.phone, contact.email, contact.job_title, contact.notes, contact.tags, tenantId]
        );
        
        const contactId = contactResult.insertId;
        
        // Insert custom fields
        if (contact.custom_fields.length > 0) {
          for (const field of contact.custom_fields) {
            await connection.query(
              'INSERT INTO contact_custom_fields (contact_id, field_name, field_value, field_type, tenant_id) VALUES (?, ?, ?, ?, ?)',
              [contactId, field.field_name, field.field_value, field.field_type, tenantId]
            );
          }
        }
        
        // Log activity
        await connection.query(
          'INSERT INTO activity_timeline (contact_id, user_id, activity_type, title, description, metadata, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [contactId, userId, 'contact_created', `Contact imported: ${contact.name}`, 'Contact imported via bulk import', JSON.stringify({ import_job_id: jobId }), tenantId]
        );
        
        successful++;
      } catch (err) {
        failed++;
        errors.push({ row: i + 1, error: err.message });
      }
    }
    
    await connection.commit();
    
    // Update import job
    await pool.query(
      'UPDATE import_jobs SET status = ?, successful_rows = ?, failed_rows = ?, errors = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', successful, failed, JSON.stringify(errors), jobId]
    );
  } catch (err) {
    await connection.rollback();
    await pool.query(
      'UPDATE import_jobs SET status = ?, errors = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['failed', JSON.stringify([{ error: err.message }]), jobId]
    );
  } finally {
    connection.release();
  }
}

// Get import job status
router.get('/jobs/:id', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'ij');
    const [rows] = await pool.query(
      `SELECT * FROM import_jobs ij WHERE ij.id = ? AND ij.user_id = ? AND ${tenantFilter.sql}`,
      [req.params.id, req.user.id, ...tenantFilter.params]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Import job not found' });
    }
    
    const job = rows[0];
    if (job.errors) {
      try {
        job.errors = JSON.parse(job.errors);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List import jobs
router.get('/jobs', async (req, res) => {
  try {
    const tenantFilter = getTenantFilter(req, 'ij');
    const [rows] = await pool.query(
      `SELECT * FROM import_jobs ij WHERE ij.user_id = ? AND ${tenantFilter.sql} ORDER BY ij.created_at DESC LIMIT 50`,
      [req.user.id, ...tenantFilter.params]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

