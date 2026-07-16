-- Let admins edit any student profile (photo, fields, media) — students have
-- not all signed in yet, and organizers need to populate profiles for them.
--
-- Admin membership lives in a table (RLS policies cannot read env vars, so
-- ADMIN_USER_IDS cannot gate SQL). Add an admin with:
--   INSERT INTO public.admin_users (user_id) VALUES ('<auth.users id>');

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- A signed-in user may check only their own membership (the client uses this
-- to decide whether to show edit controls); managing the list is service-role.
CREATE POLICY "Users can read their own admin flag."
  ON public.admin_users FOR SELECT USING (user_id = auth.uid());

-- Darion (dariondanjou@gmail.com)
INSERT INTO public.admin_users (user_id)
VALUES ('d6fec36c-0bda-412d-9aef-d4161a36be17')
ON CONFLICT (user_id) DO NOTHING;

-- SECURITY DEFINER so policies on other tables can consult admin_users
-- without granting broad read access to it.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Widen the write policies: owner OR admin.
DROP POLICY IF EXISTS "Students can update their own row." ON public.students;
CREATE POLICY "Students can update their own row; admins any row."
  ON public.students FOR UPDATE
  USING (user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email') OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email') OR public.is_admin());

DROP POLICY IF EXISTS "Students can add media to their own profile." ON public.student_media;
CREATE POLICY "Students can add media to their own profile; admins to any."
  ON public.student_media FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS "Students can remove media from their own profile." ON public.student_media;
CREATE POLICY "Students can remove media from their own profile; admins from any."
  ON public.student_media FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
  );

-- Homework: admins may add/remove submissions for any student, without the
-- deadline restriction (e.g. attaching work a student sent by email).
DROP POLICY IF EXISTS "Students can submit their own homework before the deadline." ON public.student_submissions;
CREATE POLICY "Students can submit their own homework before the deadline; admins anytime."
  ON public.student_submissions FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
          AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
      )
      AND EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = assignment_id AND now() <= a.due_at
      )
    )
  );

DROP POLICY IF EXISTS "Students can remove their own submissions before the deadline." ON public.student_submissions;
CREATE POLICY "Students can remove their own submissions before the deadline; admins anytime."
  ON public.student_submissions FOR DELETE
  USING (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_id
          AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
      )
      AND EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = assignment_id AND now() <= a.due_at
      )
    )
  );
