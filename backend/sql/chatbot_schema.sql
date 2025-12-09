-- In-App Customer Chatbot Schema
-- Run this to add chatbot support to the database

USE simplecrm;

-- Add chat-related fields to contacts
ALTER TABLE contacts
  ADD COLUMN chat_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN last_chat_at DATETIME;

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  tenant_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, closed, waiting, escalated
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  agent_id INT, -- If escalated to human agent
  metadata JSON, -- Additional session data
  FOREIGN KEY fk_chat_contact (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY fk_chat_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY fk_chat_agent (agent_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_contact_id (contact_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_last_message (last_message_at)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- customer, bot, agent
  sender_id INT, -- contact_id (customer) or user_id (agent/bot)
  message_text TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- text, voice, file, system
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INT, -- bytes
  ai_intent VARCHAR(100), -- Extracted intent from AI
  ai_entities JSON, -- Extracted entities (ticket_id, etc.)
  ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
  crm_action VARCHAR(100), -- What CRM action was taken (ticket_created, ticket_fetched, etc.)
  crm_data JSON, -- Data returned from CRM (ticket details, etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_message_session (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at),
  INDEX idx_sender_type (sender_type)
);

-- Voice messages
CREATE TABLE IF NOT EXISTS chat_voice_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  transcription TEXT,
  transcription_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  duration INT, -- seconds
  language VARCHAR(10) DEFAULT 'en',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_voice_message (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  INDEX idx_message_id (message_id),
  INDEX idx_status (transcription_status)
);

-- Conference call logs
CREATE TABLE IF NOT EXISTS conference_call_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT,
  agent_id INT,
  tenant_id INT NOT NULL,
  call_provider VARCHAR(50) NOT NULL, -- zoom, google_meet, teams, telegram
  call_id VARCHAR(255) NOT NULL,
  call_title VARCHAR(255),
  recording_url VARCHAR(500),
  recording_status VARCHAR(20) DEFAULT 'pending', -- pending, downloading, processing, completed, failed
  transcription TEXT,
  transcription_status VARCHAR(20) DEFAULT 'pending',
  summary TEXT, -- AI-generated meeting summary
  summary_status VARCHAR(20) DEFAULT 'pending',
  action_items JSON, -- Extracted action items
  key_decisions JSON, -- Key decisions made
  participants JSON, -- List of participants with roles
  duration INT, -- seconds
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_call_contact (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY fk_call_agent (agent_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY fk_call_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_contact_id (contact_id),
  INDEX idx_agent_id (agent_id),
  INDEX idx_call_id (call_id),
  INDEX idx_provider (call_provider)
);

-- AI query logs (for analytics and improvement)
CREATE TABLE IF NOT EXISTS chat_ai_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT,
  message_id INT,
  contact_id INT,
  tenant_id INT,
  query_text TEXT NOT NULL,
  intent VARCHAR(100),
  entities JSON,
  ai_model VARCHAR(50), -- gpt-4, gemini-pro, claude, etc.
  ai_response TEXT,
  crm_data_fetched JSON, -- What data was retrieved from CRM
  crm_actions_taken JSON, -- What actions were performed
  response_time_ms INT,
  tokens_used INT,
  cost DECIMAL(10,6), -- API cost in USD
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_ai_session (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY fk_ai_message (message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
  INDEX idx_session_id (session_id),
  INDEX idx_contact_id (contact_id),
  INDEX idx_intent (intent),
  INDEX idx_created_at (created_at)
);

-- Chatbot configuration per tenant
CREATE TABLE IF NOT EXISTS chatbot_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT TRUE,
  ai_provider VARCHAR(50) DEFAULT 'openai', -- openai, google, anthropic
  ai_model VARCHAR(100) DEFAULT 'gpt-4', -- Model name
  ai_temperature DECIMAL(3,2) DEFAULT 0.7,
  system_prompt TEXT, -- Custom system prompt
  welcome_message TEXT,
  escalation_enabled BOOLEAN DEFAULT TRUE,
  voice_enabled BOOLEAN DEFAULT TRUE,
  conference_integration JSON, -- Provider-specific config
  settings JSON, -- Additional settings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_config_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

