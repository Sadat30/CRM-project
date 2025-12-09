const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// simple local register (requires tenant_id)
router.post('/register', async (req,res)=>{
  try{
    const {full_name, username, email, password, phone, role='customer', tenant_id} = req.body;
    
    if (!tenant_id) {
      return res.status(400).json({error: 'tenant_id is required'});
    }
    
    // Verify tenant exists
    const [tenantCheck] = await pool.query('SELECT id FROM tenants WHERE id = ?', [tenant_id]);
    if (tenantCheck.length === 0) {
      return res.status(400).json({error: 'Invalid tenant_id'});
    }
    
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO users (full_name, username, password_hash, email, phone, role, tenant_id) VALUES (?,?,?,?,?,?,?)',
      [full_name, username, hash, email, phone, role, tenant_id]
    );
    res.json({ok:true, id: r.insertId});
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

// local login
router.post('/login', async (req,res)=>{
  try{
    const {email, password, tenant_slug} = req.body;
    
    // If tenant_slug provided, verify user belongs to that tenant
    let tenantId = null;
    if (tenant_slug) {
      const [tenantRows] = await pool.query('SELECT id FROM tenants WHERE slug = ?', [tenant_slug]);
      if (tenantRows.length === 0) {
        return res.status(401).json({error: 'Invalid tenant'});
      }
      tenantId = tenantRows[0].id;
    }
    
    const [rows] = await pool.query(
      'SELECT u.*, t.name as tenant_name, t.slug as tenant_slug FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ?',
      [email]
    );
    if(rows.length === 0) return res.status(401).json({error:'Invalid credentials'});
    
    const user = rows[0];
    
    // If tenant_slug provided, verify user belongs to that tenant
    if (tenantId && user.tenant_id !== tenantId && !user.is_super_admin) {
      return res.status(401).json({error: 'User does not belong to this tenant'});
    }
    
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if(!ok) return res.status(401).json({error:'Invalid credentials'});
    
    // Include tenant info in JWT
    const token = jwt.sign({
      id: user.id,
      role: user.role,
      tenant_id: user.tenant_id,
      is_super_admin: user.is_super_admin || false
    }, process.env.JWT_SECRET || 'secret', {expiresIn:'7d'});
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name,
        tenant_slug: user.tenant_slug,
        is_super_admin: user.is_super_admin || false
      }
    });
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

// google sign in/up (requires tenant_slug)
router.post('/google', async (req,res)=>{
  try{
    const {id_token, role='customer', tenant_slug} = req.body;
    
    if (!tenant_slug) {
      return res.status(400).json({error: 'tenant_slug is required'});
    }
    
    // Get tenant
    const [tenantRows] = await pool.query('SELECT id, name, slug FROM tenants WHERE slug = ?', [tenant_slug]);
    if (tenantRows.length === 0) {
      return res.status(400).json({error: 'Invalid tenant'});
    }
    const tenant = tenantRows[0];
    
    const ticket = await client.verifyIdToken({idToken: id_token, audience: process.env.GOOGLE_CLIENT_ID});
    const payload = ticket.getPayload();
    const email = payload.email;
    const google_id = payload.sub;
    
    // upsert by email
    const [rows] = await pool.query(
      'SELECT u.*, t.name as tenant_name, t.slug as tenant_slug FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE u.email = ? LIMIT 1',
      [email]
    );
    
    if(rows.length === 0){
      const [r] = await pool.query(
        'INSERT INTO users (full_name, email, google_id, role, tenant_id) VALUES (?,?,?,?,?)',
        [payload.name || '', email, google_id, role, tenant.id]
      );
      const token = jwt.sign({
        id: r.insertId,
        role,
        tenant_id: tenant.id,
        is_super_admin: false
      }, process.env.JWT_SECRET || 'secret', {expiresIn:'7d'});
      return res.json({
        token,
        user: {
          id: r.insertId,
          email,
          full_name: payload.name,
          role,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_slug: tenant.slug,
          is_super_admin: false
        }
      });
    } else {
      const user = rows[0];
      
      // Verify user belongs to this tenant (unless super admin)
      if (user.tenant_id !== tenant.id && !user.is_super_admin) {
        return res.status(401).json({error: 'User does not belong to this tenant'});
      }
      
      // update google_id if missing
      if(!user.google_id){
        await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [google_id, user.id]);
      }
      
      const token = jwt.sign({
        id: user.id,
        role: user.role,
        tenant_id: user.tenant_id,
        is_super_admin: user.is_super_admin || false
      }, process.env.JWT_SECRET || 'secret', {expiresIn:'7d'});
      
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name,
          tenant_slug: user.tenant_slug,
          is_super_admin: user.is_super_admin || false
        }
      });
    }
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

// Get list of tenants (for login page)
router.get('/tenants', async (req, res) => {
  try {
    // Add timeout wrapper
    const queryPromise = pool.query('SELECT id, name, slug FROM tenants ORDER BY name');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    );
    
    const [rows] = await Promise.race([queryPromise, timeoutPromise]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tenants:', err);
    // Return empty array instead of error so login page still works
    res.json([]);
  }
});

module.exports = router;
