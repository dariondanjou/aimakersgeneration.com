// Load a session's per-student mentor feedback into public.student_feedback —
// the "Mentor Feedback" panel each student sees on their own profile, and the
// feedback block in that week's homework email (send-film-welcome.mjs).
//
// Feedback is personal and stays out of the repo: it lives in a JSON file next
// to the session's recording and transcript, and is written here with the
// Supabase service role (the table is read-only to clients). Rows upsert on
// (student_id, week), so re-running updates in place.
//
// JSON shape:
//   { "cohort": "october-2026-film", "week": 3, "session_date": "2026-10-17",
//     "given_by": "Darion D'Anjou & Gheri Thomas",
//     "students": [ { "slug": "abdou", "project": "…", "recording_at": "0:12:30",
//                     "working": "…", "notes": ["…", "…"], "next_step": "…" } ] }
//
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.pulled (see
// scripts/pull-prod-env.sh) or the environment.
//
// Usage: node scripts/add-student-feedback.mjs /path/to/week-3-student-feedback.json [--dry-run]

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(name) {
  if (!existsSync(name)) return;
  for (const line of readFileSync(name, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i < 1 || line.startsWith('#')) continue;
    const k = line.slice(0, i).trim();
    if (process.env[k] != null) continue;
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    v = v.split('\\n').join('').trim();
    process.env[k] = v;
  }
}
loadEnv('.env.pulled'); loadEnv('.env.local');

const file = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!file || !existsSync(file)) { console.error('Usage: node scripts/add-student-feedback.mjs <feedback.json> [--dry-run]'); process.exit(1); }

const URL = process.env.SUPABASE_URL || 'https://xnejbxdvqmzlaljkgwaf.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing. Run: sh scripts/pull-prod-env.sh'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const doc = JSON.parse(readFileSync(file, 'utf8'));
if (!doc.cohort || !doc.week || !Array.isArray(doc.students)) { console.error('JSON needs cohort, week and students[]'); process.exit(1); }

const { data: roster, error: rErr } = await sb.from('students').select('id, slug, full_name').eq('cohort', doc.cohort);
if (rErr) { console.error('roster lookup failed:', rErr.message); process.exit(1); }
const bySlug = new Map(roster.map((s) => [s.slug, s]));

let failed = 0;
for (const f of doc.students) {
  const s = bySlug.get(f.slug);
  if (!s) { console.error(`no ${doc.cohort} student with slug "${f.slug}" — skipped`); failed++; continue; }
  const row = {
    student_id: s.id,
    week: Number(doc.week),
    session_date: doc.session_date || null,
    project: f.project || null,
    recording_at: f.recording_at || null,
    working: f.working || null,
    notes: f.notes || [],
    next_step: f.next_step || null,
    given_by: f.given_by || doc.given_by || null,
  };
  if (dryRun) { console.log(`would write  week ${row.week} · ${s.full_name.padEnd(24)} ${row.notes.length} notes`); continue; }
  const { error } = await sb.from('student_feedback').upsert(row, { onConflict: 'student_id,week' });
  if (error) { console.error(`FAILED ${s.full_name}: ${error.message}`); failed++; continue; }
  console.log(`student_feedback ✓  week ${row.week} · ${s.full_name} · ${row.notes.length} notes`);
}
if (failed) process.exit(1);
