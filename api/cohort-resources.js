import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, serviceClient } from "./_lib/admin-auth.js";

// Session recordings and handouts for /students, members only.
// GET ?cohort=<id> with the caller's Bearer token → { weeks: [{ week, resources }] }
// The caller must pass public.is_cohort_member() (a student in any cohort, or
// an admin). Items are rows in public.cohort_resources (service role only;
// see 20261005110000_cohort_resources.sql). PDFs live in the private
// `cohort-materials` bucket and go out as short-lived signed URLs (one to
// view, one that downloads); recordings are in Vercel Blob under unguessable
// URLs that are only ever sent from here. Thumbnails are public images.

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SIGNED_TTL = 6 * 60 * 60; // seconds

async function isMember(token) {
  if (!token || !SUPABASE_ANON_KEY) return false;
  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await asCaller.rpc("is_cohort_member");
  if (error) console.error("cohort-resources: is_cohort_member failed:", error.message);
  return !error && data === true;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "private, no-store");

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: "Sign in to see cohort materials." });
  if (!(await isMember(token))) return res.status(403).json({ error: "Cohort materials are for cohort students." });

  const supabase = serviceClient();
  const { data: rows, error } = await supabase
    .from("cohort_resources")
    .select("week, kind, title, description, meta, thumb, blob_url, storage_path")
    .eq("cohort", String(req.query?.cohort || ""))
    .order("week", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const bucket = supabase.storage.from("cohort-materials");

  const byWeek = new Map();
  for (const r of rows) {
    const base = { kind: r.kind, title: r.title, description: r.description, meta: r.meta, thumb: r.thumb };
    let item;
    if (r.blob_url) {
      item = { ...base, url: r.blob_url, download: `${r.blob_url}?download=1` };
    } else {
      const [view, dl] = await Promise.all([
        bucket.createSignedUrl(r.storage_path, SIGNED_TTL),
        bucket.createSignedUrl(r.storage_path, SIGNED_TTL, { download: true }),
      ]);
      if (view.error || dl.error) {
        console.error("cohort-resources: signing failed for", r.storage_path, (view.error || dl.error).message);
        continue;
      }
      item = { ...base, url: view.data.signedUrl, download: dl.data.signedUrl };
    }
    if (!byWeek.has(r.week)) byWeek.set(r.week, []);
    byWeek.get(r.week).push(item);
  }
  const out = [...byWeek].map(([week, resources]) => ({ week, resources }));
  return res.status(200).json({ weeks: out });
}
