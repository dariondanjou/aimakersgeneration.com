import { requireAdmin, serviceClient } from "./_lib/admin-auth.js";

// The cohort curriculum, editable from /community/admin/curriculum.
// GET  → all 8 weeks (title, session_date, content, dirty)
// PUT  → { week, content, title? } saves an inline edit and marks the week
//        dirty so "regenerate slide decks with relevant updates" knows what
//        changed. Content shape is defined by the editor: every line is
//        { t: text, n: note }.
export default async function handler(req, res) {
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
