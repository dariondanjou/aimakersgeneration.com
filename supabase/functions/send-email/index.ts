import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMAIL_HOST = Deno.env.get("EMAIL_HOST") || "smtp.gmail.com";
// 465 = implicit TLS; 587 = STARTTLS. denomailer wants `tls: true` only for the
// implicit-TLS port — setting it on 587 causes "received corrupt message of
// type InvalidContentType". Default to 465 so a single, reliable path works.
const EMAIL_PORT = parseInt(Deno.env.get("EMAIL_PORT") || "465");
const EMAIL_USER = Deno.env.get("EMAIL_USER") || "";
const EMAIL_PASS = Deno.env.get("EMAIL_PASS") || "";

const ADMIN_EMAILS = [
  "dariondanjou@gmail.com",
  "thomasgheri@gmail.com",
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(options: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}) {
  const client = new SMTPClient({
    connection: {
      hostname: EMAIL_HOST,
      port: EMAIL_PORT,
      tls: EMAIL_PORT === 465, // implicit TLS on 465; STARTTLS (tls:false) on 587
      auth: {
        username: EMAIL_USER,
        password: EMAIL_PASS,
      },
    },
  });

  try {
    await client.send({
      from: `AI Makers Generation <${EMAIL_USER}>`,
      // denomailer accepts string | string[] — do NOT comma-join arrays into
      // one string; Gmail rejects that as a single invalid RFC 5321 address.
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: options.html,
    });
  } finally {
    await client.close();
  }
}

// Decode the caller's Supabase JWT role from the Authorization header. The
// platform (verify_jwt) already rejects invalid/forged tokens, so a valid
// "service_role" claim proves the caller holds the secret service key — i.e.
// it's our own backend/script, not a random visitor.
function callerRole(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  try { return JSON.parse(atob(t.split(".")[1] || "")).role ?? null; } catch { return null; }
}

function buildFeedbackEmailHtml(category: string, message: string, userEmail: string) {
  const categoryLabels: Record<string, string> = {
    bug: "Bug Report",
    feature_request: "Feature Request",
    suggestion: "Suggestion",
    feedback: "General Feedback",
    critique: "Critique",
    praise: "Praise",
    query: "Question / Query",
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e; border-bottom: 2px solid #B0E0E6; padding-bottom: 10px;">
        New ${categoryLabels[category] || category} — AI Makers Generation
      </h2>
      <p><strong>From:</strong> ${userEmail}</p>
      <p><strong>Category:</strong> ${categoryLabels[category] || category}</p>
      <div style="background: #f5f5f5; border-left: 4px solid #B0E0E6; padding: 15px; margin: 15px 0; white-space: pre-wrap;">
        ${message}
      </div>
      <p style="color: #666; font-size: 12px;">
        This message was sent via the AI Makers Generation chat bot.
      </p>
    </div>
  `;
}

function buildThankYouEmailHtml(contributionType: string, title: string) {
  const messages: Record<string, string> = {
    event: `Thank you for adding the event <strong>"${title}"</strong> to AI Makers Generation! Your contribution helps our community stay informed about upcoming opportunities.`,
    resource: `Thank you for contributing <strong>"${title}"</strong> to the AI Resources Wiki! Sharing knowledge is what makes our community thrive.`,
    post: `Thank you for publishing <strong>"${title}"</strong> on AI Makers Generation! Your content helps keep our community informed and engaged.`,
    profile: `Thank you for setting up your profile on AI Makers Generation! Welcome to the community — we're glad to have you here.`,
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e; border-bottom: 2px solid #B0E0E6; padding-bottom: 10px;">
        Thank You! — AI Makers Generation
      </h2>
      <p style="font-size: 16px; line-height: 1.6;">
        ${messages[contributionType] || `Thank you for your contribution to AI Makers Generation!`}
      </p>
      <p style="margin-top: 20px;">
        Keep creating, keep building!<br/>
        <strong>The AI Makers Generation Team</strong>
      </p>
      <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
        This is an automated message from AI Makers Generation.
      </p>
    </div>
  `;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    if (action === "feedback") {
      // NOTE: the caller (api/chat.js) is the authoritative writer to
      // feedback_messages — it inserts the row before invoking this function, so
      // the feedback is stored even if email delivery fails. This function's job
      // is only the admin notification. It does NOT write to the table.
      const { category, message, user_email } = payload;

      if (!message || !category) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: message, category" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hasEmail = typeof user_email === "string" && user_email.includes("@");
      const fromLabel = hasEmail ? user_email : "a site visitor";

      try {
        await sendEmail({
          to: ADMIN_EMAILS,
          cc: hasEmail ? user_email : undefined,
          subject: `[AI Makers Generation] New ${category.replace(/_/g, " ")} from ${fromLabel}`,
          html: buildFeedbackEmailHtml(category, message, fromLabel),
        });
      } catch (emailErr) {
        console.error("Error sending feedback email:", emailErr);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cohort_welcome") {
      // Server-only: send a personalized welcome email to a cohort student.
      // Gated to the service role — only a caller holding the secret service
      // key (our own backend/scripts) may trigger a send to an arbitrary
      // recipient. Sends from EMAIL_USER (the site's Gmail sender).
      if (callerRole(req) !== "service_role") {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { to, cc, subject, html } = payload;
      if (!to || !subject || !html) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: to, subject, html" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await sendEmail({ to, cc, subject, html });
      return new Response(
        JSON.stringify({ success: true, to }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "contribution_thanks") {
      const { contribution_type, title, user_email } = payload;

      if (!user_email || !contribution_type) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: user_email, contribution_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        await sendEmail({
          to: user_email,
          subject: `Thank you for your contribution — AI Makers Generation`,
          html: buildThankYouEmailHtml(contribution_type, title || ""),
        });
      } catch (emailErr) {
        console.error("Error sending thank-you email:", emailErr);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email function error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
