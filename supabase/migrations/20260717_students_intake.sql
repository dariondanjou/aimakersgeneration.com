-- Surface the intake-form (cohort application) answers on the public student
-- profiles. Deliberately NOT copied over: email + phone (contact info),
-- accommodations (potentially sensitive), consent checkboxes (legal
-- acknowledgements), heard_about / can_attend (logistics, not profile
-- content). portfolio_url was already merged into students.links.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS current_work TEXT,
  ADD COLUMN IF NOT EXISTS ai_experience TEXT,
  ADD COLUMN IF NOT EXISTS coding_experience TEXT,
  ADD COLUMN IF NOT EXISTS something_made TEXT,
  ADD COLUMN IF NOT EXISTS eight_week_goal TEXT;

-- students SELECT is granted per-column (see 20260716_students_email_privacy),
-- so each new column needs an explicit grant to be client-visible.
GRANT SELECT (city, current_work, ai_experience, coding_experience, something_made, eight_week_goal)
  ON public.students TO anon, authenticated;

-- Populate from the paid applications (matched by the email the student
-- applied with). COALESCE keeps any value already edited on the profile.
UPDATE public.students s
SET city               = COALESCE(s.city, a.city),
    current_work       = COALESCE(s.current_work, a.current_work),
    ai_experience      = COALESCE(s.ai_experience, a.ai_experience),
    coding_experience  = COALESCE(s.coding_experience, a.coding_experience),
    something_made     = COALESCE(s.something_made, a.something_made),
    eight_week_goal    = COALESCE(s.eight_week_goal, a.eight_week_goal),
    goal               = COALESCE(s.goal, a.goal),
    final_project_goal = COALESCE(s.final_project_goal, a.final_project)
FROM public.cohort_applications a
WHERE a.status = 'paid'
  AND s.email IS NOT NULL
  AND lower(a.email) = lower(s.email);
