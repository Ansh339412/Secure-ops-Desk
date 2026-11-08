#!/usr/bin/env bash
# Fails if anything that looks like a credential is about to be committed.
#   npm run check:secrets
# Run it before your first push (CI runs it too).
set -uo pipefail
cd "$(dirname "$0")/.."

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  files=$(git ls-files --cached --others --exclude-standard)
else
  files=$(find . -type f -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' | sed 's|^\./||')
fi
files=$(echo "$files" | grep -v -e '^scripts/check-secrets.sh$' -e '^package-lock.json$' || true)

status=0

# 1. env files must never be tracked (the example file is allowed)
bad_env=$(echo "$files" | grep -E '(^|/)\.env' | grep -v -E '(^|/)\.env\.example$' || true)
if [[ -n "$bad_env" ]]; then
  echo "ERROR: env files would be committed:"; echo "$bad_env"; status=1
fi

# 2. key-like content
patterns='eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|sbp_[a-f0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{10,}'
hits=$(echo "$files" | xargs -r grep -InE "$patterns" 2>/dev/null || true)
if [[ -n "$hits" ]]; then
  echo "ERROR: possible credentials found:"; echo "$hits"; status=1
fi

# 3. a real Supabase URL baked into tracked files (placeholder.supabase.co and YOUR-PROJECT-REF are fine)
urls=$(echo "$files" | xargs -r grep -InE 'https://[a-z0-9]{20}\.supabase\.co' 2>/dev/null || true)
if [[ -n "$urls" ]]; then
  echo "ERROR: a real Supabase project URL is hard-coded:"; echo "$urls"; status=1
fi

[[ $status -eq 0 ]] && echo "OK: no secrets found in $(echo "$files" | wc -l) files."
exit $status
