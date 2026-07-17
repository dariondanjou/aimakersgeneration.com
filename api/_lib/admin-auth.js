// Shared admin authorization for the cohort admin endpoints.
// Two ways in: the shared admin password (x-admin-key header, checked against
// ADMIN_KEY with a timing-safe compare) or a signed-in Supabase user whose id
// is in ADMIN_USER_IDS. Mirrors api/admin-roster.js.
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

export function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function adminKeyMatches(provided) {
  if (!ADMIN_KEY || typeof provided !== "string" || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

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

// Returns null when authorized, or { status, error } to send back.
export async function requireAdmin(req) {
  const providedKey = req.headers["x-admin-key"];
  if (adminKeyMatches(providedKey)) return null;
  const user = await getVerifiedUser(req);
  if (user && ADMIN_USER_IDS.includes(user.id)) return null;
  if (providedKey) return { status: 403, error: "Wrong password." };
  return { status: 401, error: "Enter the admin password." };
}
