-- October 2026 Film Cohort, Week 3 (Oct 18, 2026).
--
--   1. Film Homework 3 gets its real title and brief, replacing the
--      placeholder seeded in 20260929100000_separate_cohorts.sql (dates were
--      already right: assigned 2026-10-17, due 2026-10-24 13:00 ET). The
--      description is what /api/scan-homework checks each upload against.
--   2. student_feedback: the mentors' notes on a student's work from a
--      session, shown on that student's own profile. Feedback is personal, so
--      only the student it belongs to (matched by account or sign-in email)
--      and admins can read it; rows are written with the service role
--      (scripts/add-student-feedback.mjs), never from the client.
-- Mirrors 20261010110000_film_hw2.sql. Safe to re-run.

-- ── 1. Film Homework 3 ──────────────────────────────────────────────────────
UPDATE public.assignments
   SET title = 'Your Final Capstone: 2 Perfect Minutes',
       description =
         'Finish your capstone project, due at the start of Session 4 (final presentations). '
         || 'It must be at least 2 minutes long and every second of it perfect — it can be an excerpt of a longer project. '
         || 'You can go past 2 minutes, but any extra minutes or seconds must be just as perfectly executed, using intentional style-reference choices. '
         || 'Put the Session 3 notes to work: one cinematic look per scene from a real style reference, references built before the story, '
         || 'dramatic lighting instead of the flat AI default, inserts and sound design to cover AI mistakes, and clean continuity. '
         || 'Ask the mentors for help along the way: share your script, shot list, stills, prompts and problem generations in the WhatsApp group before you spend credits. '
         || 'Turn it in by dragging the finished film into the This Week box on your profile, or paste a YouTube, Vimeo, or Google Drive link if it is too big.'
 WHERE cohort = 'october-2026-film' AND number = 3;

-- ── 2. Per-student session feedback ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  session_date DATE,
  project TEXT,                          -- what was reviewed, e.g. the capstone cut
  working TEXT,                          -- what's working
  notes JSONB NOT NULL DEFAULT '[]',     -- array of strings: the fixes, in order
  next_step TEXT,                        -- the one thing to focus on next
  given_by TEXT,                         -- e.g. 'Darion D''Anjou & Gheri Thomas'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, week)
);

CREATE INDEX IF NOT EXISTS student_feedback_student_idx
  ON public.student_feedback (student_id, week);

-- Is the caller the student on this profile? SECURITY DEFINER because
-- students.email has no client SELECT grant (20260716_students_email_privacy),
-- so the check can't run as the caller. Same match as is_cohort_member().
CREATE OR REPLACE FUNCTION public.is_own_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.students s
     WHERE s.id = p_student_id
       AND (s.user_id = auth.uid()
            OR (s.email IS NOT NULL AND lower(s.email) = lower(auth.jwt() ->> 'email')))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_own_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_student(UUID) TO authenticated;

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_feedback FROM anon, authenticated;
GRANT SELECT ON public.student_feedback TO authenticated;

DROP POLICY IF EXISTS "Students can view their own feedback." ON public.student_feedback;
CREATE POLICY "Students can view their own feedback."
  ON public.student_feedback FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_own_student(student_id));
