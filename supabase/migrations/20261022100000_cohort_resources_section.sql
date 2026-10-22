-- Extra sessions inside a week (Oct 22, 2026).
--
-- A week's materials normally belong to its Saturday session. A bonus session
-- in the same week (e.g. Week 3's Wednesday session with mentor Steffin
-- Flickinger) gets its own block on /students: rows sharing a non-null
-- `section` are grouped under that label after the week's main materials, and
-- `section_date` is the day it was held. NULL keeps the old behavior.
-- Safe to re-run.

ALTER TABLE public.cohort_resources ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.cohort_resources ADD COLUMN IF NOT EXISTS section_date DATE;
