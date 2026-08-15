import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin, serviceClient } from "./_lib/admin-auth.js";

// Cohort session slide decks.
// GET            → list: [{week, title, session_date, generated_at, dirty}]
// GET ?week=N    → { week, slides, generated_at }
// GET ?public=1[&week=N] → no auth: read-only decks for the /students pages
// POST {week: N} → regenerate week N's deck from its (edited) curriculum page.
//                  Only slides affected by the edits/notes change; the model
//                  is instructed to keep everything else identical. On
//                  success the week's dirty flag clears and applied notes are
//                  folded (cleared) from the curriculum content.
//
// The UI's "Regenerate curriculum slide decks with relevant updates" button
// calls this once per dirty week, so each request stays well inside the
// function time limit.

const SLIDE_SCHEMA = `Slides are a JSON array. Each slide is one of:
- {"layout":"title","kicker","title","subtitle","meta"}         (session opener)
- {"layout":"agenda","kicker","title","rows":[["1:00","..."]]}  (timed agenda)
- {"layout":"section","kicker","title","subtitle"}              (big statement/transition)
- {"layout":"bullets","kicker","title","bullets":["..."]}       (max 5 terse bullets)
- {"layout":"cards","kicker","title","cards":[{"h","d"}]}       (2-4 cards)
- {"layout":"homework","kicker","title","due","bullets":[...]}  (the assignment)
- {"layout":"closing","title","subtitle","meta"}                (send-off)
Titles are ALL-CAPS and may contain \\n for stacked lines. Bullets are short,
punchy, presentation-grade — never paragraphs. Decks are text-only: never add
an "image" field, and drop any "image" or "imgPrompt" field you encounter.`;

// Public, read-only view for the /students pages (no auth). Students can
// open every session's deck — past, current and upcoming — and revisit past
// weeks' slides whenever they like.
// GET ?public=1         → { decks: [{week, title, session_date, generated_at, slide_count}] }
// GET ?public=1&week=N  → { week, title, session_date, slides, generated_at }
async function publicHandler(req, res) {
  const supabase = serviceClient();
  const week = parseInt(req.query?.week, 10);
  if (Number.isInteger(week)) {
    const [{ data: deck, error: e1 }, { data: cw, error: e2 }] = await Promise.all([
      supabase.from("cohort_decks").select("week, slides, generated_at").eq("week", week).maybeSingle(),
      supabase.from("curriculum_weeks").select("week, title, session_date").eq("week", week).maybeSingle(),
    ]);
    if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
    if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
      return res.status(404).json({ error: "This week's slide deck isn't published yet." });
    }
    // Decks are text-only; strip any legacy image fields before they leave.
    const slides = deck.slides.map((sl) => Object.fromEntries(Object.entries(sl).filter(([k]) => k !== "image" && k !== "imgPrompt")));
    return res.status(200).json({
      week: deck.week,
      title: cw?.title || `Week ${week}`,
      session_date: cw?.session_date || null,
      slides,
      generated_at: deck.generated_at,
    });
  }
  const [{ data: decks, error: e1 }, { data: weeks, error: e2 }] = await Promise.all([
    supabase.from("cohort_decks").select("week, generated_at, slides"),
    supabase.from("curriculum_weeks").select("week, title, session_date"),
  ]);
  if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
  const byWeek = new Map((decks || []).map(d => [d.week, d]));
  return res.status(200).json({
    decks: (weeks || []).sort((a, b) => a.week - b.week).map(w => {
      const d = byWeek.get(w.week);
      const n = Array.isArray(d?.slides) ? d.slides.length : 0;
      return {
        week: w.week, title: w.title, session_date: w.session_date,
        generated_at: n ? d.generated_at : null, slide_count: n,
      };
    }),
  });
}

