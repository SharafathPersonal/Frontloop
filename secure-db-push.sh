#!/usr/bin/env bash
set -e
set +x

ENV_FILE=".env.local"
DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | tr -d ' ' | xargs)

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL not found in $ENV_FILE."
  exit 1
fi

echo "Running supabase db push..."
npx supabase db push --db-url "$DB_URL"
