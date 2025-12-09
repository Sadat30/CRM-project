# User Credentials Reference

This document lists all pre-seeded users and their credentials for testing the multi-tenant SimpleCRM system.

## 🔑 Super Admin

**Full Access to All Tenants**

| Email | Password | Role | Tenant |
|-------|----------|------|--------|
| `superadmin@simplecrm.com` | `superadmin123` | admin | All (Super Admin) |

**Capabilities:**
- Can view and manage all tenants
- Can create/edit/delete tenants
- Can view all data across all tenants
- Access tenant management UI at `/tenants`

---

## 👔 Admin Users (One per Tenant)

**Full Access to Their Tenant Only**

| Email | Password | Role | Tenant | Tenant Slug |
|-------|----------|------|--------|-------------|
| `admin@default.com` | `admin123` | admin | Default Tenant | `default` |
| `admin@acme.com` | `admin123` | admin | Acme Corporation | `acme-corp` |
| `admin@techstart.com` | `admin123` | admin | TechStart Inc | `techstart` |
| `admin@global.com` | `admin123` | admin | Global Solutions | `global-solutions` |

**Capabilities:**
- Can manage all data within their tenant
- Cannot access other tenants' data
- Cannot create/manage tenants (super admin only)

---

## 💼 Sales Users (Default Tenant)

| Email | Password | Role | Tenant | Tenant Slug |
|-------|----------|------|--------|-------------|
| `sales1@default.com` | `customer123` | sales | Default Tenant | `default` |
| `sales2@default.com` | `customer123` | sales | Default Tenant | `default` |

**Capabilities:**
- Can manage contacts, deals, tasks within their tenant
- Limited access compared to admins

---

## 👤 Customer Users

### Default Tenant

| Email | Password | Role | Tenant | Tenant Slug |
|-------|----------|------|--------|-------------|
| `customer1@default.com` | `customer123` | customer | Default Tenant | `default` |
| `customer2@default.com` | `customer123` | customer | Default Tenant | `default` |

### Acme Corporation

| Email | Password | Role | Tenant | Tenant Slug |
|-------|----------|------|--------|-------------|
| `customer1@acme.com` | `customer123` | customer | Acme Corporation | `acme-corp` |
| `customer2@acme.com` | `customer123` | customer | Acme Corporation | `acme-corp` |

### TechStart Inc

| Email | Password | Role | Tenant | Tenant Slug |
|-------|----------|------|--------|-------------|
| `customer1@techstart.com` | `customer123` | customer | TechStart Inc | `techstart` |
| `customer2@techstart.com` | `customer123` | customer | TechStart Inc | `techstart` |

### Global Solutions

| Email | Password | Role | Tenant | Tenant Slug |
|-------|----------|------|--------|-------------|
| `customer1@global.com` | `customer123` | customer | Global Solutions | `global-solutions` |
| `customer2@global.com` | `customer123` | customer | Global Solutions | `global-solutions` |

**Capabilities:**
- Basic access to view their own data
- Limited permissions within their tenant

---

## 🚀 Quick Test Scenarios

### Test Super Admin Access
1. Login as `superadmin@simplecrm.com` / `superadmin123`
2. Select any tenant (or leave blank to see all)
3. Navigate to `/tenants` to manage tenants
4. View data across all tenants

### Test Tenant Isolation
1. Login as `admin@acme.com` / `admin123` with tenant `acme-corp`
2. Create some contacts/deals
3. Logout and login as `admin@techstart.com` / `admin123` with tenant `techstart`
4. Verify you cannot see Acme's data

### Test Customer Access
1. Login as `customer1@acme.com` / `customer123` with tenant `acme-corp`
2. Verify limited access to Acme's data only

---

## 📝 Notes

- All passwords use bcrypt hashing (cost factor 10)
- Users are assigned to specific tenants
- Super admin has `tenant_id = NULL` and `is_super_admin = TRUE`
- Regular admins have `is_super_admin = FALSE` and belong to one tenant
- Tenant slugs are used in the login flow to identify which organization to log into

---

## 🔄 Running the Seeder

To create all these users, run:

```bash
mysql -u root -p simplecrm < backend/sql/seed_users.sql
```

Or use the migration script:

```bash
cd backend/sql
./run_multi_tenant_migration.sh
mysql -u root -p simplecrm < seed_users.sql
```

