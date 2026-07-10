import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Optional comma-separated allowlist of profile UUIDs permitted to manage the
// shared event calendar. migration.sql marks events admin-only. If unset, any
// signed-in member may manage events (the prior behaviour).
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

/**
 * Resolve the caller from a verified Supabase access token.
 *
 * This is the ONLY source of identity. The request body is attacker-controlled:
 * because the tool executor runs with the service-role key (which bypasses RLS),
 * trusting a body-supplied user_id would let anyone delete or rewrite any row.
 * Returns null for anonymous callers, who get no tools.
 */
async function getVerifiedUser(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  if (!SUPABASE_ANON_KEY) {
    console.error("SUPABASE_ANON_KEY is not set — cannot verify access tokens.");
    return null;
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

const SYSTEM_PROMPT = `You are the AI MAKERS BOT, the friendly assistant for AI MAKERS GENERATION — a community of AI creatives, builders, and makers.

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

ABOUT THE COMMUNITY:
AI Makers Generation was founded by Darion D'Anjou and Gheri Thomas — two working AI creative professionals who started it as a "reason to get out of the house" and connect with fellow AI creators. The community shares resources, catches up on AI news, and collaborates on the future.

FLAGSHIP EVENT — FILM BAR AI:
Film Bar AI is a recurring in-person event series. It happens every Tuesday from 6–10pm EST at Halidom Eatery (1341 Moreland Avenue SE, Atlanta, GA 30316) in East Atlanta. It runs without fail every Tuesday evening. Whenever someone asks about upcoming events, what's next, or when they can come by, proactively tell them the date of the very next Tuesday's Film Bar AI (compute it from TODAY'S DATE above), naming the venue.

WORKSHOP WEDNESDAYS:
Workshop Wednesdays are hands-on AI workshop sessions hosted by AI Makers Generation at Georgia Tech ATDC (75 5th St NW, Suite 2000, Atlanta, GA 30308 — Centergy Building in Tech Square), held on the 2nd and 4th Wednesdays of each month from 6–10pm. Topics are announced closer to each date. Bring a charged laptop. Here are the remaining 2026 dates:
- July: 8, 22
- August: 12, 26
- September: 16, 30
- October: 14, 28
- November: 11, 25
- December: 9, 23

Workshops are FREE TO ATTEND. Donations are welcome and never required — a $15 donation is suggested and entirely optional, and nobody is turned away. NEVER describe a donation as an entry fee, admission, cover, ticket, or minimum. ATDC is a nonprofit venue and that wording creates real liability.

AIMG COHORTS — SUMMER 2026:
An eight-week, in-person career cohort. Eight Saturdays, 1–4pm (NOT evenings), at the Russell Innovation Center for Entrepreneurs (RICE Center) in Atlanta. The eight sessions are Jul 18, Jul 25, Aug 1, Aug 8, Aug 15, Aug 22, Aug 29, and Sep 5, 2026. Twenty seats — that is the whole room.

Tuition is $800, PAID IN FULL ONLINE WHEN YOU ENROLL, at https://aimakersgeneration.com/apply. Paying is what reserves the seat — there is no acceptance step and no waiting list. AIMG does not take deposits, partial payments, or installments. Never tell anyone they can pay at class or on the first day; that policy changed on July 9, 2026.

Graduates leave with: a polished résumé, a matching LinkedIn profile, a portfolio website, salary negotiation skills, a contract toolkit, and interview preparation for AI industry careers. They finish by delivering either a mock interview assessment or a startup pitch deck. There is weekly homework, critiqued in the room.

Students must bring their own laptop, powerful enough to run DaVinci Resolve, Blender, the Adobe Creative Suite, and Higgsfield. AIMG provides no laptops, software, or licenses. Chromebooks, tablets, and 8GB machines will not work. Attendance at all eight sessions is required; a student who misses one gets a recording but still owes that week's assignment.

NEVER promise a job, a placement, an interview, a hire, or any salary or income. The cohort PREPARES people; it does not guarantee outcomes. NEVER share a phone number or a payment handle (Zelle, Cash App, Venmo). AIMG only ever takes payment through the Stripe checkout on the website.

To stay updated on topics and announcements, join the WhatsApp group: https://chat.whatsapp.com/IdfiaQhqeOuEpduKv2SvP5

WHAT YOU CAN DO:
- Answer questions about AI Makers Generation, Film Bar AI, the founders, and the community
- Help logged-in users manage content: create, edit, and delete events, posts (articles/news/announcements/videos), and resources
- Create recurring events (e.g., "every Tuesday through December 2026")
- Update user profiles
- Collect and submit feedback

PERSONALITY & TONE:
- You are direct, authentic, and real. You speak like a knowledgeable friend, not a corporate chatbot.
- Always answer the user's actual question first. Never dodge, deflect, or give non-answers.
- Do not be politically correct or sanitize your responses. Be honest and straightforward. If something is bad, say it's bad. If something is great, say it's great.
- Have real opinions about AI tools, tech, and creative work. You're part of a community of makers — act like it.
- Keep it concise — 1-4 sentences unless the user clearly wants more depth.
- You can be funny, casual, and opinionated. No corporate-speak, no hedging, no "I understand your concern" filler.
- If you don't know something, say so plainly instead of giving a vague runaround.

RULES:
- ALWAYS answer the user's question directly before doing anything else. Never respond with only a tool action or only a confirmation — give them a real answer.
- When a user wants to create, edit, or delete content, confirm the details with them before using any tool. Show them a summary and ask "Want me to go ahead?" or similar.
- For recurring events, show the count and date range before creating.
- When listing items for editing or deletion, show a numbered list and let the user pick.
- If the user is not logged in (user_id is null), you can still answer questions but cannot perform any content management actions. Let them know they need to sign in.
- Understand natural date expressions: "next Tuesday", "tomorrow", "March 15", "in 2 weeks", etc.
- For Film Bar AI events, the standard details are: title "Film Bar AI", description "6-10pm EST at Halidom Eatery, 1341 Moreland Avenue SE, East Atlanta", every Tuesday.
- Post types must be one of: "announcement", "news", or "video".
- When creating events, use YYYY-MM-DD format for event_date.`;

const TOOLS = [
  {
    name: "create_event",
    description: "Create a new event on the community calendar. Always confirm details with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        description: { type: "string", description: "Event description (include time, location, etc.)" },
        event_date: { type: "string", description: "Event date in YYYY-MM-DD format" },
      },
      required: ["title", "event_date"],
    },
  },
  {
    name: "create_recurring_events",
    description: "Create multiple recurring events on a specific day of the week through an end date. Always show the count and date range to the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title for all occurrences" },
        description: { type: "string", description: "Event description for all occurrences" },
        day_of_week: { type: "integer", description: "Day of week (0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday)" },
        end_date: { type: "string", description: "Last possible date in YYYY-MM-DD format" },
      },
      required: ["title", "day_of_week", "end_date"],
    },
  },
  {
    name: "list_events",
    description: "List events from the calendar. Use this when the user wants to edit or delete an event, or wants to see what's scheduled.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of events to return (default 10)" },
        title_filter: { type: "string", description: "Optional: filter events by title (case-insensitive partial match)" },
      },
    },
  },
  {
    name: "update_event",
    description: "Update an existing event. Always confirm changes with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "The UUID of the event to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        event_date: { type: "string", description: "New date in YYYY-MM-DD format" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "batch_update_events",
    description: "Update multiple events at once by their IDs. Use this when the user wants to change the same field(s) across many events (e.g., rename all Film Bar AI events). Always confirm with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        event_ids: { type: "array", items: { type: "string" }, description: "Array of event UUIDs to update" },
        title: { type: "string", description: "New title for all events" },
        description: { type: "string", description: "New description for all events" },
      },
      required: ["event_ids"],
    },
  },
  {
    name: "delete_event",
    description: "Delete an event. Always confirm with the user before calling this — deletions cannot be undone.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "The UUID of the event to delete" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "create_post",
    description: "Create a new post (article, news, announcement, or video). Always confirm details with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["announcement", "news", "video"], description: "Post type" },
        title: { type: "string", description: "Post title" },
        content: { type: "string", description: "Full post content" },
        excerpt: { type: "string", description: "Short summary or excerpt" },
        video_url: { type: "string", description: "Video URL (required for video type)" },
      },
      required: ["type", "title", "content"],
    },
  },
  {
    name: "list_posts",
    description: "List recent posts. Use this when the user wants to edit or delete a post.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of posts to return (default 10)" },
      },
    },
  },
  {
    name: "update_post",
    description: "Update an existing post. Always confirm changes with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        post_id: { type: "string", description: "The UUID of the post to update" },
        title: { type: "string", description: "New title" },
        content: { type: "string", description: "New content" },
        excerpt: { type: "string", description: "New excerpt" },
        video_url: { type: "string", description: "New video URL" },
      },
      required: ["post_id"],
    },
  },
  {
    name: "delete_post",
    description: "Delete a post. Always confirm with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        post_id: { type: "string", description: "The UUID of the post to delete" },
      },
      required: ["post_id"],
    },
  },
  {
    name: "create_resource",
    description: "Add a new AI resource to the wiki. Always confirm details with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Resource title" },
        description: { type: "string", description: "Resource description" },
        url: { type: "string", description: "Resource URL" },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "list_resources",
    description: "List recent resources. Use this when the user wants to edit or delete a resource.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of resources to return (default 10)" },
      },
    },
  },
  {
    name: "update_resource",
    description: "Update an existing resource. Always confirm changes with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        resource_id: { type: "string", description: "The UUID of the resource to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        url: { type: "string", description: "New URL" },
      },
      required: ["resource_id"],
    },
  },
  {
    name: "delete_resource",
    description: "Delete a resource. Always confirm with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        resource_id: { type: "string", description: "The UUID of the resource to delete" },
      },
      required: ["resource_id"],
    },
  },
  {
    name: "update_profile",
    description: "Update the current user's profile. Always confirm changes with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "New username" },
        first_name: { type: "string", description: "First name" },
        last_name: { type: "string", description: "Last name" },
        bio: { type: "string", description: "Bio text" },
        title: { type: "string", description: "Title (e.g., 'AI Creative')" },
      },
    },
  },
  {
    name: "submit_feedback",
    description: "Submit feedback, suggestions, or questions to the admin team. Always confirm the message with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "The feedback message" },
        category: { type: "string", enum: ["feature_request", "suggestion", "feedback", "critique", "query"], description: "Category of feedback" },
      },
      required: ["message"],
    },
  },
];

