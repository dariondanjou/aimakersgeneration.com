-- Cohort quizzes: AI-generated multiple-choice quizzes built at
-- /students/quiz-builder, published to the bottom of /students under QUIZZES,
-- and taken by students who pick their name from the roster. Full history of
-- quizzes and every attempt is kept for future statistics.
--
-- Writes to `quizzes` happen only through /api/quiz-generator (service role):
-- generation, regeneration, and publishing all run server-side, so anon gets
-- SELECT only. Attempts are inserted directly from the (auth-free) students
-- page, matching the site's open model.

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cohort TEXT NOT NULL DEFAULT 'summer-2026',

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  quiz_number INTEGER,                 -- assigned at publish: QUIZ #1, #2, …
  title TEXT,
  topics JSONB NOT NULL DEFAULT '[]',  -- the selected topic terms
  params JSONB NOT NULL DEFAULT '{}',  -- {question_count, timed, time_per_question, allow_back, timer_mode}
  questions JSONB NOT NULL DEFAULT '[]', -- [{question, options[4], correct, topic, explanation}]
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS quizzes_number_idx
  ON public.quizzes (cohort, quiz_number) WHERE quiz_number IS NOT NULL;

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quizzes are viewable by everyone."
  ON public.quizzes FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies: the API (service role) manages quizzes.
REVOKE INSERT, UPDATE, DELETE ON public.quizzes FROM anon, authenticated;
GRANT SELECT ON public.quizzes TO anon, authenticated;

-- ── Attempts: one row per completed run of a quiz by a student ──────────────
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,          -- chosen from the roster dropdown
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,

  answers JSONB NOT NULL DEFAULT '[]', -- [{q, selected, correct, seconds}]
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  duration_seconds NUMERIC,            -- wall-clock time for the whole attempt
  timed_out BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_idx ON public.quiz_attempts (quiz_id, student_name);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attempts are viewable by everyone."
  ON public.quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can record an attempt."
  ON public.quiz_attempts FOR INSERT WITH CHECK (true);
-- No UPDATE/DELETE: attempt history is append-only for honest statistics.
REVOKE UPDATE, DELETE ON public.quiz_attempts FROM anon, authenticated;
GRANT SELECT, INSERT ON public.quiz_attempts TO anon, authenticated;
