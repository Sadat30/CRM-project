USE simplecrm;

-- Clear existing data (optional - comment out if you want to keep existing data)
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE activity_timeline;
-- TRUNCATE TABLE contact_relationships;
-- TRUNCATE TABLE contact_custom_fields;
-- TRUNCATE TABLE deals;
-- TRUNCATE TABLE tasks;
-- TRUNCATE TABLE tickets;
-- TRUNCATE TABLE contacts;
-- TRUNCATE TABLE users;
-- SET FOREIGN_KEY_CHECKS = 1;

-- Insert Users (skip if already exist)
INSERT IGNORE INTO users (full_name, username, email, password_hash, phone, role) VALUES
('John Admin', 'jadmin', 'admin@simplecrm.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', '+1-555-0101', 'admin'),
('Sarah Sales', 'ssales', 'sarah@simplecrm.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', '+1-555-0102', 'sales'),
('Mike Manager', 'mmanager', 'mike@simplecrm.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', '+1-555-0103', 'sales'),
('Alice Customer', 'acustomer', 'alice@customer.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', '+1-555-0201', 'customer'),
('Bob Client', 'bclient', 'bob@client.com', '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', '+1-555-0202', 'customer');

-- Note: Password hash is for 'password123' - you can change this later
-- To generate new hash: node -e "const bcrypt=require('bcrypt');bcrypt.hash('password123',10).then(h=>console.log(h))"

-- Insert Contacts
INSERT IGNORE INTO contacts (user_id, name, company, phone, email, job_title, dob, notes, tags) VALUES
(2, 'David Johnson', 'TechCorp Inc', '+1-555-1001', 'david.johnson@techcorp.com', 'CTO', '1980-05-15', 'Interested in enterprise solution. Very responsive to emails.', 'enterprise,hot-lead,decision-maker'),
(2, 'Emily Chen', 'StartupXYZ', '+1-555-1002', 'emily@startupxyz.com', 'Founder', '1990-08-22', 'Early stage startup. Budget conscious but high growth potential.', 'startup,small-business'),
(3, 'Robert Williams', 'Global Industries', '+1-555-1003', 'r.williams@globalind.com', 'VP of Sales', '1975-03-10', 'Large enterprise account. Multiple decision makers involved.', 'enterprise,large-account'),
(2, 'Lisa Anderson', 'Digital Solutions LLC', '+1-555-1004', 'lisa@digitalsolutions.com', 'Marketing Director', '1985-11-30', 'Looking for marketing automation tools.', 'marketing,mid-market'),
(3, 'Michael Brown', 'FinanceFirst', '+1-555-1005', 'm.brown@financefirst.com', 'CFO', '1978-07-18', 'Financial services company. Security and compliance are top priorities.', 'finance,enterprise,security'),
(2, 'Jennifer Davis', 'RetailMax', '+1-555-1006', 'jennifer@retailmax.com', 'Operations Manager', '1992-01-25', 'Retail chain with 50+ locations. Needs scalable solution.', 'retail,multi-location'),
(3, 'James Wilson', 'ManufacturingPro', '+1-555-1007', 'james@manufacturingpro.com', 'IT Director', '1982-09-12', 'Manufacturing company. Integration with ERP systems required.', 'manufacturing,erp-integration'),
(2, 'Patricia Martinez', 'HealthcarePlus', '+1-555-1008', 'patricia@healthcareplus.com', 'Administrator', '1987-04-05', 'Healthcare provider. HIPAA compliance essential.', 'healthcare,compliance,hipaa');

-- Insert Custom Fields for Contacts (delete existing first to avoid duplicates)
DELETE FROM contact_custom_fields WHERE contact_id IN (1,2,3,4,5,6,7,8);
INSERT INTO contact_custom_fields (contact_id, field_name, field_value, field_type) VALUES
(1, 'Annual Revenue', '5000000', 'number'),
(1, 'Company Size', '150', 'number'),
(1, 'LinkedIn Profile', 'https://linkedin.com/in/davidjohnson', 'url'),
(2, 'Funding Stage', 'Series A', 'text'),
(2, 'Team Size', '25', 'number'),
(3, 'Annual Revenue', '50000000', 'number'),
(3, 'Company Size', '500', 'number'),
(4, 'Marketing Budget', '250000', 'number'),
(5, 'Compliance Certifications', 'SOC2, ISO27001', 'text'),
(6, 'Store Locations', '52', 'number'),
(7, 'ERP System', 'SAP', 'text'),
(8, 'Patient Records', '100000', 'number');

-- Insert Contact Relationships
DELETE FROM contact_relationships WHERE contact_id IN (1,2,3,5,7);
INSERT INTO contact_relationships (contact_id, related_contact_id, relationship_type, notes) VALUES
(1, 3, 'partner', 'Both companies collaborate on enterprise solutions'),
(2, 4, 'partner', 'StartupXYZ uses Digital Solutions for marketing'),
(5, 7, 'parent_company', 'FinanceFirst acquired ManufacturingPro last year'),
(3, 1, 'colleague', 'Attend same industry conferences');

