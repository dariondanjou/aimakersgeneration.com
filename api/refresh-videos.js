import { createClient } from "@supabase/supabase-js";

// Pulls the latest videos from a curated set of AI YouTube channels into the
// youtube_videos table. Runs 2x/day (see .github/workflows/refresh-videos.yml).
// Channel RSS feeds are free and need no API key. Nothing is deleted.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xnejbxdvqmzlaljkgwaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Curated AI YouTube channels (channel IDs → RSS).
const CHANNELS = [
  "UCbfYPyITQ-7l4upoX8nvctg", // Two Minute Papers
  "UCZHmQk67mSJgfCCTn7xBfew", // Yannic Kilcher
  "UCSHZKyawb77ixDdsGog4iWA", // Lex Fridman
  "UChpleBmo18P08aKCIgti38g", // Matt Wolfe
  "UCHhYXsLBEVVnbvsq57n1MTQ", // The AI Advantage
  "UCNJ1Ymd5yFuUPtn21xtRbbw", // AI Explained
];
const feedUrl = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

const decode = (s) =>
  (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();

function parseEntries(xml) {
  const out = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const e of entries) {
    const vid = (e.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/) || [])[1];
    const cid = (e.match(/<yt:channelId>([\s\S]*?)<\/yt:channelId>/) || [])[1];
    const title = decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
    const channel = decode((e.match(/<name>([\s\S]*?)<\/name>/) || [])[1] || "");
    const published = (e.match(/<published>([\s\S]*?)<\/published>/) || [])[1];
    if (!vid || !title) continue;
    const t = Date.parse(published);
    out.push({
      video_id: vid,
      title: title.slice(0, 300),
      channel_name: channel.slice(0, 120) || null,
      channel_id: cid || null,
      thumbnail_url: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
      published_at: Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString(),
    });
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!CRON_SECRET) return res.status(503).json({ error: "CRON_SECRET not configured" });
  if ((req.headers.authorization || "") !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Server not configured" });

  // 1. Fetch every channel feed (a failure is skipped, not fatal).
  let candidates = [];
  await Promise.all(
    CHANNELS.map(async (id) => {
      try {
        const r = await fetch(feedUrl(id), { headers: { "User-Agent": "AIMG-VideoBot/1.0 (+https://aimakersgeneration.com)" } });
        if (r.ok) candidates.push(...parseEntries(await r.text()));
      } catch {
        /* skip */
      }
    })
  );

  // 2. De-dupe within batch by video_id, newest first, cap.
  const seen = new Set();
  candidates = candidates
    .filter((c) => (seen.has(c.video_id) ? false : (seen.add(c.video_id), true)))
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""))
    .slice(0, 50);

  // 3. De-dupe against stored video_ids, insert the new ones.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing } = await admin
    .from("youtube_videos")
    .select("video_id")
    .order("created_at", { ascending: false })
    .limit(2000);
  const known = new Set((existing || []).map((x) => x.video_id));
  const fresh = candidates.filter((c) => !known.has(c.video_id));

  let inserted = 0;
  if (fresh.length) {
    const { data, error } = await admin.from("youtube_videos").insert(fresh).select("video_id");
    if (error) return res.status(500).json({ error: error.message });
    inserted = data?.length || 0;
  }

  return res.status(200).json({ ok: true, fetched: candidates.length, inserted });
}
