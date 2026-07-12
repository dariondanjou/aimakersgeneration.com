import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Identity comes ONLY from the verified access token — never the request body.
// A member can delete their own account and nothing else.
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

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Server is not configured." });

  const user = await getVerifiedUser(req);
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Remove the member's own rows first so the auth-user delete isn't blocked by
  // foreign keys (profiles.id references auth.users with no cascade).
  await admin.from("comments").delete().eq("user_id", user.id);
  await admin.from("posts").delete().eq("author_id", user.id);
  await admin.from("profiles").delete().eq("id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete-account failed:", error.message);
    return res.status(500).json({ error: "Could not delete the account. Please try again." });
  }
  return res.status(200).json({ deleted: true });
}
