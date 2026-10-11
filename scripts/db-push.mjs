// Apply pending SQL migrations to the Supabase Postgres database — a thin
// wrapper around `supabase db push`.
//
// `supabase db push --db-url <uri>` connects straight to Postgres with a
// connection string, so it needs no interactive `supabase login` and no linked
// project — it just diffs supabase/migrations/ against the remote ledger
// (supabase_migrations.schema_migrations) and applies whatever is missing.
//
// The connection string (a direct Postgres URI, NOT the REST anon/service key —
// those cannot run GRANT/DDL) is read from SUPABASE_DB_URL in the environment,
// else from .env.pulled / .env.local. Get it from the Supabase dashboard:
//   Project Settings → Database → Connection string → URI (percent-encoded).
// Both .env.pulled and .env*.local are gitignored, so the secret never commits.
//
// Usage:
//   npm run db:push              apply every pending migration
//   npm run db:push -- --dry-run list what would run, change nothing

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Pull KEY=value pairs from a dotenv file without overwriting the real env.
function loadEnvFile(name) {
  const path = join(ROOT, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i < 1 || line.startsWith('#')) continue;
    const key = line.slice(0, i).trim();
    if (process.env[key] != null) continue;
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[key] = v;
  }
}
loadEnvFile('.env.pulled');
loadEnvFile('.env.local');

const DB_URL = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!DB_URL) {
  console.error(
    'No database URL. Set SUPABASE_DB_URL (a postgresql:// URI) in .env.pulled\n' +
    '(or the environment). Supabase dashboard → Project Settings → Database →\n' +
    'Connection string → URI. This is a direct Postgres connection, not the\n' +
    'REST anon/service key — those cannot run GRANT/DDL.'
  );
  process.exit(1);
}

// Pass through flags the caller gave (e.g. --dry-run); default to non-interactive.
const passthrough = process.argv.slice(2);
const args = ['db', 'push', '--db-url', DB_URL, '--yes', ...passthrough];

// Never print the URL (it embeds the password).
console.log(`supabase db push --db-url <SUPABASE_DB_URL> ${passthrough.join(' ')}`.trim());
const res = spawnSync('supabase', args, { stdio: 'inherit' });
if (res.error) {
  if (res.error.code === 'ENOENT') {
    console.error('\nSupabase CLI not found. Install it: brew install supabase/tap/supabase');
    process.exit(127);
  }
  throw res.error;
}
process.exit(res.status ?? 1);
