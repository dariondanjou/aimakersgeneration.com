-- Where in the session recording a student's critique starts, e.g.
-- '0:12:30' (or several, '0:12:30 · shot list 1:42:40'), shown beside their
-- feedback on the profile and in the homework email. Safe to re-run.
ALTER TABLE public.student_feedback
  ADD COLUMN IF NOT EXISTS recording_at TEXT;
