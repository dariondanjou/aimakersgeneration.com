// One-off: verify the October cohort enrollment row + Stripe session, then exit.
// Usage: node scripts-verify-october.mjs [--cleanup <row-id>]
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.pulled", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 1 || line.startsWith("#")) continue;
  let v = line.slice(i + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  // `vercel env pull` writes embedded newlines as a literal backslash-n; strip them.
  v = v.split("\\n").join("").trim();
  env[line.slice(0, i).trim()] = v;
}

const sb = createClient("https://xnejbxdvqmzlaljkgwaf.supabase.co", env.SUPABASE_SERVICE_ROLE_KEY);
// STRIPE_SECRET_KEY is a sensitive var in Vercel — it pulls as "". Skip Stripe checks without it.
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const cleanupIdx = process.argv.indexOf("--cleanup");
if (cleanupIdx > -1) {
  const id = process.argv[cleanupIdx + 1];
  const { data, error } = await sb
    .from("cohort_applications")
    .delete()
    .eq("id", id)
    .eq("status", "pending")
    .eq("email", "dariondanjou@gmail.com")
    .select("id");
  console.log("cleanup:", error ? error.message : `${data.length} pending test row(s) deleted`);
  process.exit(0);
}

const { data, error } = await sb
  .from("cohort_applications")
  .select("id, cohort, status, email, full_name, amount_cents, stripe_session_id, created_at")
  .eq("cohort", "october-2026-film")
  .order("created_at", { ascending: false });
if (error) throw new Error(error.message);

console.log("october-2026-film rows:", data.length);
for (const r of data) console.log(" ", r.created_at, "|", r.status, "|", r.email, "|", r.amount_cents, "|", r.id);

if (stripe && data[0]?.stripe_session_id) {
  const s = await stripe.checkout.sessions.retrieve(data[0].stripe_session_id, { expand: ["line_items"] });
  const li = s.line_items?.data?.[0];
  console.log("stripe session:", s.status, "|", s.payment_status, "|", s.amount_total, s.currency);
  console.log("  line item:", li?.description, "| qty", li?.quantity, "| amount", li?.amount_total);
  console.log("  customer_email:", s.customer_email, "| metadata:", JSON.stringify(s.metadata));
  console.log("  success_url host ok:", (s.success_url || "").slice(0, 60));
  console.log("  cancel_url:", (s.cancel_url || "").slice(0, 60));
}
