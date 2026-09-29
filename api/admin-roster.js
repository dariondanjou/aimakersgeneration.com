import { requireAdmin, serviceClient } from "./_lib/admin-auth.js";

// The cohort roster for admins: every application joined to its students row
// in the SAME cohort (one person can have a Summer and an October profile).
// Every row carries `cohort` so the admin page can list cohorts separately.
// Admins only (signed in with their own account — see _lib/admin-auth.js);
// this response carries applicant PII (email, phone).
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const denied = await requireAdmin(req);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const supabase = serviceClient();
  const [studentsRes, appsRes] = await Promise.all([
    supabase.from("students")
      .select("cohort, slug, full_name, email, user_id, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("cohort_applications")
      .select("cohort, full_name, preferred_name, email, phone, city, status, created_at, paid_at")
      .order("created_at", { ascending: true }),
  ]);
  if (studentsRes.error || appsRes.error) {
    return res.status(500).json({ error: (studentsRes.error || appsRes.error).message });
  }

  const key = (email, cohort) => `${cohort || ""}|${email.toLowerCase()}`;
  const studentByKey = new Map(
    (studentsRes.data || [])
      .filter(s => s.email)
      .map(s => [key(s.email, s.cohort), s])
  );

  const roster = (appsRes.data || []).map(a => {
    const s = a.email ? studentByKey.get(key(a.email, a.cohort)) : null;
    return {
      cohort: a.cohort || null,
      full_name: s?.full_name || a.full_name,
      preferred_name: a.preferred_name,
      email: a.email,
      phone: a.phone,
      city: a.city,
      status: a.status,
      applied_at: a.created_at,
      paid_at: a.paid_at,
      slug: s?.slug || null,          // set → they have a /students profile
      claimed: !!s?.user_id,          // they have signed in and own it
    };
  });

  // Roster rows added by hand, with no matching application.
  const appKeys = new Set(
    (appsRes.data || []).filter(a => a.email).map(a => key(a.email, a.cohort))
  );
  for (const s of studentsRes.data || []) {
    if (!s.email || !appKeys.has(key(s.email, s.cohort))) {
      roster.push({
        cohort: s.cohort || null,
        full_name: s.full_name,
        preferred_name: null,
        email: s.email,
        phone: null,
        city: null,
        status: "roster-only",
        applied_at: null,
        paid_at: null,
        slug: s.slug,
        claimed: !!s.user_id,
      });
    }
  }

  return res.status(200).json({ roster });
}
