// Send an October 2026 Film Cohort email to everyone on the roster.
//
// Usage (key from SUPABASE_SERVICE_ROLE_KEY or .env.pulled; see send-film-welcome.sh).
// --email picks the message: welcome | hw1 | hw2 | hw3 | bonus.
//   node scripts/send-film-welcome.mjs --email hw1                 → dry run: list recipients, send nothing
//   node scripts/send-film-welcome.mjs --email hw1 --test <email>  → send one copy (rendered for the first student,
//                                                                    or for --as <slug>) to <email>
//   node scripts/send-film-welcome.mjs --email hw1 --send          → send to every film-cohort student with an email,
//                                                                    plus one copy to Darion and Gheri
//   node scripts/send-film-welcome.mjs --email hw3 --preview <dir> → write every student's rendered email to <dir>, send nothing
//
// Each student gets their own copy (first name + profile link), sent through
// the send-email edge function's service-role-only `cohort_welcome` action.
//
// An email with `feedbackWeek` (hw3) also carries that student's mentor
// feedback from public.student_feedback (loaded with
// scripts/add-student-feedback.mjs), and cc's Darion and Gheri on every
// student's copy instead of sending them a separate one — so the founders see
// exactly what each student was told. A student with no feedback row for that
// week is listed in the dry run and skipped by --send.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderWelcomeEmail, escapeHtml } from "../emails/render.mjs";

const SUPABASE_URL = "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const COHORT = "october-2026-film";
const EMAILS = {
  welcome: { file: "film-welcome-email.html", subject: "Welcome to the Film Cohort — today, 1:00 PM at RICE" },
  hw1: { file: "film-hw1-email.html", subject: "Week 1 homework: your capstone + a 1-minute film made in ChatGPT" },
  hw2: { file: "film-hw2-email.html", subject: "Week 2 homework: a minute of capstone footage + a shot-list breakdown" },
  hw3: { file: "film-hw3-email.html", subject: "Week 3 homework: your final capstone (2 perfect minutes) + your Session 3 feedback", feedbackWeek: 3 },
  bonus: { file: "film-bonus-email.html", subject: "Week 3 Bonus Session with Steffin Flickinger: recording, summary & lesson guide" },
};
const emailIdx = process.argv.indexOf("--email");
const EMAIL = EMAILS[process.argv[emailIdx + 1]];
if (emailIdx < 0 || !EMAIL) throw new Error(`--email is required: ${Object.keys(EMAILS).join(" | ")}`);
// Gets one copy of the email alongside the student send.
const COPY_TO = ["dariondanjou@gmail.com", "thomasgheri@gmail.com"];

// The key comes from the environment if set, else from .env.pulled.
const env = {};
for (const line of (existsSync(".env.pulled") ? readFileSync(".env.pulled", "utf8") : "").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 1 || line.startsWith("#")) continue;
  let v = line.slice(i + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.split("\\n").join("").trim();
  env[line.slice(0, i).trim()] = v;
}
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set and missing from .env.pulled");

const sb = createClient(SUPABASE_URL, KEY);
const { data: students, error } = await sb
  .from("students")
  .select("full_name, slug, email")
  .eq("cohort", COHORT)
  .order("sort_order")
  .order("full_name");
if (error) throw error;

// The profile name for Kush is "DERRICK  (Kush)": greet people by the name in
// parentheses when there is one, else the first word, in title case.
const firstName = (s) => {
  const name = (s.full_name || "").trim();
  const raw = (name.match(/\(([^)]+)\)/) || [])[1] || name.split(/\s+/)[0] || "there";
  return raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : raw;
};
const withEmail = students.filter((s) => s.email);

// Per-student mentor feedback for emails that carry it.
const feedbackBySlug = new Map();
if (EMAIL.feedbackWeek) {
  const { data: rows, error: fErr } = await sb
    .from("student_feedback")
    .select("week, project, recording_at, working, notes, next_step, students!inner(slug, cohort)")
    .eq("week", EMAIL.feedbackWeek)
    .eq("students.cohort", COHORT);
  if (fErr) throw fErr;
  for (const r of rows) feedbackBySlug.set(r.students.slug, r);
}

