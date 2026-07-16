import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

// Shared admin password (the x-admin-key header). Anyone who knows it gets
// the roster — no account needed. Unset disables password access entirely.
const ADMIN_KEY = process.env.ADMIN_KEY || "";

function adminKeyMatches(provided) {
  if (!ADMIN_KEY || typeof provided !== "string" || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Same verified-token identity resolution as api/chat.js: the Authorization
// header is the only source of identity.
async function getVerifiedUser(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || !SUPABASE_ANON_KEY) return null;
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// The cohort roster for admins: every application joined to its students row.
// Unlike chat.js's calendar check (where an unset ADMIN_USER_IDS lets any
// member manage events), an empty allowlist DENIES here — this response
// carries applicant PII (email, phone).
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Two ways in: the shared admin password, or a signed-in allowlisted admin.
  const providedKey = req.headers["x-admin-key"];
  let authorized = adminKeyMatches(providedKey);
  if (!authorized) {
    const user = await getVerifiedUser(req);
    authorized = !!user && ADMIN_USER_IDS.includes(user.id);
  }
  if (!authorized) {
    if (providedKey) return res.status(403).json({ error: "Wrong password." });
    return res.status(401).json({ error: "Enter the admin password." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const [studentsRes, appsRes] = await Promise.all([
    supabase.from("students")
      .select("slug, full_name, email, user_id, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("cohort_applications")
      .select("full_name, preferred_name, email, phone, city, status, created_at, paid_at")
      .order("created_at", { ascending: true }),
  ]);
  if (studentsRes.error || appsRes.error) {
    return res.status(500).json({ error: (studentsRes.error || appsRes.error).message });
  }

  const studentByEmail = new Map(
    (studentsRes.data || [])
      .filter(s => s.email)
      .map(s => [s.email.toLowerCase(), s])
  );

  const roster = (appsRes.data || []).map(a => {
    const s = a.email ? studentByEmail.get(a.email.toLowerCase()) : null;
    return {
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
  const appEmails = new Set(
    (appsRes.data || []).map(a => a.email?.toLowerCase()).filter(Boolean)
  );
  for (const s of studentsRes.data || []) {
    if (!s.email || !appEmails.has(s.email.toLowerCase())) {
      roster.push({
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
