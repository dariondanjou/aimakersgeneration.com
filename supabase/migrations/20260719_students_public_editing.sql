-- Open editing for /students: no authentication anywhere on the page — anyone
-- who visits can edit profiles, upload media, and submit homework (per
-- request). Deadlines still apply to homework, and the columns that must not
-- be world-writable (email, user_id, slug, cohort, sort_order) are protected
-- by column-level UPDATE grants rather than policies.

-- Profile fields: writable by everyone, but only the display fields.
REVOKE UPDATE ON public.students FROM anon, authenticated;
GRANT UPDATE (full_name, headline, bio, goal, final_project_goal, avatar_url, links,
              city, current_work, ai_experience, coding_experience, something_made, eight_week_goal)
  ON public.students TO anon, authenticated;

DROP POLICY IF EXISTS "Students can update their own row; admins any row." ON public.students;
CREATE POLICY "Anyone can edit student profiles."
  ON public.students FOR UPDATE USING (true) WITH CHECK (true);

-- Media: anyone can add or remove.
DROP POLICY IF EXISTS "Students can add media to their own profile; admins to any." ON public.student_media;
CREATE POLICY "Anyone can add student media."
  ON public.student_media FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Students can remove media from their own profile; admins from any." ON public.student_media;
CREATE POLICY "Anyone can remove student media."
  ON public.student_media FOR DELETE USING (true);

-- Homework: anyone can submit or remove, but the deadline still applies.
DROP POLICY IF EXISTS "Students can submit their own homework before the deadline; admins anytime." ON public.student_submissions;
CREATE POLICY "Anyone can submit homework before the deadline."
  ON public.student_submissions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND now() <= a.due_at)
  );

DROP POLICY IF EXISTS "Students can remove their own submissions before the deadline; admins anytime." ON public.student_submissions;
CREATE POLICY "Anyone can remove submissions before the deadline."
  ON public.student_submissions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND now() <= a.due_at)
  );

-- Storage: uploads from the students page now live under public/<slug>/…,
-- writable without a session. (The per-uid folders from the signed-in era
-- keep their existing policies.)
CREATE POLICY "Anyone can upload to the public student folder."
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = 'public');

CREATE POLICY "Anyone can overwrite in the public student folder."
  ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = 'public');
