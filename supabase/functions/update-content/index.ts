import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// YouTube channels to track
const YOUTUBE_CHANNELS = [
  { id: "UChpleBmo18P08aKCIgti38g", name: "Matt Wolfe" },
  { id: "UClnFtyUEaxQOCd1s5NKYGFA", name: "Curious Refuge" },
  { id: "UC9Ryt3XOGYBoAJVsBHNGDzA", name: "Theoretically Media" },
  { id: "UCU6UHXn_S-FijQyy_mi8xcA", name: "The AI Filmmaking Advantage" },
];

// RSS feeds for AI news
const NEWS_FEEDS = [
  {
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    source: "TechCrunch",
  },
  {
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    source: "The Verge",
  },
];

async function fetchYouTubeVideos() {
  const allVideos: {
    video_id: string;
    title: string;
    channel_name: string;
    channel_id: string;
    thumbnail_url: string;
    published_at: string;
  }[] = [];

  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&maxResults=5&order=date&type=video&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`YouTube API error for ${channel.name}: ${res.status}`);
        continue;
      }
      const data = await res.json();

      for (const item of data.items || []) {
        allVideos.push({
          video_id: item.id.videoId,
          title: item.snippet.title,
          channel_name: item.snippet.channelTitle || channel.name,
          channel_id: channel.id,
          thumbnail_url:
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            "",
          published_at: item.snippet.publishedAt,
        });
      }
    } catch (err) {
      console.error(`Error fetching ${channel.name}:`, err);
    }
  }

  if (allVideos.length > 0) {
    const { error } = await supabase.from("youtube_videos").upsert(
      allVideos,
      { onConflict: "video_id" }
    );
    if (error) console.error("Error upserting YouTube videos:", error);
    else console.log(`Upserted ${allVideos.length} YouTube videos`);
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/<[^>]*>/g, "");
}

async function fetchNewsFromRSS() {
  const allArticles: {
    title: string;
    url: string;
    source: string;
    published_at: string;
  }[] = [];

  for (const feed of NEWS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "AIMakersGeneration/1.0" },
      });
      if (!res.ok) {
        console.error(`RSS fetch error for ${feed.source}: ${res.status}`);
        continue;
      }
      const xml = await res.text();

      // Simple XML parsing for RSS items
      const items = xml.split("<item>").slice(1, 11); // Get up to 10 items
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/s);
        const linkMatch = item.match(/<link><!\[CDATA\[(.*?)\]\]>|<link>(.*?)<\/link>/s);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

        const title = decodeHtmlEntities(
          titleMatch?.[1] || titleMatch?.[2] || ""
        ).trim();
        const url = (linkMatch?.[1] || linkMatch?.[2] || "").trim();
        const published_at = dateMatch?.[1]
          ? new Date(dateMatch[1]).toISOString()
          : new Date().toISOString();

        if (title && url) {
          allArticles.push({ title, url, source: feed.source, published_at });
        }
      }
    } catch (err) {
      console.error(`Error fetching RSS from ${feed.source}:`, err);
    }
  }

  if (allArticles.length > 0) {
    const { error } = await supabase.from("news_articles").upsert(
      allArticles,
      { onConflict: "url" }
    );
    if (error) console.error("Error upserting news articles:", error);
    else console.log(`Upserted ${allArticles.length} news articles`);
  }
}

Deno.serve(async (req) => {
  try {
    // Allow triggering via HTTP (manual or cron)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    console.log("Starting content update...");

    await Promise.all([fetchYouTubeVideos(), fetchNewsFromRSS()]);

    console.log("Content update complete.");

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Update failed:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
