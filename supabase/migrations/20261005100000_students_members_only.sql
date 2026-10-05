-- /students becomes members-only (Oct 5, 2026).
--
-- Until now every student table was world-readable (the public showcase).
-- From here on, only signed-in cohort members can read them: anyone with a
-- students row in any cohort (matched by user_id or sign-in email) and
-- admins. Writes are unchanged (20260929110000_lock_student_editing.sql).
--
--   1. is_cohort_member(): the membership check used by every read policy.
--   2. claim_my_student_profiles(): stamps the caller's user_id on every
--      unclaimed row with their sign-in email, so the site nav (which looks
--      rows up by user_id) recognizes a student the first time they sign in.
--   3. Read policies on the student tables switch to members-only.
--   4. A private bucket for session handouts; files are served to members
--      through short-lived signed URLs from /api/cohort-resources.
-- Safe to re-run.

-- ── 1. Membership ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_cohort_member()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.user_id = auth.uid()
          OR (s.email IS NOT NULL AND lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_cohort_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_cohort_member() TO authenticated;

-- ── 2. Claim every matching profile ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_my_student_profiles()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt() ->> 'email', '') = '' THEN
    RETURN 0;
  END IF;
  UPDATE public.students
     SET user_id = auth.uid()
   WHERE user_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(auth.jwt() ->> 'email');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_my_student_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_my_student_profiles() TO authenticated;

-- ── 3. Members-only reads ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Students are viewable by everyone." ON public.students;
DROP POLICY IF EXISTS "Cohort members can view students." ON public.students;
CREATE POLICY "Cohort members can view students."
  ON public.students FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "Assignments are viewable by everyone." ON public.assignments;
DROP POLICY IF EXISTS "Cohort members can view assignments." ON public.assignments;
CREATE POLICY "Cohort members can view assignments."
  ON public.assignments FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "Submissions are viewable by everyone." ON public.student_submissions;
DROP POLICY IF EXISTS "Cohort members can view submissions." ON public.student_submissions;
CREATE POLICY "Cohort members can view submissions."
  ON public.student_submissions FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "Student media is viewable by everyone." ON public.student_media;
DROP POLICY IF EXISTS "Cohort members can view student media." ON public.student_media;
CREATE POLICY "Cohort members can view student media."
  ON public.student_media FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "LinkedIn stats are viewable by everyone." ON public.student_linkedin_stats;
DROP POLICY IF EXISTS "Cohort members can view LinkedIn stats." ON public.student_linkedin_stats;
CREATE POLICY "Cohort members can view LinkedIn stats."
  ON public.student_linkedin_stats FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "Quizzes are viewable by everyone." ON public.quizzes;
DROP POLICY IF EXISTS "Cohort members can view quizzes." ON public.quizzes;
CREATE POLICY "Cohort members can view quizzes."
  ON public.quizzes FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "Attempts are viewable by everyone." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Cohort members can view quiz attempts." ON public.quiz_attempts;
CREATE POLICY "Cohort members can view quiz attempts."
  ON public.quiz_attempts FOR SELECT TO authenticated USING (public.is_cohort_member());

DROP POLICY IF EXISTS "Progress is viewable by everyone." ON public.quiz_progress;
DROP POLICY IF EXISTS "Cohort members can view quiz progress." ON public.quiz_progress;
CREATE POLICY "Cohort members can view quiz progress."
  ON public.quiz_progress FOR SELECT TO authenticated USING (public.is_cohort_member());

-- ── 4. Private bucket for session handouts ──────────────────────────────────
-- No storage policies: only the service role (the API) reads it.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cohort-materials', 'cohort-materials', false)
ON CONFLICT (id) DO UPDATE SET public = false;
