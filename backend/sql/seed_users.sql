-- User Seeder for Multi-Tenant SimpleCRM
-- This script creates tenants and users of all types with known credentials
-- Run this AFTER running multi_tenant_schema.sql

USE simplecrm;

-- ============================================
-- STEP 1: Create Tenants
-- ============================================
INSERT IGNORE INTO tenants (id, name, slug, domain) VALUES
(1, 'Default Tenant', 'default', 'default.simplecrm.com'),
(2, 'Acme Corporation', 'acme-corp', 'acme.simplecrm.com'),
(3, 'TechStart Inc', 'techstart', 'techstart.simplecrm.com'),
(4, 'Global Solutions', 'global-solutions', 'global.simplecrm.com');

-- ============================================
-- STEP 2: Create Super Admin User
-- ============================================
-- Super Admin can access all tenants
-- Email: superadmin@simplecrm.com
-- Password: superadmin123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(1, 'Super Admin', 'superadmin', 'superadmin@simplecrm.com', '$2b$10$nrP7hpD79lHqvEo72huxs.fyzCN1Z2XV6NWW6mGWQcF3fj9zYnJNq', '+1-555-0001', 'admin', NULL, TRUE);

-- ============================================
-- STEP 3: Create Admin Users (one per tenant)
-- ============================================
-- Default Tenant Admin
-- Email: admin@default.com
-- Password: admin123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(2, 'John Admin', 'jadmin', 'admin@default.com', '$2b$10$Devb.//lZYyO7afqDpWOe.Fjw4IOqmFS6Jwd1ik4zgVrncqhy6Stq', '+1-555-0101', 'admin', 1, FALSE);

-- Acme Corporation Admin
-- Email: admin@acme.com
-- Password: admin123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(3, 'Sarah Admin', 'sadmin', 'admin@acme.com', '$2b$10$Devb.//lZYyO7afqDpWOe.Fjw4IOqmFS6Jwd1ik4zgVrncqhy6Stq', '+1-555-0201', 'admin', 2, FALSE);

-- TechStart Inc Admin
-- Email: admin@techstart.com
-- Password: admin123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(4, 'Mike Admin', 'madmin', 'admin@techstart.com', '$2b$10$Devb.//lZYyO7afqDpWOe.Fjw4IOqmFS6Jwd1ik4zgVrncqhy6Stq', '+1-555-0301', 'admin', 3, FALSE);

-- Global Solutions Admin
-- Email: admin@global.com
-- Password: admin123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(5, 'Lisa Admin', 'ladmin', 'admin@global.com', '$2b$10$Devb.//lZYyO7afqDpWOe.Fjw4IOqmFS6Jwd1ik4zgVrncqhy6Stq', '+1-555-0401', 'admin', 4, FALSE);

-- ============================================
-- STEP 4: Create Sales Users (for Default Tenant)
-- ============================================
-- Sales User 1
-- Email: sales1@default.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(6, 'David Sales', 'dsales', 'sales1@default.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0102', 'sales', 1, FALSE);

-- Sales User 2
-- Email: sales2@default.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(7, 'Emily Sales', 'esales', 'sales2@default.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0103', 'sales', 1, FALSE);

-- ============================================
-- STEP 5: Create Customer Users (multiple per tenant)
-- ============================================
-- Default Tenant Customers
-- Email: customer1@default.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(8, 'Alice Customer', 'acustomer', 'customer1@default.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0104', 'customer', 1, FALSE);

-- Email: customer2@default.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(9, 'Bob Customer', 'bcustomer', 'customer2@default.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0105', 'customer', 1, FALSE);

-- Acme Corporation Customers
-- Email: customer1@acme.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(10, 'Charlie Customer', 'ccustomer', 'customer1@acme.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0202', 'customer', 2, FALSE);

-- Email: customer2@acme.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(11, 'Diana Customer', 'dcustomer', 'customer2@acme.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0203', 'customer', 2, FALSE);

-- TechStart Inc Customers
-- Email: customer1@techstart.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(12, 'Eve Customer', 'ecustomer', 'customer1@techstart.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0302', 'customer', 3, FALSE);

-- Email: customer2@techstart.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(13, 'Frank Customer', 'fcustomer', 'customer2@techstart.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0303', 'customer', 3, FALSE);

-- Global Solutions Customers
-- Email: customer1@global.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(14, 'Grace Customer', 'gcustomer', 'customer1@global.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0402', 'customer', 4, FALSE);

-- Email: customer2@global.com
-- Password: customer123
INSERT IGNORE INTO users (id, full_name, username, email, password_hash, phone, role, tenant_id, is_super_admin) VALUES
(15, 'Henry Customer', 'hcustomer', 'customer2@global.com', '$2b$10$rbx26YdVKpEBnK2oXIPwWedqkuIaOeDDfnNyKlxTpldFDlaJLtn/S', '+1-555-0403', 'customer', 4, FALSE);

-- ============================================
-- USER CREDENTIALS SUMMARY
-- ============================================
-- SUPER ADMIN:
--   Email: superadmin@simplecrm.com
--   Password: superadmin123
--   Access: All tenants (can view/manage everything)
--
-- ADMINS (per tenant):
--   Default Tenant:    admin@default.com    / admin123
--   Acme Corporation:  admin@acme.com       / admin123
--   TechStart Inc:     admin@techstart.com / admin123
--   Global Solutions:  admin@global.com    / admin123
--   Access: Their tenant only (can manage their tenant's data)
--
-- SALES USERS (Default Tenant):
--   sales1@default.com / customer123
--   sales2@default.com / customer123
--   Access: Default tenant only
--
-- CUSTOMER USERS:
--   Default Tenant:
--     customer1@default.com / customer123
--     customer2@default.com / customer123
--   Acme Corporation:
--     customer1@acme.com / customer123
--     customer2@acme.com / customer123
--   TechStart Inc:
--     customer1@techstart.com / customer123
--     customer2@techstart.com / customer123
--   Global Solutions:
--     customer1@global.com / customer123
--     customer2@global.com / customer123
--   Access: Their tenant only
--
-- ============================================
-- TENANT SLUGS FOR LOGIN:
-- ============================================
-- When logging in, use these tenant slugs:
--   - default
--   - acme-corp
--   - techstart
--   - global-solutions

