const jwt = require('jsonwebtoken');
const pool = require('../db');

module.exports = {
  requireAuth: async (req, res, next) => {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ error: 'Missing auth' });
    const parts = h.split(' ');
    if (parts.length !== 2) return res.status(401).json({ error: 'Invalid auth header' });
    const token = parts[1];
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      // Fetch fresh user data including tenant info
      const [users] = await pool.query(
        'SELECT id, email, full_name, role, tenant_id, is_super_admin FROM users WHERE id = ?',
        [data.id]
      );
      
      if (users.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const user = users[0];
      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id,
        is_super_admin: user.is_super_admin || false
      };
      
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  },
  requireRole: (role) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden - role ' + role + ' required' });
    }
    next();
  },
  requireSuperAdmin: (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!req.user.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden - super admin required' });
    }
    next();
  }
};
