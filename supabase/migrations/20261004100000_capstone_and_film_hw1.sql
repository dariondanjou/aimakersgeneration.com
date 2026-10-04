-- October 2026 Film Cohort, Week 1 homework (Oct 4, 2026).
--
--   1. Every student profile gets a capstone project title and brief, which
--      only the owner (or an admin) can edit, like the other profile fields.
--   2. Film Homework 1 gets its real title and brief, replacing the
--      placeholder seeded in 20260929100000_separate_cohorts.sql.
-- Safe to re-run.

-- ── 1. Capstone project fields ──────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS capstone_title TEXT,
  ADD COLUMN IF NOT EXISTS capstone_brief TEXT;

GRANT UPDATE (capstone_title, capstone_brief) ON public.students TO authenticated;

-- ── 2. Film Homework 1 ──────────────────────────────────────────────────────
UPDATE public.assignments
   SET title = 'Capstone Project + a 1-Minute Film Made in ChatGPT',
       description = 'Decide on your capstone project and enter its title and a short brief on your profile. '
         || 'Gather every material you already have for it into one folder, projects/<your-capstone-project-name>, and keep saving all project materials there. '
         || 'Make a 1-minute film working entirely inside ChatGPT Desktop, having ChatGPT save your files into your local folders using a folder structure you agree with. '
         || 'Upload the finished film here by drag and drop.'
 WHERE cohort = 'october-2026-film' AND number = 1;
