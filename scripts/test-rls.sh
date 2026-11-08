#!/usr/bin/env bash
# Applies the migration and runs the RLS suite against a Postgres database.
#
#   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres bash scripts/test-rls.sh --stub
#
# --stub  : create a minimal auth schema first (plain Postgres / CI). Omit it for `supabase start`,
#           whose database already has the real auth schema. The target database must be disposable.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a disposable Postgres database}"
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--stub" ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f tests/integration/auth-stub.sql
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/migrations/20260101000000_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/integration/rls.sql 2>&1 | tee /tmp/rls-output.txt
echo "RLS scenarios passed: $(grep -c 'PASS:' /tmp/rls-output.txt)"
