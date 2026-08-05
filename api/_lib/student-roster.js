// Creates the public /students/<slug> profile for a paid enrollment.
// Called from both places an application flips to "paid" (the Stripe webhook
// and confirm-payment). Idempotent: if a students row already exists for the
// email, it does nothing. Never throws — a profile hiccup must not fail a
// payment confirmation.
//
// (The _lib folder's underscore prefix keeps Vercel from deploying this file
// as a serverless function.)

// Intake answers that mean "undecided" — leave those profile fields blank so
// the student can fill them in, instead of publishing a non-answer.
const PLACEHOLDER_ANSWERS = new Set(["i'm not sure yet", "help me decide"]);

const substantive = (v) => {
  const t = (v || "").trim();
  return t && !PLACEHOLDER_ANSWERS.has(t.toLowerCase()) ? t : null;
};

// "Liana (lee-anna)" → "liana"; falls back to the first name.
function baseSlug(app) {
  const source = (app.preferred_name || app.full_name || "").split(/[\s(]/)[0] || "";
  return source.toLowerCase().replace(/[^a-z0-9]/g, "") || "student";
}

export async function ensureStudentProfile(supabase, app) {
  try {
    if (!app?.email || !app?.full_name) return;

    const { data: existing, error: lookupErr } = await supabase
      .from("students")
      .select("id")
      .ilike("email", app.email)
      .maybeSingle();
    if (lookupErr) {
      console.error("student-roster: lookup failed —", lookupErr.message);
      return;
    }
    if (existing) return; // already on the roster

    const base = baseSlug(app);
    const lastInitial =
      (app.full_name.trim().split(/\s+/).pop() || "")[0]?.toLowerCase() || "";
    // rico → ricoh → rico2, rico3, … until one fits.
    const candidates = [
      base,
      lastInitial ? base + lastInitial : `${base}2`,
      ...Array.from({ length: 8 }, (_, i) => `${base}${i + 2}`),
    ];

    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true });

    for (const slug of candidates) {
      const { error } = await supabase.from("students").insert({
        slug,
        full_name: app.full_name,
        headline: "AI Filmmaker — October 2026 Film Cohort",
        email: app.email,
        city: app.city || null,
        current_work: app.current_work || null,
        ai_experience: app.ai_experience || null,
        coding_experience: app.coding_experience || null,
        something_made: app.something_made || null,
        eight_week_goal: app.eight_week_goal || null,
        goal: substantive(app.goal),
        final_project_goal: substantive(app.final_project),
        links: app.portfolio_url || null,
        sort_order: (count || 0) + 1,
      });
      if (!error) {
        console.log(`student-roster: created /students/${slug} for ${app.email}`);
        return;
      }
      if (error.code !== "23505") {
        // anything other than a slug collision is a real failure — stop
        console.error("student-roster: insert failed —", error.message);
        return;
      }
    }
    console.error("student-roster: no free slug found for", app.email);
  } catch (err) {
    console.error("student-roster:", err);
  }
}
