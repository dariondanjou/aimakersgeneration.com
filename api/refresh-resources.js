import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// Keeps the community Resources wiki fresh: Claude searches the web for the
// most useful new AI tools/guides for creatives, dedupes against what the wiki
// already lists, and adds up to 3 new entries per run. Runs 3x/week via
// .github/workflows/refresh-community.yml. Nothing is ever edited or deleted —
// this only appends, so community-curated entries are untouched.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const PICKS_SCHEMA = {
  type: "object",
  properties: {
    resources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short resource name, e.g. 'Runway Gen-4 — AI Video'" },
          description: { type: "string", description: "1-2 sentences on what it is and why an AI creative should care" },
          url: { type: "string", description: "Canonical URL of the resource itself (not a news article about it)" },
        },
        required: ["title", "description", "url"],
        additionalProperties: false,
      },
    },
  },
  required: ["resources"],
  additionalProperties: false,
};

const normalizeUrl = (u) => {
  try {
    const p = new URL(u.startsWith("http") ? u : `https://${u}`);
    return (p.hostname.replace(/^www\./, "") + p.pathname.replace(/\/$/, "")).toLowerCase();
  } catch {
    return (u || "").toLowerCase();
  }
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!CRON_SECRET) return res.status(503).json({ error: "CRON_SECRET not configured" });
  if ((req.headers.authorization || "") !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: existing, error: exErr } = await supabase
    .from("resources")
    .select("title, url")
    .order("created_at", { ascending: false })
    .limit(300);
  if (exErr) return res.status(500).json({ error: exErr.message });

  const haveUrls = new Set((existing || []).map((r) => normalizeUrl(r.url || "")));
  const haveTitles = new Set((existing || []).map((r) => (r.title || "").trim().toLowerCase()));
  const existingList = (existing || []).slice(0, 120).map((r) => `- ${r.title} (${r.url || "no url"})`).join("\n");

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      output_config: { format: { type: "json_schema", schema: PICKS_SCHEMA } },
      system: `You curate the resource wiki for AI Makers Generation, an Atlanta community of AI creatives (video, image, music, vibe-coding, career-changers). Search the web for what's genuinely new and useful RIGHT NOW — newly released or majorly updated AI tools, high-quality free guides/courses, and practical creator resources. Prefer things an AI creative would actually open this week. Return 2-3 picks that are NOT already in the wiki list you're given (skip anything with the same tool/site even at a different URL). Link the resource itself, never a news article about it.`,
      messages: [{
        role: "user",
        content: `Here is what the wiki already lists (do not duplicate any of these):\n\n${existingList || "(empty)"}\n\nFind 2-3 fresh, high-value AI resources for the community and return them.`,
      }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(500).json({ error: "Model declined the curation request" });
    }
    const textBlock = [...response.content].reverse().find((b) => b.type === "text");
    const picks = (JSON.parse(textBlock?.text || "{}").resources || [])
      .filter((r) => r.title && r.url)
      .filter((r) => !haveUrls.has(normalizeUrl(r.url)) && !haveTitles.has(r.title.trim().toLowerCase()))
      .slice(0, 3)
      .map((r) => ({
        title: r.title.slice(0, 200),
        description: (r.description || "").slice(0, 600),
        url: r.url,
        submitted_by: null,
      }));

    if (picks.length > 0) {
      const { error: insErr } = await supabase.from("resources").insert(picks);
      if (insErr) return res.status(500).json({ error: insErr.message });
    }

    return res.json({ ok: true, added: picks.length, resources: picks.map((p) => p.title) });
  } catch (err) {
    console.error("refresh-resources error:", err);
    return res.status(500).json({ error: "Curation failed" });
  }
}
