#!/usr/bin/env bash
set -e
set +x

ENV_FILE=".env.local"
DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | tr -d ' ' | xargs)

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL not found in $ENV_FILE."
  exit 1
fi

echo "Temporarily moving the repair migration out of the folder..."
mv supabase/migrations/20260701000008_migration_flash_offers_repair.sql ./20260701000008_migration_flash_offers_repair.sql

echo "Baselining all other migrations as already applied on the remote DB..."
npx supabase db remote commit --db-url "$DB_URL"

echo "Moving the repair migration back into the folder..."
mv ./20260701000008_migration_flash_offers_repair.sql supabase/migrations/20260701000008_migration_flash_offers_repair.sql

echo "Pushing the repair migration..."
npx supabase db push --db-url "$DB_URL"

echo "Done!"
