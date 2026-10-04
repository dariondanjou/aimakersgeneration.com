#!/bin/sh
# Send an October 2026 Film Cohort email (all students + one copy to
# Darion and Gheri), fetching the service-role key with the Supabase CLI login.
# Usage: sh scripts/send-film-welcome.sh --email hw1          → dry run (list recipients)
#        sh scripts/send-film-welcome.sh --email hw1 --send   → send
set -e
cd "$(dirname "$0")/.."
SUPABASE_SERVICE_ROLE_KEY="$(npx supabase@latest projects api-keys --project-ref xnejbxdvqmzlaljkgwaf -o json 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const k=JSON.parse(s);const r=(Array.isArray(k)?k:k.keys||[]).find(x=>x.name==="service_role");console.log(r?r.api_key:"")})')"
export SUPABASE_SERVICE_ROLE_KEY
exec node scripts/send-film-welcome.mjs "$@"
