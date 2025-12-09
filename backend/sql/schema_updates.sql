-- Enhanced Schema for Phase 1 Features
-- Run this after the base schema

USE simplecrm;

-- Pipeline Stages: Custom stages for deals pipeline
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order (display_order)
);

-- Insert default stages
INSERT IGNORE INTO pipeline_stages (name, display_order, is_default) VALUES
('New', 1, TRUE),
('Contacted', 2, TRUE),
('Qualified', 3, TRUE),
('Proposal', 4, TRUE),
('Negotiation', 5, TRUE),
('Closed Won', 6, TRUE),
('Closed Lost', 7, TRUE);

-- Contact Custom Fields: Unlimited custom fields for contacts
CREATE TABLE IF NOT EXISTS contact_custom_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_value TEXT,
  field_type ENUM('text','number','date','email','phone','url','textarea','select') DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  INDEX idx_contact (contact_id),
  INDEX idx_field_name (field_name)
);

-- Activity Timeline: Unified timeline of all customer interactions
CREATE TABLE IF NOT EXISTS activity_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT,
  deal_id INT,
  ticket_id INT,
  user_id INT,
  activity_type ENUM('call','meeting','email','note','task','deal_created','deal_updated','ticket_created','ticket_updated','contact_created','contact_updated') NOT NULL,
  title VARCHAR(255),
  description TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_contact (contact_id),
  INDEX idx_deal (deal_id),
  INDEX idx_created (created_at)
);

-- Contact Relationships: B2B account structures and relationships
CREATE TABLE IF NOT EXISTS contact_relationships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  related_contact_id INT NOT NULL,
  relationship_type ENUM('parent_company','subsidiary','partner','colleague','decision_maker','influencer','champion','blocker') NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (related_contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  INDEX idx_contact (contact_id),
  INDEX idx_related (related_contact_id),
  UNIQUE KEY unique_relationship (contact_id, related_contact_id, relationship_type)
);

-- Enhanced Deals: Add stage_order and custom properties
-- Note: Run these individually if columns already exist
ALTER TABLE deals 
  ADD COLUMN stage_order INT DEFAULT 0;
ALTER TABLE deals 
  ADD COLUMN custom_properties JSON;
ALTER TABLE deals 
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Enhanced Tickets: Workflows, SLA, priority, assigned user
ALTER TABLE tickets
  ADD COLUMN assigned_to INT;
ALTER TABLE tickets
  ADD COLUMN priority ENUM('low','medium','high','urgent') DEFAULT 'medium';
ALTER TABLE tickets
  ADD COLUMN workflow_stage VARCHAR(100) DEFAULT 'open';
ALTER TABLE tickets
  ADD COLUMN sla_due_date DATETIME;
ALTER TABLE tickets
  ADD COLUMN resolved_at DATETIME;
ALTER TABLE tickets
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE tickets
  ADD FOREIGN KEY fk_ticket_assigned (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Ticket Workflows: Customizable ticket status workflows
CREATE TABLE IF NOT EXISTS ticket_workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stages JSON NOT NULL, -- Array of stage objects: [{name, order, color}]
  sla_policy JSON, -- {response_time_hours, resolution_time_hours}
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default workflow
INSERT IGNORE INTO ticket_workflows (name, stages, sla_policy, is_default) VALUES
('Default Workflow', 
 JSON_ARRAY(
   JSON_OBJECT('name', 'Open', 'order', 1, 'color', '#EF4444'),
   JSON_OBJECT('name', 'In Progress', 'order', 2, 'color', '#F59E0B'),
   JSON_OBJECT('name', 'Pending', 'order', 3, 'color', '#3B82F6'),
   JSON_OBJECT('name', 'Resolved', 'order', 4, 'color', '#10B981'),
   JSON_OBJECT('name', 'Closed', 'order', 5, 'color', '#6B7280')
 ),
 JSON_OBJECT('response_time_hours', 24, 'resolution_time_hours', 72),
 TRUE
);

-- Knowledge Base: For case deflection and support
CREATE TABLE IF NOT EXISTS knowledge_base (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags VARCHAR(255),
  views INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FULLTEXT INDEX idx_search (title, content)
);

-- Bulk Import Jobs: Track CSV/Excel imports
CREATE TABLE IF NOT EXISTS import_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  filename VARCHAR(255),
  status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  total_rows INT DEFAULT 0,
  successful_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  errors JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enhanced Tasks: Add more metadata
ALTER TABLE tasks
  ADD COLUMN description TEXT;
ALTER TABLE tasks
  ADD COLUMN priority ENUM('low','medium','high') DEFAULT 'medium';
ALTER TABLE tasks
  ADD COLUMN metadata JSON;

-- Google Integration Logs: Track Gmail/Calendar sync
CREATE TABLE IF NOT EXISTS google_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  sync_type ENUM('gmail','calendar','contacts') NOT NULL,
  status ENUM('success','failed','partial') DEFAULT 'success',
  items_synced INT DEFAULT 0,
  errors JSON,
  last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_sync (user_id, sync_type, last_sync_at)
);