export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.public) return publicHandler(req, res);

  const denied = await requireAdmin(req);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const supabase = serviceClient();

  if (req.method === "GET") {
    const week = parseInt(req.query?.week, 10);
    if (Number.isInteger(week)) {
      const { data, error } = await supabase
        .from("cohort_decks").select("week, slides, generated_at").eq("week", week).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: "No deck for that week." });
      return res.status(200).json(data);
    }
    const [{ data: decks, error: e1 }, { data: weeks, error: e2 }] = await Promise.all([
      supabase.from("cohort_decks").select("week, generated_at"),
      supabase.from("curriculum_weeks").select("week, title, session_date, dirty"),
    ]);
    if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
    const genByWeek = new Map((decks || []).map(d => [d.week, d.generated_at]));
    return res.status(200).json({
      decks: (weeks || []).sort((a, b) => a.week - b.week).map(w => ({
        ...w, generated_at: genByWeek.get(w.week) || null,
      })),
    });
  }

  if (req.method === "POST") {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured." });
    }
    const week = parseInt(req.body?.week, 10);
    if (!Number.isInteger(week) || week < 1 || week > 8) {
      return res.status(400).json({ error: "week (1-8) is required." });
    }

    const [{ data: cw, error: e1 }, { data: deck, error: e2 }] = await Promise.all([
      supabase.from("curriculum_weeks").select("*").eq("week", week).maybeSingle(),
      supabase.from("cohort_decks").select("slides").eq("week", week).maybeSingle(),
    ]);
    if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
    if (!cw || !deck) return res.status(404).json({ error: "Week not found." });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Streamed: large max_tokens on a non-streaming call makes the SDK throw
    // (10-minute guard). finalMessage() gives the same shape back.
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-5",
      max_tokens: 24000,
      system: `You maintain the slide decks for AI MAKERS GENERATION's 8-week cohort (Saturdays 1-4 PM, Atlanta). Style: dark slides, chartreuse accent, Inter, ALL-CAPS stacked titles, terse bullets — presentation-grade, never wordy.

${SLIDE_SCHEMA}

You receive the CURRENT slides and the UPDATED curriculum page for one session. Lines in the curriculum are {"t": text, "n": note}; a non-empty "n" is an instructor's inline note requesting a change or addition. Compare against the current slides and update ONLY the slides affected by changed text or notes — keep every unaffected slide byte-for-byte identical. Add/remove slides only when a note clearly calls for it. Never promise jobs, income, or outcomes. Respond with ONLY the full updated slides JSON array, no code fences, no commentary.`,
      messages: [{
        role: "user",
        content: JSON.stringify({
          week: cw.week, title: cw.title, session_date: cw.session_date,
          curriculum: cw.content, current_slides: deck.slides,
        }),
      }],
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "max_tokens") {
      console.error("decks: model output truncated at max_tokens");
      return res.status(502).json({ error: "Regeneration output was truncated. Nothing was changed — try again." });
    }
    // The model is told to return bare JSON, but be forgiving: take the
    // outermost JSON array from whatever came back.
    const raw = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    let slides;
    try {
      if (start === -1 || end <= start) throw new Error("no JSON array in response");
      slides = JSON.parse(raw.slice(start, end + 1));
      if (!Array.isArray(slides) || slides.length === 0) throw new Error("not a slide array");
      if (!slides.every(s => s && typeof s === "object" && typeof s.layout === "string")) throw new Error("malformed slide entries");
    } catch (err) {
      console.error("decks: model returned unparseable slides —", err.message, "| head:", raw.slice(0, 200));
      return res.status(502).json({ error: "Regeneration produced invalid slides. Nothing was changed — try again." });
    }

    // Fold applied notes: clear every note in the curriculum content, keep text.
    const foldNotes = (v) => {
      if (Array.isArray(v)) return v.map(foldNotes);
      if (v && typeof v === "object") {
        const out = { ...v };
        if (typeof out.n === "string") out.n = "";
        for (const k of Object.keys(out)) if (k !== "n") out[k] = foldNotes(out[k]);
        return out;
      }
      return v;
    };

    const { error: e3 } = await supabase.from("cohort_decks")
      .update({ slides, generated_at: new Date().toISOString() }).eq("week", week);
    if (e3) return res.status(500).json({ error: e3.message });
    const { error: e4 } = await supabase.from("curriculum_weeks")
      .update({ dirty: false, content: foldNotes(cw.content) }).eq("week", week);
    if (e4) return res.status(500).json({ error: e4.message });

    return res.status(200).json({ regenerated: true, week, slides: slides.length });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
