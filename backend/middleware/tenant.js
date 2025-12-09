const pool = require('../db');

/**
 * Middleware to set tenant context from JWT
 * Adds req.tenant_id and req.is_super_admin to request
 */
module.exports.setTenantContext = (req, res, next) => {
  if (req.user) {
    req.tenant_id = req.user.tenant_id;
    req.is_super_admin = req.user.is_super_admin || false;
  }
  next();
};

/**
 * Middleware to ensure tenant_id is set
 */
module.exports.requireTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.is_super_admin) {
    // Super admin can access all tenants
    // They can optionally specify tenant_id in query/body
    req.tenant_id = req.query.tenant_id || req.body.tenant_id || req.user.tenant_id;
    return next();
  }
  
  if (!req.tenant_id) {
    return res.status(403).json({ error: 'No tenant access' });
  }
  
  next();
};

/**
 * Helper function to add tenant filter to WHERE clause
 * Returns SQL condition and params
 */
module.exports.getTenantFilter = (req, tableAlias = '') => {
  const alias = tableAlias ? `${tableAlias}.` : '';
  
  if (req.is_super_admin && req.query.tenant_id) {
    // Super admin viewing specific tenant
    return {
      sql: `${alias}tenant_id = ?`,
      params: [req.query.tenant_id]
    };
  } else if (req.is_super_admin && !req.query.tenant_id) {
    // Super admin viewing all tenants - no filter
    return {
      sql: '1=1',
      params: []
    };
  } else {
    // Regular user - filter by their tenant
    return {
      sql: `${alias}tenant_id = ?`,
      params: [req.tenant_id]
    };
  }
};

/**
 * Helper to verify user has access to a tenant
 */
module.exports.verifyTenantAccess = async (userId, tenantId) => {
  const [rows] = await pool.query(
    'SELECT tenant_id, is_super_admin FROM users WHERE id = ?',
    [userId]
  );
  
  if (rows.length === 0) return false;
  
  const user = rows[0];
  if (user.is_super_admin) return true;
  if (user.tenant_id === tenantId) return true;
  
  return false;
};

