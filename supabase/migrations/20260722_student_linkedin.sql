-- LinkedIn on the student profiles: a dedicated LinkedIn URL, a week-by-week
-- connection-count timeline (weeks 1–8) that draws a growth chart, and a couple
-- of headline stats (e.g. % of connections working in AI).
--
-- IMPORTANT — why these numbers are entered, not scraped: LinkedIn exposes no
-- public API for a member's connection count or connection list, and scraping a
-- member's page violates the LinkedIn User Agreement. So the numbers are
-- self-reported — the student logs their connection count each week, which
-- doubles as the accountability ritual behind the cohort's LinkedIn-growth goal.
-- The schema is deliberately source-agnostic: if an authorized data source is
-- ever wired up, it can populate the same table with no UI change.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_ai_pct INTEGER;   -- % of connections involved in AI (0–100)

-- students SELECT is granted per-column (see 20260716_students_email_privacy),
-- so each new column needs an explicit grant to be client-visible.
GRANT SELECT (linkedin_url, linkedin_ai_pct) ON public.students TO anon, authenticated;

-- Open editing to match the rest of the /students page (see 20260719_students_public_editing).
GRANT UPDATE (linkedin_url, linkedin_ai_pct) ON public.students TO anon, authenticated;

-- ── Weekly connection counts — one row per (student, week 1–8) ───────────────
CREATE TABLE IF NOT EXISTS public.student_linkedin_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 8),
  connections INTEGER NOT NULL CHECK (connections >= 0),
  UNIQUE (student_id, week)
);

ALTER TABLE public.student_linkedin_stats ENABLE ROW LEVEL SECURITY;

-- Same open model as the rest of the students page: world-readable, and anyone
-- can log/adjust the numbers (no session on /students).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_linkedin_stats TO anon, authenticated;

CREATE POLICY "LinkedIn stats are viewable by everyone."
  ON public.student_linkedin_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can add LinkedIn stats."
  ON public.student_linkedin_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update LinkedIn stats."
  ON public.student_linkedin_stats FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can remove LinkedIn stats."
  ON public.student_linkedin_stats FOR DELETE USING (true);
