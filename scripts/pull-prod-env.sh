#!/bin/sh
# Pull the production secrets this repo's tooling needs into .env.pulled
# (gitignored): the Supabase service-role key + URL for cohort-resources
# uploads/inserts, and the Vercel Blob token for recording uploads.
#
# Only appends a key if it isn't already present, so it's safe to re-run.
# Usage: sh scripts/pull-prod-env.sh
set -e
cd "$(dirname "$0")/.."
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
vercel env pull "$TMP" --environment=production --yes >/dev/null 2>&1
for K in SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL BLOB_READ_WRITE_TOKEN; do
  V="$(sed -n "s/^$K=\"\{0,1\}\([^\"]*\)\"\{0,1\}\$/\1/p" "$TMP")"
  V="${V%\\n}"   # vercel encodes values with a trailing literal \n
  if [ -n "$V" ] && ! grep -q "^$K=" .env.pulled 2>/dev/null; then
    printf '%s=%s\n' "$K" "$V" >> .env.pulled
    echo "added $K to .env.pulled"
  else
    echo "$K already present or empty — skipped"
  fi
done
