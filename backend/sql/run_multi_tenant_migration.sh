#!/bin/bash
# Run this script to apply multi-tenant schema changes
# Usage: ./run_multi_tenant_migration.sh

echo "Applying multi-tenant schema migration..."

# Read MySQL credentials from environment or use defaults
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-root}
DB_NAME=${DB_NAME:-simplecrm}

# Run the migration SQL file
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$(dirname "$0")/multi_tenant_schema.sql"

if [ $? -eq 0 ]; then
  echo "✓ Multi-tenant schema migration completed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Create a super admin user (manually set is_super_admin=1 in users table)"
  echo "2. Restart your backend server"
  echo "3. Login as super admin to create tenants"
else
  echo "✗ Migration failed. Please check the error messages above."
  exit 1
fi

