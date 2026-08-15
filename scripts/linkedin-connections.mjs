// LinkedIn connections roll-up for the whole cohort.
//
//   node --env-file=.env.pulled scripts/linkedin-connections.mjs            report
//   node --env-file=.env.pulled scripts/linkedin-connections.mjs --json     report as JSON
//   node --env-file=.env.pulled scripts/linkedin-connections.mjs --log <slug|name> <count> [--week N]
//                                                                          record a count (defaults to the current cohort week)
//
// The counts are self-reported (students log them on their /students profile,
// or you log them here from what they tell you in session) — LinkedIn has no
// API for a member's connection count and scraping profiles is against its
// User Agreement. See supabase/migrations/20260722_student_linkedin.sql.
import { createClient } from "@supabase/supabase-js";

const clean = (v) => (v || "").replace(/\\n/g, "").replace(/\s+/g, "");
const url = clean(process.env.SUPABASE_URL) || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!key) { console.error("SUPABASE_SERVICE_ROLE_KEY missing — run with --env-file=.env.pulled"); process.exit(1); }
const sb = createClient(url, key);

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i > -1 ? argv[i + 1] : undefined; };
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

// The cohort week we're in: the highest week whose session has happened.
const { data: assignments } = await sb.from("assignments").select("week_assigned, assigned_on").order("week_assigned");
const today = new Date().toISOString().slice(0, 10);
const currentWeek = Math.max(1, ...(assignments || []).filter((a) => a.assigned_on <= today).map((a) => a.week_assigned));

const { data: students, error } = await sb
  .from("students").select("id, slug, full_name, linkedin_url").order("sort_order").order("full_name");
if (error) { console.error(error.message); process.exit(1); }
const { data: stats } = await sb.from("student_linkedin_stats").select("student_id, week, connections");

// ── --log: record a count on a student's behalf ─────────────────────────────
if (argv.includes("--log")) {
  const who = (flag("--log") || "").toLowerCase();
  const count = parseInt(argv[argv.indexOf("--log") + 2], 10);
  const week = parseInt(flag("--week") || currentWeek, 10);
  const student = students.find((s) => s.slug === who || s.full_name.toLowerCase() === who || s.full_name.toLowerCase().startsWith(who));
  if (!student) { console.error(`No student matches "${who}"`); process.exit(1); }
  if (!Number.isFinite(count) || count < 0) { console.error("Give a non-negative connection count"); process.exit(1); }
  if (!WEEKS.includes(week)) { console.error("Week must be 1–8"); process.exit(1); }
  const { error: upErr } = await sb.from("student_linkedin_stats")
    .upsert({ student_id: student.id, week, connections: count }, { onConflict: "student_id,week" });
  if (upErr) { console.error(upErr.message); process.exit(1); }
  console.log(`Logged ${student.full_name}: W${week} = ${count.toLocaleString()}`);
  process.exit(0);
}

// ── Report ──────────────────────────────────────────────────────────────────
const rows = students.map((s) => {
  const byWeek = new Map((stats || []).filter((x) => x.student_id === s.id).map((x) => [x.week, x.connections]));
  const recorded = WEEKS.filter((w) => byWeek.has(w));
  const first = recorded.length ? byWeek.get(recorded[0]) : null;
  const latestWeek = recorded.length ? recorded[recorded.length - 1] : null;
  const latest = latestWeek ? byWeek.get(latestWeek) : null;
  return {
    name: s.full_name, slug: s.slug, linkedin: !!s.linkedin_url,
    weeks: Object.fromEntries(WEEKS.map((w) => [`W${w}`, byWeek.has(w) ? byWeek.get(w) : null])),
    latest, latestWeek, growth: recorded.length > 1 ? latest - first : null,
    loggedThisWeek: byWeek.has(currentWeek),
  };
});

const logging = rows.filter((r) => r.latest != null);
const cohort = {
  currentWeek,
  studentsWithLinkedIn: rows.filter((r) => r.linkedin).length,
  studentsLogging: logging.length,
  totalConnections: logging.reduce((a, r) => a + r.latest, 0),
  totalGrowth: logging.reduce((a, r) => a + (r.growth || 0), 0),
  // Cohort trajectory: per week, the sum of connections over students who logged
  // that week, and how many did — so a jump from "more people logging" is visible.
  byWeek: WEEKS.map((w) => {
    const vals = rows.map((r) => r.weeks[`W${w}`]).filter((v) => v != null);
    return { week: w, students: vals.length, total: vals.reduce((a, b) => a + b, 0) };
  }),
  notLoggedThisWeek: rows.filter((r) => r.linkedin && !r.loggedThisWeek).map((r) => r.name),
};

if (argv.includes("--json")) {
  console.log(JSON.stringify({ cohort, students: rows }, null, 2));
  process.exit(0);
}

console.log(`\nLinkedIn connections — cohort week ${currentWeek}\n`);
console.table(rows.map((r) => ({
  Student: r.name, LinkedIn: r.linkedin ? "yes" : "—",
  ...r.weeks,
  Latest: r.latest ?? "—", Growth: r.growth == null ? "—" : `${r.growth >= 0 ? "+" : ""}${r.growth}`,
})));
console.log("Cohort trajectory (sum of logged counts / students logging):");
console.table(cohort.byWeek.map((b) => ({ Week: `W${b.week}`, Students: b.students, Total: b.total })));
console.log(`Total connections now: ${cohort.totalConnections.toLocaleString()} across ${cohort.studentsLogging} students logging`);
console.log(`Gained this cohort:    +${cohort.totalGrowth.toLocaleString()}`);
if (cohort.notLoggedThisWeek.length) {
  console.log(`\nHaven't logged W${currentWeek} yet: ${cohort.notLoggedThisWeek.join(", ")}`);
  console.log(`  → nudge them, or log for them: node --env-file=.env.pulled scripts/linkedin-connections.mjs --log <name> <count>`);
}
process.exit(0);
