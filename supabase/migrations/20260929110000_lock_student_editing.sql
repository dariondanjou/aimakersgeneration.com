-- Lock down /students editing. Reverses the open model from
-- 20260719_students_public_editing.sql and 20260722_student_linkedin.sql,
-- under which ANY anonymous visitor could rewrite any student's profile,
-- delete their media and homework, and overwrite their uploaded files.
--
-- Profiles stay world-READABLE (they are the public portfolios). Writes are
-- allowed only to the profile's owner — the signed-in user stamped on the row
-- (claim_student_profile), or whose sign-in email matches the row's email —
-- and to admins (public.is_admin()).
--
-- Ownership is checked in a SECURITY DEFINER helper because clients cannot
-- read students.email (20260716_students_email_privacy.sql), so a policy that
-- compared against it directly would fail with a permission error.
-- Safe to re-run.

-- ── Ownership helpers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_edit_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.id = p_student_id
         AND (s.user_id = auth.uid()
              OR (s.email IS NOT NULL AND lower(s.email) = lower(auth.jwt() ->> 'email')))
    )
  );
$$;

-- Storage paths are public/<slug>/…, so uploads are checked by slug.
CREATE OR REPLACE FUNCTION public.can_edit_student_slug(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.slug = p_slug
         AND (s.user_id = auth.uid()
              OR (s.email IS NOT NULL AND lower(s.email) = lower(auth.jwt() ->> 'email')))
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_student(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_student_slug(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_student_slug(TEXT) TO authenticated;

-- ── Profiles ────────────────────────────────────────────────────────────────
REVOKE UPDATE ON public.students FROM anon, authenticated;
GRANT UPDATE (full_name, headline, bio, goal, final_project_goal, avatar_url, links,
              city, current_work, ai_experience, coding_experience, something_made,
              eight_week_goal, linkedin_url, linkedin_ai_pct)
  ON public.students TO authenticated;

DROP POLICY IF EXISTS "Anyone can edit student profiles." ON public.students;
DROP POLICY IF EXISTS "Students can update their own row." ON public.students;
DROP POLICY IF EXISTS "Students can update their own row; admins any row." ON public.students;
CREATE POLICY "Owners and admins can edit student profiles."
  ON public.students FOR UPDATE TO authenticated
  USING (public.can_edit_student(id))
  WITH CHECK (public.can_edit_student(id));

-- ── Portfolio media ─────────────────────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.student_media FROM anon;

DROP POLICY IF EXISTS "Anyone can add student media." ON public.student_media;
DROP POLICY IF EXISTS "Anyone can remove student media." ON public.student_media;
DROP POLICY IF EXISTS "Students can add media to their own profile." ON public.student_media;
DROP POLICY IF EXISTS "Students can remove media from their own profile." ON public.student_media;
DROP POLICY IF EXISTS "Students can add media to their own profile; admins to any." ON public.student_media;
DROP POLICY IF EXISTS "Students can remove media from their own profile; admins from any." ON public.student_media;
CREATE POLICY "Owners and admins can add student media."
  ON public.student_media FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(student_id));
CREATE POLICY "Owners and admins can remove student media."
  ON public.student_media FOR DELETE TO authenticated
  USING (public.can_edit_student(student_id));

-- ── Homework ────────────────────────────────────────────────────────────────
-- Submitting stays open past the deadline (the late-stamp trigger flags it);
-- removal keeps the 20260815 rule: on-time work locks at the deadline, late
-- work can be swapped any time. Admins may do either at any time.
REVOKE INSERT, UPDATE, DELETE ON public.student_submissions FROM anon;

DROP POLICY IF EXISTS "Anyone can submit homework." ON public.student_submissions;
DROP POLICY IF EXISTS "Anyone can submit homework before the deadline." ON public.student_submissions;
DROP POLICY IF EXISTS "Anyone can remove submissions before the deadline." ON public.student_submissions;
DROP POLICY IF EXISTS "Anyone can remove submissions before the deadline, or late ones any time." ON public.student_submissions;
DROP POLICY IF EXISTS "Students can submit their own homework before the deadline." ON public.student_submissions;
DROP POLICY IF EXISTS "Students can remove their own submissions before the deadline." ON public.student_submissions;
DROP POLICY IF EXISTS "Students can submit their own homework before the deadline; admins anytime." ON public.student_submissions;
DROP POLICY IF EXISTS "Students can remove their own submissions before the deadline; admins anytime." ON public.student_submissions;
CREATE POLICY "Owners and admins can submit homework."
  ON public.student_submissions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(student_id));
CREATE POLICY "Owners can remove open or late homework; admins any."
  ON public.student_submissions FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.can_edit_student(student_id)
      AND (late OR EXISTS (SELECT 1 FROM public.assignments a
                            WHERE a.id = assignment_id AND now() <= a.due_at))
    )
  );

-- ── LinkedIn growth log (Summer jobs cohort) ────────────────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.student_linkedin_stats FROM anon;

DROP POLICY IF EXISTS "Anyone can add LinkedIn stats." ON public.student_linkedin_stats;
DROP POLICY IF EXISTS "Anyone can update LinkedIn stats." ON public.student_linkedin_stats;
DROP POLICY IF EXISTS "Anyone can remove LinkedIn stats." ON public.student_linkedin_stats;
CREATE POLICY "Owners and admins can add LinkedIn stats."
  ON public.student_linkedin_stats FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(student_id));
CREATE POLICY "Owners and admins can update LinkedIn stats."
  ON public.student_linkedin_stats FOR UPDATE TO authenticated
  USING (public.can_edit_student(student_id))
  WITH CHECK (public.can_edit_student(student_id));
CREATE POLICY "Owners and admins can remove LinkedIn stats."
  ON public.student_linkedin_stats FOR DELETE TO authenticated
  USING (public.can_edit_student(student_id));

-- ── Uploaded files (student-uploads bucket, public/<slug>/…) ────────────────
DROP POLICY IF EXISTS "Anyone can upload to the public student folder." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can overwrite in the public student folder." ON storage.objects;
CREATE POLICY "Owners and admins can upload to a student folder."
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-uploads'
    AND (storage.foldername(name))[1] = 'public'
    AND public.can_edit_student_slug((storage.foldername(name))[2])
  );
CREATE POLICY "Owners and admins can overwrite in a student folder."
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-uploads'
    AND (storage.foldername(name))[1] = 'public'
    AND public.can_edit_student_slug((storage.foldername(name))[2])
  );
