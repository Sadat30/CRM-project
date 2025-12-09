#!/bin/bash
# Run this script to seed all users with known credentials
# Usage: ./run_user_seeder.sh

echo "Seeding users with known credentials..."

# Read MySQL credentials from environment or use defaults
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-root}
DB_NAME=${DB_NAME:-simplecrm}

# Run the user seeder SQL file
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$(dirname "$0")/seed_users.sql"

if [ $? -eq 0 ]; then
  echo "✓ User seeder completed successfully!"
  echo ""
  echo "Created users:"
  echo "  - 1 Super Admin (superadmin@simplecrm.com / superadmin123)"
  echo "  - 4 Admin users (one per tenant, password: admin123)"
  echo "  - 2 Sales users (Default Tenant, password: customer123)"
  echo "  - 8 Customer users (2 per tenant, password: customer123)"
  echo ""
  echo "See USER_CREDENTIALS.md for complete list of credentials"
else
  echo "✗ Seeder failed. Please check the error messages above."
  exit 1
fi

