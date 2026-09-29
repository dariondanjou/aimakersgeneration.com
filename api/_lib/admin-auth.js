// Admin authorization for every admin endpoint (roster, curriculum, decks,
// chatbot calendar tools). There is no shared password: an admin is a person
// signed in with their own account whose confirmed email is on the admin list
// (public.admin_emails) or whose user id is in public.admin_users. The check
// runs in the database — public.is_admin(), the same function RLS uses — so
// the site and the database never disagree about who is an admin.
// Signed out = never an admin.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

// The Authorization header is the only source of identity.
export async function getVerifiedUser(req) {
  const token = bearerToken(req);
  if (!token || !SUPABASE_ANON_KEY) return null;
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Asks public.is_admin() as the caller (their token, not the service role),
// so auth.uid() inside the function is them.
async function tokenIsAdmin(token) {
  if (!token || !SUPABASE_ANON_KEY) return false;
  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await asCaller.rpc("is_admin");
  if (error) {
    console.error("admin-auth: is_admin failed:", error.message);
    return false;
  }
  return data === true;
}

// { user, isAdmin } for the request; user is null when signed out.
export async function resolveAdmin(req) {
  const user = await getVerifiedUser(req);
  if (!user) return { user: null, isAdmin: false };
  return { user, isAdmin: await tokenIsAdmin(bearerToken(req)) };
}

// Returns null when authorized, or { status, error } to send back.
export async function requireAdmin(req) {
  const { user, isAdmin } = await resolveAdmin(req);
  if (isAdmin) return null;
  if (!user) return { status: 401, error: "Sign in with your admin account." };
  return { status: 403, error: "This account doesn't have admin access." };
}
