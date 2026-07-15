#!/usr/bin/env bash
set -e
set +x

ENV_FILE=".env.local"
DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | tr -d ' ' | xargs)

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL not found in $ENV_FILE."
  exit 1
fi

echo "Repairing migration history..."
# Extract the repair commands from error.log, append the DB URL, prepend npx, and run them
grep "supabase migration repair" error.log | while read -r line; do
  cmd="npx $line --db-url \"$DB_URL\""
  echo "Running: $cmd"
  eval "$cmd"
done

echo "Moving the repair migration back into the folder..."
mv ./20260701000008_migration_flash_offers_repair.sql supabase/migrations/20260701000008_migration_flash_offers_repair.sql || true

echo "Pushing the final repair migration..."
npx supabase db push --db-url "$DB_URL"

echo "Done!"
