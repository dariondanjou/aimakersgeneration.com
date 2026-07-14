import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Authoritative, server-side. The browser never tells us the price.
const COHORT = "summer-2026";
const TUITION_CENTS = 80000; // $800.00, paid in full. No deposits, no installments.
const TOTAL_SEATS = 20;

// A private, unadvertised discount page (apply-cohort-offer.html) posts this exact code.
// Nothing on the site links to that page — you only reach it via a direct URL. The code
// maps to a FIXED discounted amount here; the browser never sends a dollar figure, so the
// price stays as authoritative as the full-price path. Anyone who guessed the code would
// still only ever get this one sanctioned 10% price, never an arbitrary amount.
const DISCOUNT_CODE = "COHORT10";
const DISCOUNT_RATE = 0.10; // 10% off
const DISCOUNT_RETURN_PATH = "/apply-cohort-offer"; // send discount buyers back to their page

// A checkout that was started but never paid still reserves a seat for this long,
// so two people can't both take seat 20 while Stripe is processing.
const PENDING_HOLD_MINUTES = 30;

const REQUIRED_TEXT = [
  "full_name", "email", "phone", "city", "heard_about",
  "ai_experience", "coding_experience", "current_work",
  "goal", "eight_week_goal", "something_made", "final_project",
  "can_attend",
];

const REQUIRED_CONSENTS = [
  "consent_tuition", "consent_equipment", "consent_attendance", "consent_homework",
  "consent_photo_release", "consent_privacy", "consent_conduct", "consent_confidentiality",
];

const ALLOWED = {
  heard_about: ["Film Bar AI", "Workshop Wednesday", "Instagram", "TikTok", "LinkedIn", "Facebook", "X", "WhatsApp group", "A friend", "Other"],
  ai_experience: ["Never used them", "Tried ChatGPT a few times", "Use AI tools weekly", "Use them daily in my work", "I build with them"],
  coding_experience: ["Never", "A little", "Comfortable", "Professionally"],
  goal: ["Get a job", "Grow in my current role", "Launch a business", "Build a portfolio", "I'm not sure yet"],
  final_project: ["Mock interview", "Pitch deck", "Help me decide"],
  can_attend: ["Yes, all 8", "I'd miss 1", "I'd miss 2+"],
};

const isEmail = (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : null);

/** Seats already taken: paid, plus checkouts started within the hold window. */
async function seatsTaken(supabase) {
  const cutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000).toISOString();

  const { count: paid, error: e1 } = await supabase
    .from("cohort_applications")
    .select("id", { count: "exact", head: true })
    .eq("cohort", COHORT)
    .eq("status", "paid");
  if (e1) throw new Error(e1.message);

  const { count: holding, error: e2 } = await supabase
    .from("cohort_applications")
    .select("id", { count: "exact", head: true })
    .eq("cohort", COHORT)
    .eq("status", "pending")
    .gte("created_at", cutoff);
  if (e2) throw new Error(e2.message);

  return (paid || 0) + (holding || 0);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Payments are not configured yet." });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server is not configured." });
  }

  const body = req.body || {};

  // Honeypot: bots fill hidden fields. Pretend success, save nothing.
  if (body._gotcha) return res.status(200).json({ url: "?bot=1" });

  // --- validate ---
  const missing = REQUIRED_TEXT.filter((f) => !clip(body[f], 1));
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field: ${missing[0]}` });
  }
  if (!isEmail(body.email)) {
    return res.status(400).json({ error: "That email address doesn't look right." });
  }
  for (const [field, options] of Object.entries(ALLOWED)) {
    if (!options.includes(String(body[field]).trim())) {
      return res.status(400).json({ error: `Invalid value for ${field}.` });
    }
  }
  const unchecked = REQUIRED_CONSENTS.filter((c) => body[c] !== true);
  if (unchecked.length) {
    return res.status(400).json({ error: "Every acknowledgement must be checked." });
  }

  // Price is decided here, never by the browser. A valid discount code yields the one
  // sanctioned discounted amount; anything else pays full tuition.
  const isDiscount = body.discount_code === DISCOUNT_CODE;
  const amountCents = isDiscount
    ? Math.round(TUITION_CENTS * (1 - DISCOUNT_RATE)) // $720.00
    : TUITION_CENTS;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // --- seat cap: check BEFORE taking any money ---
    if ((await seatsTaken(supabase)) >= TOTAL_SEATS) {
      return res.status(409).json({
        error: "The Summer cohort is full — all twenty seats are taken. Nothing has been charged.",
        full: true,
      });
    }

    const row = {
      cohort: COHORT,
      status: "pending",
      full_name: clip(body.full_name, 120),
      preferred_name: clip(body.preferred_name, 120),
      email: clip(body.email, 200).toLowerCase(),
      phone: clip(body.phone, 40),
      city: clip(body.city, 120),
      heard_about: clip(body.heard_about, 60),
      ai_experience: clip(body.ai_experience, 60),
      coding_experience: clip(body.coding_experience, 40),
      current_work: clip(body.current_work, 300),
      portfolio_url: clip(body.portfolio_url, 500),
      no_portfolio: body.no_portfolio === true,
      goal: clip(body.goal, 60),
      eight_week_goal: clip(body.eight_week_goal, 300),
      something_made: clip(body.something_made, 300),
      final_project: clip(body.final_project, 40),
      can_attend: clip(body.can_attend, 40),
      accommodations: clip(body.accommodations, 1000),
      consent_tuition: true,
      consent_equipment: true,
      consent_attendance: true,
      consent_homework: true,
      consent_photo_release: true,
      consent_privacy: true,
      consent_conduct: true,
      consent_confidentiality: true,
      amount_cents: amountCents,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("cohort_applications")
      .insert([row])
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    // Send the buyer back to the host they started on. The enrollment page is
    // served at the ROOT of cohorts.aimakersgeneration.com (see vercel.json), but
    // at /apply on the apex — so the return path differs per host.
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || (host?.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    // Discount buyers return to their own (unadvertised) page; everyone else to /apply or /.
    const returnPath = isDiscount
      ? DISCOUNT_RETURN_PATH
      : (host?.startsWith("cohorts.") ? "/" : "/apply");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: row.email,
      client_reference_id: inserted.id,
      metadata: { application_id: inserted.id, cohort: COHORT },
      payment_intent_data: {
        metadata: { application_id: inserted.id, cohort: COHORT },
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: isDiscount
              ? "AIMG Summer 2026 Cohort — Tuition (10% discount)"
              : "AIMG Summer 2026 Cohort — Tuition",
            description: "Eight Saturdays, 1–4 PM, July 18 – September 5, 2026. RICE Center, Atlanta. Paid in full; no deposits or installments.",
          },
        },
      }],
      success_url: `${origin}${returnPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?canceled=1`,
    });

    await supabase
      .from("cohort_applications")
      .update({ stripe_session_id: session.id })
      .eq("id", inserted.id);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session:", err);
    return res.status(500).json({ error: "We couldn't start the checkout. Please try again." });
  }
}
