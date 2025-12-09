// Helper script to update remaining routes with tenant isolation
// This file documents the pattern - apply to: import.js, knowledge_base.js, activity.js, google.js

// Pattern for updating routes:
// 1. Remove requireAuth from individual routes (handled by middleware in server.js)
// 2. Import getTenantFilter: const { getTenantFilter } = require('../middleware/tenant');
// 3. Add tenant_id to INSERT statements
// 4. Add tenant filtering to SELECT/UPDATE/DELETE queries using getTenantFilter(req, 'table_alias')
// 5. For JOIN queries, ensure tenant_id matches on joined tables

// Example patterns:

// SELECT with tenant filter:
// const tenantFilter = getTenantFilter(req, 'kb');
// const [rows] = await pool.query(
//   `SELECT * FROM knowledge_base kb WHERE ${tenantFilter.sql} AND ...`,
//   [...tenantFilter.params, ...otherParams]
// );

// INSERT with tenant_id:
// await pool.query(
//   'INSERT INTO table (col1, col2, tenant_id) VALUES (?, ?, ?)',
//   [val1, val2, req.tenant_id]
// );

// UPDATE with tenant verification:
// const tenantFilter = getTenantFilter(req, 't');
// const [check] = await pool.query(
//   `SELECT id FROM table t WHERE t.id = ? AND ${tenantFilter.sql}`,
//   [id, ...tenantFilter.params]
// );
// if (check.length === 0) return res.status(404).json({ error: 'Not found' });

// DELETE with tenant filter:
// const tenantFilter = getTenantFilter(req);
// await pool.query(
//   `DELETE FROM table WHERE id = ? AND ${tenantFilter.sql}`,
//   [id, ...tenantFilter.params]
// );

