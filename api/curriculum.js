import { requireAdmin, serviceClient } from "./_lib/admin-auth.js";

// The cohort curriculum, editable from /community/admin/curriculum.
// GET  → all 8 weeks (title, session_date, content, dirty)
// GET ?public=1 → no auth: sanitized outline for the public /students page —
//        objective, covered, homework only (no instructor prep, no timed
//        agenda, no pending notes, no dirty flag).
// PUT  → { week, content, title? } saves an inline edit and marks the week
//        dirty so "regenerate slide decks with relevant updates" knows what
//        changed. Content shape is defined by the editor: every line is
//        { t: text, n: note }.
export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.public) {
    const { data, error } = await serviceClient()
      .from("curriculum_weeks")
      .select("week, title, session_date, content")
      .order("week", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const lines = (arr) => (arr || []).map((l) => l.t).filter((t) => t && t.trim());
    const weeks = data.map((w) => ({
      week: w.week,
      title: w.title,
      session_date: w.session_date,
      objective: w.content?.objective?.t || "",
      covered: lines(w.content?.covered),
      homework: lines(w.content?.homework),
    }));
    return res.status(200).json({ weeks });
  }

  const denied = await requireAdmin(req);
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const supabase = serviceClient();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("curriculum_weeks")
      .select("week, title, session_date, content, dirty, updated_at")
      .order("week", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ weeks: data });
  }

  if (req.method === "PUT") {
    const { week, content, title } = req.body || {};
    if (!Number.isInteger(week) || week < 1 || week > 8 || typeof content !== "object" || !content) {
      return res.status(400).json({ error: "week (1-8) and content are required." });
    }
    const patch = { content, dirty: true, updated_at: new Date().toISOString() };
    if (typeof title === "string" && title.trim()) patch.title = title.trim();
    const { error } = await supabase.from("curriculum_weeks").update(patch).eq("week", week);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ saved: true, week, dirty: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
