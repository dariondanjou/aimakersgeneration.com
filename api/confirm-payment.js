import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Confirm a completed Stripe Checkout.
 *
 * The browser hands us a session_id, which is public and forgeable in the sense
 * that anyone can put any string in the URL. So we never trust the URL for
 * "paid" — we re-fetch the session from Stripe and read payment_status from
 * there. A session id alone cannot make a row say "paid".
 *
 * This is the reconciliation path for the happy case (the user lands back on the
 * site). If they close the tab mid-redirect, the row stays "pending" until you
 * add the Stripe webhook — see README.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.STRIPE_SECRET_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server is not configured." });
  }

  const sessionId = req.body?.session_id;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "session_id is required" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(200).json({ paid: false });
    }

    const applicationId = session.metadata?.application_id;
    if (!applicationId) {
      console.error("confirm-payment: session has no application_id", sessionId);
      return res.status(200).json({ paid: true, name: null });
    }

    // Match on both id and session id so a valid session can only ever confirm
    // the row it was created for.
    const { data, error } = await supabase
      .from("cohort_applications")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      })
      .eq("id", applicationId)
      .eq("stripe_session_id", sessionId)
      .select("preferred_name, full_name, email")
      .maybeSingle();

    if (error) throw new Error(error.message);

    const name = data?.preferred_name || data?.full_name?.split(" ")[0] || null;
    return res.status(200).json({ paid: true, name });
  } catch (err) {
    console.error("confirm-payment:", err);
    return res.status(500).json({ error: "We couldn't confirm that payment." });
  }
}
