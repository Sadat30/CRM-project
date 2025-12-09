CREATE DATABASE IF NOT EXISTS simplecrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE simplecrm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  role ENUM('admin','customer','sales') DEFAULT 'customer',
  google_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  job_title VARCHAR(255),
  dob DATE,
  notes TEXT,
  tags VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT,
  stage ENUM('new','contacted','interested','closed') DEFAULT 'new',
  assigned_to INT,
  expected_value DECIMAL(12,2) DEFAULT 0,
  probability INT DEFAULT 0,
  close_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  contact_id INT,
  stage VARCHAR(100),
  value DECIMAL(12,2),
  probability INT,
  close_date DATE,
  owner_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  type ENUM('call','meeting','email','note','other') DEFAULT 'note',
  due_date DATETIME,
  assigned_to INT,
  contact_id INT,
  completed BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  title VARCHAR(255),
  description TEXT,
  status ENUM('open','in_progress','closed') DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_email VARCHAR(255),
  to_email VARCHAR(255),
  subject VARCHAR(255),
  body TEXT,
  raw_payload LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255),
  meta JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table to store OAuth tokens per user for Google APIs
CREATE TABLE IF NOT EXISTS google_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider VARCHAR(50) DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  scope TEXT,
  token_type VARCHAR(50),
  expiry_date BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
