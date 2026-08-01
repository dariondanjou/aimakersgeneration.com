-- Live quiz progress: one row per (quiz, student), upserted by the quiz page
-- as a student moves through questions and marked completed on submit. Powers
-- the live session dashboard at the bottom of /students so the instructor can
-- see who is still busy, which question they're on, and who has finished.
-- A retake overwrites the student's row and the session starts fresh.

CREATE TABLE IF NOT EXISTS public.quiz_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'taking' CHECK (status IN ('taking', 'completed')),
  current_question INTEGER NOT NULL DEFAULT 0,  -- 0-based index of the question on screen
  answered INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  score INTEGER,                                -- filled in on completion

  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- One live row per student per quiz; the client upserts on this pair.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_progress_quiz_student_idx
  ON public.quiz_progress (quiz_id, student_name);

ALTER TABLE public.quiz_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progress is viewable by everyone."
  ON public.quiz_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can start progress."
  ON public.quiz_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update progress."
  ON public.quiz_progress FOR UPDATE USING (true) WITH CHECK (true);
-- No DELETE from the browser; rows age out of the dashboard's activity window.
REVOKE DELETE ON public.quiz_progress FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quiz_progress TO anon, authenticated;
