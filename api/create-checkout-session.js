import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { head } from "@vercel/blob";
import { COHORT, PREFIX as WORK_PREFIX, DEADLINE_MS as ENROLLMENT_DEADLINE_MS, MAX_FILES } from "./enroll-upload.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Authoritative, server-side. The browser never tells us the price.
const TUITION_CENTS = 80000; // $800.00, paid in full. No deposits, no installments.
const TOTAL_SEATS = 20;

// COHORT and ENROLLMENT_DEADLINE_MS come from enroll-upload.js so uploads and
// checkout close together. Enrollment closes when Session 1 begins: Saturday,
// January 2, 2027, 1:00 PM Eastern (EST, UTC-5). After this instant the API
// refuses to start a checkout.

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
const isUrl = (v) => {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : null);

/** Extra work links: one per line, each a real http(s) URL. Returns null if any line isn't. */
function parseLinks(v) {
  if (typeof v !== "string" || !v.trim()) return [];
  const lines = v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 20);
  return lines.every(isUrl) ? lines : null;
}

/**
 * Uploaded previous-work files. Each URL must be a Blob file under this
 * cohort's enroll/ prefix, confirmed with Blob itself — the browser's word
 * isn't enough. Returns the saved shape, or throws a message for the enrollee.
 */
async function verifyWorkFiles(files) {
  if (files == null) return [];
  if (!Array.isArray(files) || files.length > MAX_FILES) throw new Error(`Upload up to ${MAX_FILES} files.`);
  const out = [];
  for (const f of files) {
    const url = f && typeof f.url === "string" ? f.url : "";
    if (!/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(url)) throw new Error("One of your uploads didn't finish. Remove it and upload it again.");
    let blob;
    try {
      blob = await head(url);
    } catch {
      throw new Error("One of your uploads didn't finish. Remove it and upload it again.");
    }
    if (!blob.pathname.startsWith(WORK_PREFIX)) throw new Error("One of your uploads didn't finish. Remove it and upload it again.");
    out.push({
      url: blob.url,
      pathname: blob.pathname,
      name: clip(f.name, 200) || blob.pathname.slice(WORK_PREFIX.length),
      size: blob.size,
      type: blob.contentType || null,
    });
  }
  return out;
}

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
  // Previous work is mandatory: at least one link or one uploaded file.
  const hasPortfolio = typeof body.portfolio_url === "string" && body.portfolio_url.trim() !== "";
  if (hasPortfolio && !isUrl(body.portfolio_url)) {
    return res.status(400).json({ error: "Your work link needs to be a full web address, starting with http:// or https://." });
  }
  const workLinks = parseLinks(body.work_links);
  if (!workLinks) {
    return res.status(400).json({ error: "Each extra link must be a full web address (starting with http:// or https://), one per line." });
  }
  let workFiles;
  try {
    workFiles = await verifyWorkFiles(body.work_files);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (!hasPortfolio && !workLinks.length && !workFiles.length) {
    return res.status(400).json({ error: "Share a link to your previous work or upload it — every enrollee must include previous work." });
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

  // Price is decided here, never by the browser.
  const amountCents = TUITION_CENTS;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // --- enrollment deadline: the cohort starts Jan 2, 2027 at 1 PM ET ---
    if (Date.now() >= ENROLLMENT_DEADLINE_MS) {
      return res.status(409).json({
        error: "Enrollment for the Winter 2027 Jobs Cohort closed on January 2, 2027 at 1:00 PM. Nothing has been charged.",
        closed: true,
      });
    }

    // --- seat cap: check BEFORE taking any money ---
    if ((await seatsTaken(supabase)) >= TOTAL_SEATS) {
      return res.status(409).json({
        error: "The Winter 2027 Jobs Cohort is full — all twenty seats are taken. Nothing has been charged.",
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
      portfolio_url: hasPortfolio ? clip(body.portfolio_url, 500) : (workLinks[0] || null),
      no_portfolio: false,
      work_links: workLinks.length ? workLinks.join("\n").slice(0, 4000) : null,
      work_files: workFiles,
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
    const returnPath = host?.startsWith("cohorts.") ? "/" : "/apply";

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
            name: "AIMG Winter 2027 Jobs Cohort — Tuition",
            description: "Eight-week AI careers cohort. Eight Saturdays, 1–4 PM, January 2 – February 20, 2027. RICE Center, Atlanta, or live online. Paid in full; no deposits or installments.",
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
