import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMAIL_HOST = Deno.env.get("EMAIL_HOST") || "smtp.gmail.com";
const EMAIL_PORT = parseInt(Deno.env.get("EMAIL_PORT") || "587");
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
      tls: true,
      auth: {
        username: EMAIL_USER,
        password: EMAIL_PASS,
      },
    },
  });

  try {
    await client.send({
      from: `AI Makers Generation <${EMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      cc: options.cc
        ? Array.isArray(options.cc) ? options.cc.join(", ") : options.cc
        : undefined,
      subject: options.subject,
      html: options.html,
    });
  } finally {
    await client.close();
  }
}

function buildFeedbackEmailHtml(category: string, message: string, userEmail: string) {
  const categoryLabels: Record<string, string> = {
    feature_request: "Feature Request",
    suggestion: "Suggestion",
    feedback: "General Feedback",
    critique: "Critique",
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
      const { category, message, user_email, user_id } = payload;

      if (!message || !user_email || !category) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: message, user_email, category" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Persist to feedback_messages table
      const { error: dbError } = await supabase.from("feedback_messages").insert([{
        user_id: user_id || null,
        user_email,
        category,
        message,
        email_sent: false,
      }]);

      if (dbError) {
        console.error("Error saving feedback:", dbError);
      }

      // Send email to admins, CC the user
      try {
        await sendEmail({
          to: ADMIN_EMAILS,
          cc: user_email,
          subject: `[AI Makers Generation] New ${category.replace(/_/g, " ")} from ${user_email}`,
          html: buildFeedbackEmailHtml(category, message, user_email),
        });

        // Mark email as sent
        if (!dbError) {
          await supabase
            .from("feedback_messages")
            .update({ email_sent: true })
            .eq("user_email", user_email)
            .eq("message", message)
            .order("created_at", { ascending: false })
            .limit(1);
        }
      } catch (emailErr) {
        console.error("Error sending feedback email:", emailErr);
      }

      return new Response(
        JSON.stringify({ success: true }),
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
