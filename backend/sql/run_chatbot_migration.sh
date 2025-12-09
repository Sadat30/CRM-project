#!/bin/bash
# Run this script to apply chatbot schema changes
# Usage: ./run_chatbot_migration.sh

echo "Applying chatbot schema migration..."

# Read MySQL credentials from environment or use defaults
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-root}
DB_NAME=${DB_NAME:-simplecrm}

# Run the migration SQL file
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$(dirname "$0")/chatbot_schema.sql"

if [ $? -eq 0 ]; then
  echo "✓ Chatbot schema migration completed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Get Google Gemini API key from https://makersuite.google.com/app/apikey"
  echo "2. Add GOOGLE_AI_API_KEY to backend/.env"
  echo "3. Restart your backend server"
  echo "4. Navigate to /chatbot-demo in the frontend"
else
  echo "✗ Migration failed. Please check the error messages above."
  exit 1
fi

