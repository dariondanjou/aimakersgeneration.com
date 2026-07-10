import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe webhook — the authoritative record of payment.
 *
 * `api/confirm-payment.js` only runs when the buyer lands back on the site. If they
 * close the tab during the redirect, Stripe still took the money and that enrollment
 * would sit at "pending" forever. This endpoint closes that hole.
 *
 * Both paths are idempotent (they only move pending → paid), so it's fine if they
 * both fire for the same session.
 *
 * Signature verification needs the RAW request body. Vercel's Node runtime parses
 * JSON by default, so we turn that off and read the stream ourselves. If you ever
 * see "signature verification failed" for a legitimate event, this is the first
 * thing to check.
 */
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function markPaid(supabase, session) {
  const applicationId = session.metadata?.application_id;
  if (!applicationId) {
    console.error("stripe webhook: session without application_id", session.id);
    return;
  }

  // `.eq("status", "pending")` makes this idempotent: a replayed event is a no-op.
  const { data, error } = await supabase
    .from("cohort_applications")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("id", applicationId)
    .eq("stripe_session_id", session.id)
    .eq("status", "pending")
    .select("id, email");

  if (error) throw new Error(error.message);
  if (data?.length) {
    console.log(`Enrollment ${applicationId} marked paid (${data[0].email}).`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("stripe webhook: missing environment configuration");
    return res.status(500).json({ error: "Server is not configured." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // An unverified payload is an attacker, not a customer. Never act on it.
    console.error("stripe webhook: signature verification failed —", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status === "paid") {
          await markPaid(supabase, session);
        }
        break;
      }

      case "charge.refunded": {
        const paymentIntentId = event.data.object.payment_intent;
        if (paymentIntentId) {
          await supabase
            .from("cohort_applications")
            .update({ status: "refunded" })
            .eq("stripe_payment_intent_id", paymentIntentId);
        }
        break;
      }

      // The subscription and invoice events configured on this endpoint don't apply
      // to a one-time cohort payment. Acknowledge them so Stripe stops retrying.
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // A non-2xx makes Stripe retry, which is what we want on a transient DB failure.
    console.error("stripe webhook handler:", err);
    return res.status(500).json({ error: "Handler failed" });
  }
}
