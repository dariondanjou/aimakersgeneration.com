-- Cohort student showcase: /students (grid) and /students/<slug> (profile).
--
-- Students are created by admins (Supabase dashboard / SQL — service role).
-- A student "claims" their row by signing in at /community with the email on
-- the row; the app then stamps user_id and they can edit their own profile,
-- upload media, and submit homework.
--
-- Summer 2026 cohort: eight Saturday sessions, 1:00–4:00 PM ET (Atlanta),
-- July 18 → September 5. Homework handed out in weeks 1–7 is due at 1:00 PM
-- ET the following Saturday, so weeks 2–8 each have a deadline — 7 total.

-- ── Students ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cohort TEXT NOT NULL DEFAULT 'summer-2026',

  slug TEXT NOT NULL UNIQUE,          -- /students/liana
  full_name TEXT NOT NULL,
  headline TEXT,                      -- LinkedIn-style one-liner under the name
  bio TEXT,
  goal TEXT,                          -- their goal for the cohort
  final_project_goal TEXT,            -- their final assignment / project goal
  avatar_url TEXT,
  links TEXT,                         -- comma-separated URLs (same convention as profiles UI)

  email TEXT,                         -- used to claim the row on first sign-in
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students are viewable by everyone."
  ON public.students FOR SELECT USING (true);

-- Owner = the auth user stamped on the row, or a signed-in user whose email
-- matches (that is how the row gets claimed in the first place).
CREATE POLICY "Students can update their own row."
  ON public.students FOR UPDATE
  USING (user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'));
-- No INSERT/DELETE policies: admins manage the roster with the service role.

-- ── Assignments (placeholders — admins edit title/description later) ───────
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cohort TEXT NOT NULL DEFAULT 'summer-2026',

  number INTEGER NOT NULL,            -- Homework 1..7
  week_assigned INTEGER NOT NULL,     -- session week it is handed out (1..7)
  week_due INTEGER NOT NULL,          -- session week it is due (2..8)
  title TEXT NOT NULL,
  description TEXT,
  assigned_on DATE NOT NULL,          -- the Saturday session it is handed out
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 1:00 PM ET the following Saturday

  UNIQUE (cohort, number)
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments are viewable by everyone."
  ON public.assignments FOR SELECT USING (true);
-- No write policies: admins update assignments with the service role.

INSERT INTO public.assignments (number, week_assigned, week_due, title, description, assigned_on, due_at) VALUES
  (1, 1, 2, 'Homework 1 (placeholder)', 'Assignment brief coming soon — handed out at the Week 1 session.', '2026-07-18', '2026-07-25 13:00:00-04'),
  (2, 2, 3, 'Homework 2 (placeholder)', 'Assignment brief coming soon — handed out at the Week 2 session.', '2026-07-25', '2026-08-01 13:00:00-04'),
  (3, 3, 4, 'Homework 3 (placeholder)', 'Assignment brief coming soon — handed out at the Week 3 session.', '2026-08-01', '2026-08-08 13:00:00-04'),
  (4, 4, 5, 'Homework 4 (placeholder)', 'Assignment brief coming soon — handed out at the Week 4 session.', '2026-08-08', '2026-08-15 13:00:00-04'),
  (5, 5, 6, 'Homework 5 (placeholder)', 'Assignment brief coming soon — handed out at the Week 5 session.', '2026-08-15', '2026-08-22 13:00:00-04'),
  (6, 6, 7, 'Homework 6 (placeholder)', 'Assignment brief coming soon — handed out at the Week 6 session.', '2026-08-22', '2026-08-29 13:00:00-04'),
  (7, 7, 8, 'Homework 7 (placeholder)', 'Assignment brief coming soon — handed out at the Week 7 session.', '2026-08-29', '2026-09-05 13:00:00-04')
ON CONFLICT (cohort, number) DO NOTHING;

-- ── Homework submissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS student_submissions_student_idx
  ON public.student_submissions (student_id, assignment_id);

ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submissions are viewable by everyone."
  ON public.student_submissions FOR SELECT USING (true);

-- Students may add/remove their own submissions, but only before the deadline.
CREATE POLICY "Students can submit their own homework before the deadline."
  ON public.student_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND now() <= a.due_at
    )
  );

CREATE POLICY "Students can remove their own submissions before the deadline."
  ON public.student_submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id AND now() <= a.due_at
    )
  );

-- ── Profile media (images, videos, links) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'link')),
  url TEXT NOT NULL,
  title TEXT
);

CREATE INDEX IF NOT EXISTS student_media_student_idx
  ON public.student_media (student_id);

ALTER TABLE public.student_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student media is viewable by everyone."
  ON public.student_media FOR SELECT USING (true);

CREATE POLICY "Students can add media to their own profile."
  ON public.student_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
  );

CREATE POLICY "Students can remove media from their own profile."
  ON public.student_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
    )
  );

-- ── Storage: student uploads (avatars, media, homework files) ──────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-uploads', 'student-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Student uploads are publicly readable."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-uploads');

-- Files live under <auth uid>/... so each signed-in user can only touch their
-- own folder (same convention as the avatars bucket).
CREATE POLICY "Users can upload to their own student folder."
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own student uploads."
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own student uploads."
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Roster seed ─────────────────────────────────────────────────────────────
-- Example student so /students renders before the real roster is loaded.
-- Admins: add the real cohort with rows like this (set email so the student
-- can claim the profile by signing in at /community with that address).
INSERT INTO public.students (slug, full_name, headline, sort_order)
VALUES ('liana', 'Liana', 'AI Maker — Summer 2026 Cohort', 1)
ON CONFLICT (slug) DO NOTHING;
