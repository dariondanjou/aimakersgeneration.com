// Add (or update) a row in public.cohort_resources — the session materials
// shown on /students (recordings, handout PDFs). Uses the Supabase service
// role, so it both uploads a PDF to the private `cohort-materials` bucket and
// writes the row (RLS is service-role-only on that table and bucket).
//
// Video rows point at an already-uploaded Vercel Blob URL (--blob-url); PDF
// rows upload a local file to the private bucket (--pdf) and store its path.
// Rows upsert on (cohort, week, title), so re-running updates in place.
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.pulled (see
// scripts/pull-prod-env.sh) or the environment. Never commit those.
//
// Examples:
//   node scripts/add-cohort-resource.mjs --cohort october-2026-film --week 2 \
//     --sort 0 --kind video --title "Session 2 Recording" \
//     --thumb /materials/october-2026-film/week-2/session-2-recording.jpg \
//     --meta "3h 32m · Oct 10" --description "..." --blob-url "https://…/session-2.mp4"
//
//   node scripts/add-cohort-resource.mjs --cohort october-2026-film --week 2 \
//     --sort 2 --kind pdf --title "Shot-List Example — True Romance" \
//     --thumb /materials/october-2026-film/week-2/week-2-shot-list-example.jpg \
//     --description "…" --pdf "/path/True_Romance_Scene_001_Shot_List.pdf"

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(name) {
  if (!existsSync(name)) return;
  for (const line of readFileSync(name, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i < 1 || line.startsWith('#')) continue;
    const k = line.slice(0, i).trim();
    if (process.env[k] != null) continue;
    // Vercel's env pull encodes values with a trailing literal "\n" and may
    // wrap them in quotes — strip both (matches scripts/send-film-welcome.mjs).
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    v = v.split('\\n').join('').trim();
    process.env[k] = v;
  }
}
loadEnv('.env.pulled'); loadEnv('.env.local');

// --flag value / --flag=value
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  let a = process.argv[i];
  if (!a.startsWith('--')) continue;
  a = a.slice(2);
  const eq = a.indexOf('=');
  if (eq >= 0) { args[a.slice(0, eq)] = a.slice(eq + 1); }
  else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) { args[a] = process.argv[++i]; }
  else { args[a] = true; }
}

const URL = process.env.SUPABASE_URL || 'https://xnejbxdvqmzlaljkgwaf.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing. Run: sh scripts/pull-prod-env.sh'); process.exit(1); }

const required = ['cohort', 'week', 'kind', 'title'];
for (const r of required) if (!args[r]) { console.error(`--${r} is required`); process.exit(1); }
if (args.kind !== 'video' && args.kind !== 'pdf') { console.error("--kind must be 'video' or 'pdf'"); process.exit(1); }

const BUCKET = 'cohort-materials';
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

let blob_url = args['blob-url'] || null;
let storage_path = args['storage-path'] || null;

if (args.kind === 'pdf') {
  if (!args.pdf && !storage_path) { console.error('pdf rows need --pdf <localfile> (or --storage-path to an existing object)'); process.exit(1); }
  if (args.pdf) {
    if (!existsSync(args.pdf)) { console.error(`file not found: ${args.pdf}`); process.exit(1); }
    storage_path = storage_path || `${args.cohort}/week-${args.week}/${basename(args.pdf)}`;
    const buf = readFileSync(args.pdf);
    const { error } = await sb.storage.from(BUCKET).upload(storage_path, buf, { contentType: 'application/pdf', upsert: true });
    if (error) { console.error('upload failed:', error.message); process.exit(1); }
    console.log(`uploaded ${args.pdf} → ${BUCKET}/${storage_path}`);
  }
  blob_url = null;
} else {
  if (!blob_url) { console.error('video rows need --blob-url <url>'); process.exit(1); }
  storage_path = null;
}

const row = {
  cohort: args.cohort,
  week: Number(args.week),
  sort_order: args.sort != null ? Number(args.sort) : 0,
  kind: args.kind,
  title: args.title,
  description: args.description || null,
  meta: args.meta || null,
  thumb: args.thumb || null,
  blob_url,
  storage_path,
};

const { error } = await sb.from('cohort_resources').upsert(row, { onConflict: 'cohort,week,title' });
if (error) { console.error('insert failed:', error.message); process.exit(1); }
console.log(`cohort_resources ✓  ${row.cohort} · week ${row.week} · [${row.kind}] ${row.title}`);