// The feedback block for film-hw3-email.html: dark-card styles to match.
const F = "font-family:'Inter',Arial,sans-serif;";
function feedbackHtml(f) {
  const out = [];
  if (f.project) out.push(`<div style="${F} font-size:16px; font-weight:800; color:#FFFFFF; margin:0 0 4px 0;">${escapeHtml(f.project)}</div>`);
  if (f.recording_at) out.push(`<div style="${F} font-size:13px; color:#888888; margin:0 0 16px 0;">Watch it back in the Session 3 recording at ${escapeHtml(f.recording_at)}</div>`);
  if (f.working) {
    out.push(`<div style="${F} font-size:11px; font-weight:800; letter-spacing:0.12em; color:#CCFF00; text-transform:uppercase; margin:0 0 6px 0;">What&rsquo;s working</div>`);
    out.push(`<p style="margin:0 0 18px 0; ${F} font-size:15px; line-height:1.6; color:#CCCCCC;">${escapeHtml(f.working)}</p>`);
  }
  if (f.notes?.length) {
    out.push(`<div style="${F} font-size:11px; font-weight:800; letter-spacing:0.12em; color:#CCFF00; text-transform:uppercase; margin:0 0 10px 0;">${f.working ? "To take it to elite" : "Notes"}</div>`);
    out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0">');
    f.notes.forEach((n, i) => out.push(
      `<tr><td valign="top" width="28" style="padding:0 0 12px 0; ${F} font-size:15px; font-weight:900; color:#CCFF00; width:28px;">${i + 1}</td>` +
      `<td valign="top" style="padding:0 0 12px 0; ${F} font-size:15px; line-height:1.55; color:#CCCCCC;">${escapeHtml(n)}</td></tr>`));
    out.push("</table>");
  }
  if (f.next_step) out.push(`<p style="margin:6px 0 12px 0; padding:0 0 0 12px; border-left:3px solid #CCFF00; ${F} font-size:15px; line-height:1.55; color:#FFFFFF;"><strong>Your focus:</strong> ${escapeHtml(f.next_step)}</p>`);
  return out.join("\n");
}
const missing = students.filter((s) => !s.email);

console.log(`"${EMAIL.subject}"`);
console.log(`${COHORT}: ${students.length} students, ${withEmail.length} with an email`);
for (const s of withEmail) {
  const fb = EMAIL.feedbackWeek ? (feedbackBySlug.has(s.slug) ? `  feedback: ${feedbackBySlug.get(s.slug).notes.length} notes` : "  NO FEEDBACK — will be skipped") : "";
  console.log(`  ${s.full_name.padEnd(28)} ${s.email.padEnd(36)} /students/${s.slug}${fb}`);
}
if (EMAIL.feedbackWeek) console.log(`  cc on every student's copy: ${COPY_TO.join(", ")}`);
for (const s of missing) console.log(`  ${s.full_name.padEnd(28)} (no email — skipped)`);

// --preview <dir>: write each student's rendered email there instead of sending.
const previewIdx = process.argv.indexOf("--preview");
const PREVIEW_DIR = previewIdx > -1 ? process.argv[previewIdx + 1] : null;

async function send(to, s, cc) {
  const blocks = EMAIL.feedbackWeek ? { FEEDBACK_HTML: feedbackHtml(feedbackBySlug.get(s.slug)) } : {};
  const html = renderWelcomeEmail({ firstName: firstName(s), slug: s.slug, file: EMAIL.file, blocks });
  if (PREVIEW_DIR) {
    writeFileSync(join(PREVIEW_DIR, `${s.slug}.html`), html, "utf8");
    console.log(`wrote  ${join(PREVIEW_DIR, `${s.slug}.html`)} (to ${[].concat(to).join(", ")}${cc ? `, cc ${cc.join(", ")}` : ""})`);
    return true;
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cohort_welcome", to, cc, subject: EMAIL.subject, html }),
  });
  const body = await res.text();
  console.log(`${res.ok ? "sent  " : "FAILED"} ${[].concat(to).join(", ")}${cc ? ` (cc ${cc.join(", ")})` : ""}${res.ok ? "" : ` — ${res.status} ${body}`}`);
  return res.ok;
}

const testIdx = process.argv.indexOf("--test");
if (testIdx > -1) {
  const to = process.argv[testIdx + 1];
  if (!to || !withEmail.length) throw new Error("--test needs an address and at least one student");
  const asIdx = process.argv.indexOf("--as");
  const s = asIdx > -1 ? withEmail.find((x) => x.slug === process.argv[asIdx + 1]) : withEmail[0];
  if (!s) throw new Error(`--as: no student with slug "${process.argv[asIdx + 1]}"`);
  if (EMAIL.feedbackWeek && !feedbackBySlug.has(s.slug)) throw new Error(`no week ${EMAIL.feedbackWeek} feedback for ${s.slug}`);
  await send(to, s);
} else if (process.argv.includes("--send") || PREVIEW_DIR) {
  let failed = 0;
  if (EMAIL.feedbackWeek) {
    // Each student's own copy, with their feedback, cc'd to the founders.
    const ready = withEmail.filter((s) => feedbackBySlug.has(s.slug));
    for (const s of ready) if (!(await send(s.email, s, COPY_TO))) failed++;
    console.log(`done: ${ready.length - failed} of ${ready.length} students ${PREVIEW_DIR ? "written" : "sent"} (founders cc'd), ${failed} failed, ${withEmail.length - ready.length} skipped (no feedback)`);
  } else {
    for (const s of withEmail) if (!(await send(s.email, s))) failed++;
    // One copy for the founders, rendered for the first student, in the same run.
    if (withEmail.length) await send(COPY_TO, withEmail[0]);
    console.log(`done: ${withEmail.length - failed} of ${withEmail.length} students sent, ${failed} failed`);
  }
} else {
  console.log("\nDry run — nothing sent. Re-run with --test <email> or --send.");
}
