// Send the October 2026 Film Cohort welcome email to everyone on the roster.
//
// Usage (needs .env.pulled from `vercel env pull .env.pulled`):
//   node scripts/send-film-welcome.mjs                 → dry run: list recipients, send nothing
//   node scripts/send-film-welcome.mjs --test <email>  → send one copy (rendered for the first student) to <email>
//   node scripts/send-film-welcome.mjs --send          → send to every film-cohort student with an email
//
// Each student gets their own copy (first name + profile link), sent through
// the send-email edge function's service-role-only `cohort_welcome` action.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { renderWelcomeEmail } from "../emails/render.mjs";

const SUPABASE_URL = "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const COHORT = "october-2026-film";
const SUBJECT = "Welcome to the Film Cohort — today, 1:00 PM at RICE";

const env = {};
for (const line of readFileSync(".env.pulled", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 1 || line.startsWith("#")) continue;
  let v = line.slice(i + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.split("\\n").join("").trim();
  env[line.slice(0, i).trim()] = v;
}
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing from .env.pulled");

const sb = createClient(SUPABASE_URL, KEY);
const { data: students, error } = await sb
  .from("students")
  .select("full_name, slug, email")
  .eq("cohort", COHORT)
  .order("sort_order")
  .order("full_name");
if (error) throw error;

const firstName = (s) => (s.full_name || "").trim().split(/\s+/)[0] || "there";
const withEmail = students.filter((s) => s.email);
const missing = students.filter((s) => !s.email);

console.log(`${COHORT}: ${students.length} students, ${withEmail.length} with an email`);
for (const s of withEmail) console.log(`  ${s.full_name.padEnd(28)} ${s.email.padEnd(36)} /students/${s.slug}`);
for (const s of missing) console.log(`  ${s.full_name.padEnd(28)} (no email — skipped)`);

async function send(to, s) {
  const html = renderWelcomeEmail({ firstName: firstName(s), slug: s.slug, file: "film-welcome-email.html" });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cohort_welcome", to, subject: SUBJECT, html }),
  });
  const body = await res.text();
  console.log(`${res.ok ? "sent  " : "FAILED"} ${to}${res.ok ? "" : ` — ${res.status} ${body}`}`);
  return res.ok;
}

const testIdx = process.argv.indexOf("--test");
if (testIdx > -1) {
  const to = process.argv[testIdx + 1];
  if (!to || !withEmail.length) throw new Error("--test needs an address and at least one student");
  await send(to, withEmail[0]);
} else if (process.argv.includes("--send")) {
  let failed = 0;
  for (const s of withEmail) if (!(await send(s.email, s))) failed++;
  console.log(`done: ${withEmail.length - failed} sent, ${failed} failed`);
} else {
  console.log("\nDry run — nothing sent. Re-run with --test <email> or --send.");
}