// --- Tool execution ---

// Tools that modify data (drives the data_changed flag and the signed-in check)
const WRITE_TOOLS = new Set([
  "create_event", "create_recurring_events", "update_event", "batch_update_events", "delete_event",
  "create_post", "update_post", "delete_post",
  "create_resource", "update_resource", "delete_resource",
  "update_profile", "submit_feedback",
]);

// The shared calendar is admin-only per migration.sql.
const EVENT_WRITE_TOOLS = new Set([
  "create_event", "create_recurring_events", "update_event", "batch_update_events", "delete_event",
]);

function getNextDayOfWeek(targetDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const d = new Date(today);
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function generateRecurringDates(dayOfWeek, endDateStr) {
  const endDate = new Date(endDateStr);
  const dates = [];
  const current = getNextDayOfWeek(dayOfWeek);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

async function executeTool(supabase, toolName, input, userId, userEmail, isAdmin) {
  // Belt and braces: tools are never offered to anonymous callers, but the
  // executor runs with the service-role key, so re-check before any write.
  if (WRITE_TOOLS.has(toolName) && !userId) {
    return { success: false, error: "You must be signed in to do that." };
  }
  // migration.sql: "Only admins can manage events."
  if (EVENT_WRITE_TOOLS.has(toolName) && !isAdmin) {
    return { success: false, error: "Only an admin can change the event calendar." };
  }

  switch (toolName) {
    case "create_event": {
      const { data, error } = await supabase.from("events").insert([{
        title: input.title,
        description: input.description || null,
        event_date: input.event_date,
        created_by: userId || null,
      }]).select();
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Event "${input.title}" created for ${input.event_date}.` };
    }

    case "create_recurring_events": {
      const dates = generateRecurringDates(input.day_of_week, input.end_date);
      if (dates.length === 0) return { success: false, error: "No dates found in that range." };
      const events = dates.map(d => ({
        title: input.title,
        description: input.description || null,
        event_date: d,
        created_by: userId || null,
      }));
      const { error } = await supabase.from("events").insert(events);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Created ${dates.length} "${input.title}" events from ${dates[0]} through ${dates[dates.length - 1]}.` };
    }

    case "list_events": {
      let query = supabase
        .from("events")
        .select("id, title, description, event_date")
        .order("event_date", { ascending: true });
      if (input.title_filter) {
        query = query.ilike("title", `%${input.title_filter}%`);
      }
      const { data, error } = await query.limit(input.limit || 10);
      if (error) return { success: false, error: error.message };
      return { success: true, events: data };
    }

    case "update_event": {
      const updateData = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.event_date) updateData.event_date = input.event_date;
      const { error } = await supabase.from("events").update(updateData).eq("id", input.event_id);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Event updated successfully.` };
    }

    case "batch_update_events": {
      const updateData = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      const { error } = await supabase.from("events").update(updateData).in("id", input.event_ids);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Updated ${input.event_ids.length} events successfully.` };
    }

    case "delete_event": {
      const { error } = await supabase.from("events").delete().eq("id", input.event_id);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Event deleted.` };
    }

    case "create_post": {
      const insertData = {
        type: input.type,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt || null,
        author_id: userId || null,
      };
      if (input.type === "video" && input.video_url) insertData.video_url = input.video_url;
      const { error } = await supabase.from("posts").insert([insertData]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Post "${input.title}" published.` };
    }

    case "list_posts": {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(input.limit || 10);
      if (error) return { success: false, error: error.message };
      return { success: true, posts: data };
    }

    case "update_post": {
      const updateData = {};
      if (input.title) updateData.title = input.title;
      if (input.content) updateData.content = input.content;
      if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
      if (input.video_url !== undefined) updateData.video_url = input.video_url;
      // Service role bypasses RLS, so scope the write to the author ourselves.
      let q = supabase.from("posts").update(updateData).eq("id", input.post_id);
      if (!isAdmin) q = q.eq("author_id", userId);
      const { data, error } = await q.select("id");
      if (error) return { success: false, error: error.message };
      if (!data?.length) return { success: false, error: "That post doesn't exist, or it isn't yours to edit." };
      return { success: true, message: `Post updated successfully.` };
    }

    case "delete_post": {
      let q = supabase.from("posts").delete().eq("id", input.post_id);
      if (!isAdmin) q = q.eq("author_id", userId);
      const { data, error } = await q.select("id");
      if (error) return { success: false, error: error.message };
      if (!data?.length) return { success: false, error: "That post doesn't exist, or it isn't yours to delete." };
      return { success: true, message: `Post deleted.` };
    }

    case "create_resource": {
      const { error } = await supabase.from("resources").insert([{
        title: input.title,
        description: input.description,
        url: input.url || null,
        submitted_by: userId || null,
      }]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Resource "${input.title}" added to the wiki.` };
    }

    case "list_resources": {
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, description, url")
        .order("created_at", { ascending: false })
        .limit(input.limit || 10);
      if (error) return { success: false, error: error.message };
      return { success: true, resources: data };
    }

    case "update_resource": {
      const updateData = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.url !== undefined) updateData.url = input.url;
      const { error } = await supabase.from("resources").update(updateData).eq("id", input.resource_id);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Resource updated successfully.` };
    }

    case "delete_resource": {
      const { error } = await supabase.from("resources").delete().eq("id", input.resource_id);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Resource deleted.` };
    }

    case "update_profile": {
      if (!userId) return { success: false, error: "User not logged in." };
      const upsertData = { id: userId, updated_at: new Date().toISOString() };
      if (input.username) upsertData.username = input.username;
      if (input.first_name !== undefined) upsertData.first_name = input.first_name || null;
      if (input.last_name !== undefined) upsertData.last_name = input.last_name || null;
      if (input.bio !== undefined) upsertData.bio = input.bio || null;
      if (input.title !== undefined) upsertData.title = input.title || null;
      const { error } = await supabase.from("profiles").upsert(upsertData);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Profile updated.` };
    }

    case "submit_feedback": {
      if (!userId) return { success: false, error: "User not logged in." };
      // Save to database
      const { error: dbError } = await supabase.from("feedback_messages").insert([{
        user_id: userId,
        user_email: userEmail || null,
        category: input.category || "feedback",
        message: input.message,
        email_sent: false,
      }]);
      if (dbError) return { success: false, error: dbError.message };

      // Send email notification via existing Edge Function
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            action: "feedback",
            category: input.category || "feedback",
            message: input.message,
            user_email: userEmail || "",
            user_id: userId,
          },
        });
      } catch (emailErr) {
        console.error("Feedback email error:", emailErr);
      }

      return { success: true, message: `Feedback submitted. The admin team will review it.` };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  // Identity comes from the verified JWT, never from req.body.
  const authedUser = await getVerifiedUser(req);
  const user_id = authedUser?.id || null;
  const user_email = authedUser?.email || null;
  // No allowlist configured → every signed-in member may manage events (prior behaviour).
  const isAdmin = !!user_id && (ADMIN_USER_IDS.length === 0 || ADMIN_USER_IDS.includes(user_id));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Anonymous callers can ask questions but get no tools at all.
  const toolsForRequest = user_id ? TOOLS : [];

  try {
    let currentMessages = [...messages];
    let dataChanged = false;
    let maxToolRounds = 5; // Safety limit

    let response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system: SYSTEM_PROMPT,
      tools: toolsForRequest,
      messages: currentMessages,
    });

    // Tool execution loop
    while (response.stop_reason === "tool_use" && maxToolRounds > 0) {
      maxToolRounds--;

      const toolUseBlocks = response.content.filter(c => c.type === "tool_use");
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(supabase, toolUse.name, toolUse.input, user_id, user_email, isAdmin);
        if (WRITE_TOOLS.has(toolUse.name) && result.success) dataChanged = true;
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];

      response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        thinking: { type: "disabled" },
        system: SYSTEM_PROMPT,
        tools: toolsForRequest,
        messages: currentMessages,
      });
    }

    // Extract final text
    const textBlock = response.content.find(c => c.type === "text");
    return res.json({
      response: textBlock?.text || "I'm here to help! What would you like to do?",
      data_changed: dataChanged,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
}
