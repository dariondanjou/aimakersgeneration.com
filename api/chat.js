import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SYSTEM_PROMPT = `You are the AI Maker Bot, the friendly assistant for AI MAKERS GENERATION — a community of AI creatives, builders, and makers.

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

ABOUT THE COMMUNITY:
AI Makers Generation was founded by Darion D'Anjou and Gheri Thomas — two working AI creative professionals who started it as a "reason to get out of the house" and connect with fellow AI creators. The community shares resources, catches up on AI news, and collaborates on the future.

FLAGSHIP EVENT — FILM BAR AI:
Film Bar AI is a recurring in-person event series. It happens every Tuesday from 6–10pm EST at Halidom Eatery in East Atlanta. It runs without fail every Tuesday evening.

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
- For Film Bar AI events, the standard details are: title "Film Bar AI", description "6-10pm EST at Halidom Eatery, East Atlanta", every Tuesday.
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
        url: { type: "string", description: "Optional URL for the event" },
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
    description: "List recent events from the calendar. Use this when the user wants to edit or delete an event, or wants to see what's scheduled.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of events to return (default 10)" },
      },
    },
  },
  {
    name: "update_event",
    description: "Update an existing event. Always confirm changes with the user before calling this.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "integer", description: "The ID of the event to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        event_date: { type: "string", description: "New date in YYYY-MM-DD format" },
        url: { type: "string", description: "New URL" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete an event. Always confirm with the user before calling this — deletions cannot be undone.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "integer", description: "The ID of the event to delete" },
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
        post_id: { type: "integer", description: "The ID of the post to update" },
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
        post_id: { type: "integer", description: "The ID of the post to delete" },
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
        resource_id: { type: "integer", description: "The ID of the resource to update" },
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
        resource_id: { type: "integer", description: "The ID of the resource to delete" },
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

async function executeTool(supabase, toolName, input, userId, userEmail) {
  switch (toolName) {
    case "create_event": {
      const { data, error } = await supabase.from("events").insert([{
        title: input.title,
        description: input.description || null,
        event_date: input.event_date,
        url: input.url || null,
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
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_date, url")
        .order("event_date", { ascending: false })
        .limit(input.limit || 10);
      if (error) return { success: false, error: error.message };
      return { success: true, events: data };
    }

    case "update_event": {
      const updateData = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.event_date) updateData.event_date = input.event_date;
      if (input.url !== undefined) updateData.url = input.url;
      const { error } = await supabase.from("events").update(updateData).eq("id", input.event_id);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Event updated successfully.` };
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
        .select("id, type, title, content, excerpt, video_url")
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
      const { error } = await supabase.from("posts").update(updateData).eq("id", input.post_id);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Post updated successfully.` };
    }

    case "delete_post": {
      const { error } = await supabase.from("posts").delete().eq("id", input.post_id);
      if (error) return { success: false, error: error.message };
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

// Tools that modify data (for data_changed flag)
const WRITE_TOOLS = new Set([
  "create_event", "create_recurring_events", "update_event", "delete_event",
  "create_post", "update_post", "delete_post",
  "create_resource", "update_resource", "delete_resource",
  "update_profile", "submit_feedback",
]);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, user_id, user_email } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Only provide tools if the user is logged in
  const toolsForRequest = user_id ? TOOLS : [];

  try {
    let currentMessages = [...messages];
    let dataChanged = false;
    let maxToolRounds = 5; // Safety limit

    let response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
        const result = await executeTool(supabase, toolUse.name, toolUse.input, user_id, user_email);
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
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