-- Insert Deals
INSERT IGNORE INTO deals (title, contact_id, stage, value, probability, close_date, owner_id, stage_order) VALUES
('Enterprise CRM Implementation', 1, 'Proposal', 50000.00, 75, '2024-02-15', 2, 4),
('Startup Growth Package', 2, 'Qualified', 15000.00, 60, '2024-03-01', 2, 3),
('Global Industries Enterprise Deal', 3, 'Negotiation', 120000.00, 85, '2024-01-30', 3, 5),
('Marketing Automation Suite', 4, 'Contacted', 25000.00, 40, '2024-03-15', 2, 2),
('FinanceFirst Security Package', 5, 'Closed Won', 75000.00, 100, '2024-01-10', 3, 6),
('RetailMax Multi-Location Setup', 6, 'New', 35000.00, 30, '2024-04-01', 2, 1),
('Manufacturing ERP Integration', 7, 'Proposal', 60000.00, 70, '2024-02-20', 3, 4),
('HealthcarePlus HIPAA Compliance', 8, 'Qualified', 45000.00, 55, '2024-03-10', 2, 3);

-- Insert Tasks
INSERT IGNORE INTO tasks (title, type, due_date, assigned_to, contact_id, description, priority, completed) VALUES
('Follow up with David on proposal', 'call', '2024-01-20 14:00:00', 2, 1, 'Discuss pricing and implementation timeline', 'high', FALSE),
('Send contract to Global Industries', 'email', '2024-01-18 10:00:00', 3, 3, 'Final contract review and signature', 'high', FALSE),
('Demo for StartupXYZ', 'meeting', '2024-01-22 15:00:00', 2, 2, 'Product demonstration and Q&A session', 'medium', FALSE),
('Research HealthcarePlus requirements', 'note', '2024-01-19 12:00:00', 2, 8, 'Review HIPAA compliance requirements', 'high', FALSE),
('Schedule call with Emily', 'call', '2024-01-21 11:00:00', 2, 2, 'Discuss budget and next steps', 'medium', FALSE),
('Send proposal to Lisa', 'email', '2024-01-20 09:00:00', 2, 4, 'Marketing automation proposal', 'medium', TRUE),
('Onboarding call with FinanceFirst', 'call', '2024-01-17 13:00:00', 3, 5, 'Kickoff meeting for new client', 'high', TRUE),
('Review ManufacturingPro integration specs', 'note', '2024-01-23 16:00:00', 3, 7, 'Technical review of ERP integration requirements', 'high', FALSE);

