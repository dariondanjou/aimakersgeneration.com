import { createClient } from "@supabase/supabase-js";

// Keeps the community events calendar queued up. Idempotent top-up of the two
// recurring series — Film Bar AI (every Tuesday) and Workshop Wednesdays (fixed
// 2026 dates) — so the calendar always shows what's next. Runs 3x/week via
// .github/workflows/refresh-community.yml; safe to trigger manually. Existing
// events are never modified or deleted.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const FILM_BAR = {
  title: "Film Bar AI",
  description: "6-10pm EST at Halidom Eatery, 1341 Moreland Avenue SE, East Atlanta",
  weeksAhead: 16,
};

// Keep in sync with the Workshop Wednesdays list in api/chat.js.
const WORKSHOP_WEDNESDAYS = [
  "2026-08-12", "2026-08-26", "2026-09-16", "2026-09-30",
  "2026-10-14", "2026-10-28", "2026-11-11", "2026-11-25",
  "2026-12-09", "2026-12-23",
];
const WORKSHOP = {
  title: "Workshop Wednesday",
  description: "Hands-on AI workshop, 6-10pm at Georgia Tech ATDC (75 5th St NW, Suite 2000, Atlanta — Tech Square). Free to attend; bring a charged laptop.",
};

// Every Tuesday from today through N weeks out, as YYYY-MM-DD (ET dates).
function upcomingTuesdays(weeksAhead) {
  const out = [];
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  d.setHours(0, 0, 0, 0);
  let daysUntil = (2 - d.getDay() + 7) % 7; // 2 = Tuesday
  d.setDate(d.getDate() + daysUntil);
  for (let i = 0; i < weeksAhead; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!CRON_SECRET) return res.status(503).json({ error: "CRON_SECRET not configured" });
  if ((req.headers.authorization || "") !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const wanted = [
    ...upcomingTuesdays(FILM_BAR.weeksAhead).map((date) => ({
      title: FILM_BAR.title, description: FILM_BAR.description, event_date: date,
    })),
    ...WORKSHOP_WEDNESDAYS
      .filter((date) => new Date(date + "T23:59:59-04:00") > new Date())
      .map((date) => ({ title: WORKSHOP.title, description: WORKSHOP.description, event_date: date })),
  ];

  // One fetch of existing (title, date) pairs from the earliest wanted date on.
  const earliest = wanted.reduce((m, e) => (e.event_date < m ? e.event_date : m), "9999-12-31");
  const { data: existing, error: exErr } = await supabase
    .from("events")
    .select("title, event_date")
    .gte("event_date", earliest);
  if (exErr) return res.status(500).json({ error: exErr.message });

  const have = new Set((existing || []).map((e) => `${e.title.trim().toLowerCase()}|${String(e.event_date).slice(0, 10)}`));
  const toInsert = wanted.filter((e) => !have.has(`${e.title.toLowerCase()}|${e.event_date}`));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("events").insert(toInsert);
    if (insErr) return res.status(500).json({ error: insErr.message });
  }

  return res.json({
    ok: true,
    added: toInsert.length,
    events: toInsert.map((e) => `${e.title} @ ${e.event_date}`),
  });
}
