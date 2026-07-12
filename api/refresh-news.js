import { createClient } from "@supabase/supabase-js";

// Pulls the latest AI news into the news_articles table. Runs on a schedule
// (see .github/workflows/refresh-news.yml — 4x/day) and can be triggered
// manually. Nothing is ever deleted, so the table doubles as the archive that
// the community's News tab pages back through.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Google News RSS search feeds — free, no API key, always current.
const FEEDS = [
  "https://news.google.com/rss/search?q=artificial%20intelligence%20when:2d&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=generative%20AI%20when:2d&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=(OpenAI%20OR%20Anthropic%20OR%20%22Google%20DeepMind%22%20OR%20Claude%20OR%20ChatGPT)%20when:2d&hl=en-US&gl=US&ceid=US:en",
  // A couple of direct source feeds for variety / reliability.
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://venturebeat.com/category/ai/feed/",
];

const decode = (s) =>
  (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();

function parseItems(xml) {
  const out = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    const pick = (tag) => {
      const m = b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? decode(m[1]) : "";
    };
    let title = pick("title");
    const link = pick("link");
    const pubDate = pick("pubDate") || pick("dc:date") || pick("published");
    const source = pick("source");
    if (!title || !link) continue;
    // Google News formats titles as "Headline - Source"; drop the suffix.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    const t = Date.parse(pubDate);
    out.push({
      title: title.slice(0, 400),
      url: link,
      source: (source || "").slice(0, 120) || null,
      published_at: Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString(),
    });
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  // Auth: cron/manual callers must present the shared secret.
  if (!CRON_SECRET) return res.status(503).json({ error: "CRON_SECRET not configured" });
  if ((req.headers.authorization || "") !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Server not configured" });

  // 1. Fetch + parse every feed (a failing feed is skipped, not fatal).
  let candidates = [];
  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const r = await fetch(feed, { headers: { "User-Agent": "AIMG-NewsBot/1.0 (+https://aimakersgeneration.com)" } });
        if (r.ok) candidates.push(...parseItems(await r.text()));
      } catch {
        /* skip this feed */
      }
    })
  );

  // 2. De-dupe within the batch, newest first, cap the run.
  const seen = new Set();
  candidates = candidates
    .filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)))
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""))
    .slice(0, 80);

  // 3. De-dupe against what's already stored, then insert only the new ones.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing } = await admin
    .from("news_articles")
    .select("url")
    .order("created_at", { ascending: false })
    .limit(2000);
  const known = new Set((existing || []).map((x) => x.url));
  const fresh = candidates.filter((c) => !known.has(c.url));

  let inserted = 0;
  if (fresh.length) {
    const { data, error } = await admin
      .from("news_articles")
      .insert(fresh.map(({ title, url, source, published_at }) => ({ title, url, source, published_at })))
      .select("id");
    if (error) return res.status(500).json({ error: error.message });
    inserted = data?.length || 0;
  }

  return res.status(200).json({ ok: true, fetched: candidates.length, inserted });
}