-- Insert Tickets
INSERT IGNORE INTO tickets (customer_id, title, description, status, priority, workflow_stage, assigned_to, sla_due_date) VALUES
(4, 'Unable to export contacts', 'Getting error when trying to export contacts to CSV. Error message: "Permission denied"', 'open', 'medium', 'open', 2, DATE_ADD(NOW(), INTERVAL 72 HOUR)),
(4, 'Feature request: Bulk email', 'Would like to send bulk emails to contact lists. Is this feature available?', 'in_progress', 'low', 'in_progress', 2, DATE_ADD(NOW(), INTERVAL 48 HOUR)),
(5, 'Integration not working', 'The API integration with our system stopped working yesterday. Getting 500 errors.', 'open', 'urgent', 'open', 3, DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(5, 'Password reset not working', 'Tried to reset password but email never arrived. Checked spam folder.', 'closed', 'medium', 'closed', 2, DATE_ADD(NOW(), INTERVAL -24 HOUR)),
(6, 'Need help with custom fields', 'How do I add custom fields to contacts? Can\'t find the option in the UI.', 'open', 'low', 'open', 2, DATE_ADD(NOW(), INTERVAL 72 HOUR)),
(6, 'Report generation slow', 'Reports are taking 5+ minutes to generate. This is affecting our workflow.', 'in_progress', 'high', 'in_progress', 3, DATE_ADD(NOW(), INTERVAL 36 HOUR));

-- Insert Activity Timeline (clear existing for seeded contacts first)
DELETE FROM activity_timeline WHERE contact_id IN (1,2,3,4,5) OR deal_id IN (1,2,3,4,5) OR ticket_id IN (1,3,4,5,6);
INSERT INTO activity_timeline (contact_id, deal_id, ticket_id, user_id, activity_type, title, description, metadata) VALUES
(1, 1, NULL, 2, 'deal_created', 'Deal created: Enterprise CRM Implementation', 'New deal created with value $50,000', '{"value": 50000}'),
(1, 1, NULL, 2, 'call', 'Call with David Johnson', 'Discussed proposal details and timeline. Very positive response.', NULL),
(2, 2, NULL, 2, 'deal_created', 'Deal created: Startup Growth Package', 'New deal created with value $15,000', '{"value": 15000}'),
(2, 2, NULL, 2, 'meeting', 'Demo scheduled for StartupXYZ', 'Product demonstration scheduled for next week', NULL),
(3, 3, NULL, 3, 'deal_created', 'Deal created: Global Industries Enterprise Deal', 'New deal created with value $120,000', '{"value": 120000}'),
(3, 3, NULL, 3, 'email', 'Contract sent to Global Industries', 'Final contract sent for review and signature', NULL),
(4, 4, NULL, 2, 'deal_created', 'Deal created: Marketing Automation Suite', 'New deal created with value $25,000', '{"value": 25000}'),
(5, 5, NULL, 3, 'deal_created', 'Deal created: FinanceFirst Security Package', 'New deal created with value $75,000', '{"value": 75000}'),
(5, 5, NULL, 3, 'deal_updated', 'Deal stage changed: FinanceFirst Security Package', 'Deal moved from "Negotiation" to "Closed Won"', '{"old_stage": "Negotiation", "new_stage": "Closed Won"}'),
(4, NULL, 1, 2, 'ticket_created', 'Ticket created: Unable to export contacts', 'New support ticket created', NULL),
(5, NULL, 3, 3, 'ticket_created', 'Ticket created: Integration not working', 'Urgent ticket - API integration issue', NULL),
(1, NULL, NULL, 2, 'contact_created', 'Contact created: David Johnson', 'New contact added to system', NULL),
(2, NULL, NULL, 2, 'contact_created', 'Contact created: Emily Chen', 'New contact added to system', NULL),
(3, NULL, NULL, 3, 'contact_created', 'Contact created: Robert Williams', 'New contact added to system', NULL);

-- Insert Knowledge Base Articles
INSERT IGNORE INTO knowledge_base (title, content, category, tags, created_by, views, helpful_count) VALUES
('How to Import Contacts from CSV', 'To import contacts from a CSV file:\n\n1. Navigate to the Import page\n2. Click "Upload CSV File"\n3. Select your CSV file (must have columns: Name, Email, Phone, Company)\n4. Click "Start Import"\n5. Wait for the import to complete\n\nYour contacts will be imported and you can view them on the Contacts page.', 'Getting Started', 'import,csv,contacts', 1, 45, 12),
('Setting Up Custom Fields', 'Custom fields allow you to store additional information about your contacts:\n\n1. Go to Contacts page\n2. Click on a contact or create a new one\n3. Scroll to the "Custom Fields" section\n4. Click "Add Field"\n5. Enter field name, select type, and enter value\n6. Click "Save"\n\nCustom fields can be of type: text, number, date, email, phone, URL, or textarea.', 'Features', 'custom-fields,contacts', 1, 32, 8),
('Managing Your Sales Pipeline', 'The sales pipeline helps you track deals through different stages:\n\n1. View all deals on the Deals page\n2. Drag and drop deals between stages\n3. Click on a deal to edit details\n4. Update value, probability, and close date\n5. Track progress in the activity timeline\n\nYou can customize pipeline stages in the Pipeline Settings.', 'Sales', 'pipeline,deals,sales', 1, 28, 10),
('Creating and Managing Tickets', 'Support tickets help you track customer issues:\n\n1. Go to Tickets page\n2. Click "New Ticket"\n3. Select customer, enter title and description\n4. Set priority and workflow stage\n5. Assign to team member\n6. Update status as you work on the issue\n\nTickets have SLA tracking and activity timeline.', 'Support', 'tickets,support,help', 1, 19, 5),
('Understanding Activity Timeline', 'The activity timeline shows all interactions with a contact:\n\n- Calls, meetings, emails\n- Deal updates\n- Ticket creation and updates\n- Contact changes\n\nView timeline by clicking on any contact and scrolling to the Activity Timeline section. This gives you a complete history of all interactions.', 'Features', 'timeline,activity,history', 1, 15, 4),
('Bulk Operations Guide', 'You can perform bulk operations on contacts:\n\n1. Use the search to filter contacts\n2. Select multiple contacts\n3. Apply tags or update fields in bulk\n4. Export filtered results\n\nBulk import is available on the Import page for adding many contacts at once.', 'Features', 'bulk,import,export', 1, 22, 7);

-- Update some deals with custom properties (JSON)
UPDATE deals SET custom_properties = '{"contract_type": "annual", "payment_terms": "net_30", "discount": 10}' WHERE id = 1;
UPDATE deals SET custom_properties = '{"contract_type": "monthly", "trial_period": 30}' WHERE id = 2;
UPDATE deals SET custom_properties = '{"contract_type": "multi-year", "payment_terms": "net_60", "discount": 15, "implementation_fee": 10000}' WHERE id = 3;

-- Insert some additional pipeline stages (if you want more than defaults)
INSERT INTO pipeline_stages (name, display_order, color, is_default) VALUES
('Qualification', 2, '#8B5CF6', FALSE),
('Discovery', 3, '#EC4899', FALSE)
ON DUPLICATE KEY UPDATE name=name;

