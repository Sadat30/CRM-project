-- Multi-Tenant Data Isolation Schema
-- Run this after the base schema and schema_updates

USE simplecrm;

-- Tenants Table: Organizations/Teams
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  settings JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
);

-- Add tenant_id and is_super_admin to users table
ALTER TABLE users
  ADD COLUMN tenant_id INT,
  ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE,
  ADD FOREIGN KEY fk_user_tenant (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  ADD INDEX idx_tenant (tenant_id);

-- Add tenant_id to all data tables
ALTER TABLE contacts
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_contact_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE deals
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_deal_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE tasks
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_task_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE tickets
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_ticket_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE contact_custom_fields
  ADD COLUMN tenant_id INT,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE contact_relationships
  ADD COLUMN tenant_id INT,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE activity_timeline
  ADD COLUMN tenant_id INT,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE pipeline_stages
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_stage_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE ticket_workflows
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_workflow_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE knowledge_base
  ADD COLUMN tenant_id INT,
  ADD FOREIGN KEY fk_kb_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE import_jobs
  ADD COLUMN tenant_id INT,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE google_tokens
  ADD COLUMN tenant_id INT,
  ADD INDEX idx_tenant (tenant_id);

ALTER TABLE google_sync_logs
  ADD COLUMN tenant_id INT,
  ADD INDEX idx_tenant (tenant_id);

-- Create default tenant for existing data (if any)
INSERT IGNORE INTO tenants (id, name, slug) VALUES (1, 'Default Tenant', 'default');

-- Update existing data to belong to default tenant (if any exists)
UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE contacts SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE deals SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE tickets SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE pipeline_stages SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE knowledge_base SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Note: For contact_custom_fields, contact_relationships, activity_timeline, etc.
-- We'll derive tenant_id from their parent records in application logic

