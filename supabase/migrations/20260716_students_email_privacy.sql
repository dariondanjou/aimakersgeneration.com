-- The students roster now holds real email addresses, and /students is public
-- and indexable — so the email column must not be readable through the anon
-- (or even authenticated) REST API. Postgres column-level REVOKE is a no-op
-- while a table-level SELECT grant exists, so: revoke table SELECT and
-- re-grant every column except email.
--
-- NOTE: clients must select explicit columns from students (select=* would
-- need privileges on all columns and now 42501s), and any column added to
-- students later must be added to this grant list to be visible.

REVOKE SELECT ON public.students FROM anon, authenticated;
GRANT SELECT (id, created_at, cohort, slug, full_name, headline, bio, goal,
              final_project_goal, avatar_url, links, user_id, sort_order)
  ON public.students TO anon, authenticated;

-- With email hidden from clients, the app can no longer match
-- session.user.email against students.email to detect ownership. Instead a
-- signed-in student calls this to claim their row; afterwards ownership is
-- simply user_id = auth.uid(). SECURITY DEFINER so it can read email and
-- bypass RLS for this one narrow write.
CREATE OR REPLACE FUNCTION public.claim_student_profile(profile_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.students
     SET user_id = auth.uid()
   WHERE slug = profile_slug
     AND user_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(auth.jwt() ->> 'email');

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_student_profile(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_student_profile(TEXT) TO authenticated;
