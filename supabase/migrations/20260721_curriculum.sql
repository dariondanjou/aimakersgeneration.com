-- Curriculum editor + generated slide decks for the cohort admin area.
--
-- curriculum_weeks: one row per session. content is the structured page the
-- admin edits inline (every line carries an optional note). Editing sets
-- dirty=true; regenerating that week's deck folds the edits+notes into the
-- slides and clears the flag.
-- cohort_decks: the generated slides (JSON) rendered by the deck viewer.
--
-- Both tables are curriculum IP: RLS enabled with NO policies — service role
-- only, reachable exclusively through the admin-key-gated /api endpoints.

CREATE TABLE IF NOT EXISTS public.curriculum_weeks (
  week INTEGER PRIMARY KEY CHECK (week BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  content JSONB NOT NULL,
  dirty BOOLEAN NOT NULL DEFAULT false,   -- true = edited since last deck regeneration
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.curriculum_weeks ENABLE ROW LEVEL SECURITY;
-- No policies. Service role only.

CREATE TABLE IF NOT EXISTS public.cohort_decks (
  week INTEGER PRIMARY KEY CHECK (week BETWEEN 1 AND 8) REFERENCES public.curriculum_weeks(week),
  slides JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cohort_decks ENABLE ROW LEVEL SECURITY;
-- No policies. Service role only.
