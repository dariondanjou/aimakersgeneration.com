-- Separate the Summer 2026 jobs cohort from the October 2026 Film Cohort.
--
-- students.cohort defaults to 'summer-2026', and the paid-application trigger
-- (20260723_auto_activate_paid_students.sql) never set it — so every October
-- enrollee was filed under Summer with the headline "AI Maker — Summer 2026
-- Cohort". The trigger was also idempotent per EMAIL, so a Summer alum who
-- enrolled in October got no October profile at all.
--
-- This migration:
--   1. re-files October enrollees who landed in Summer,
--   2. makes the trigger cohort-aware (one profile per email PER cohort),
--   3. backfills profiles for paid enrollees still missing one in their cohort,
--   4. seeds the October homework schedule.
-- Safe to re-run.

-- ── 1. Re-file mislabeled October enrollees ─────────────────────────────────
-- A Summer-labelled row belongs to October when the person paid for October
-- and never paid for Summer. (Summer alums keep their Summer row; step 3 gives
-- them a separate October one.)
UPDATE public.students s
   SET cohort = 'october-2026-film',
       headline = CASE
         WHEN s.headline IS NULL
           OR s.headline IN ('AI Maker — Summer 2026 Cohort', 'AI Maker - Summer 2026 Cohort')
         THEN 'AI Filmmaker — October 2026 Film Cohort'
         ELSE s.headline
       END
 WHERE s.cohort = 'summer-2026'
   AND s.email IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.cohort_applications a
      WHERE lower(a.email) = lower(s.email)
        AND a.cohort = 'october-2026-film' AND a.status = 'paid')
   AND NOT EXISTS (
     SELECT 1 FROM public.cohort_applications a
      WHERE lower(a.email) = lower(s.email)
        AND a.cohort = 'summer-2026' AND a.status = 'paid');

CREATE INDEX IF NOT EXISTS students_cohort_idx ON public.students (cohort, sort_order);

-- ── 2. Cohort-aware profile creation ────────────────────────────────────────
-- Same slug strategy and field mapping as before, plus: the row is filed under
-- the application's cohort, gets that cohort's headline, is idempotent per
-- (email, cohort), and sorts within its own cohort.
CREATE OR REPLACE FUNCTION public.create_student_from_paid_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort     text;
  v_headline   text;
  v_source     text;
  v_base       text;
  v_last_init  text;
  v_candidate  text;
  v_candidates text[];
  v_count      int;
  i            int;
BEGIN
  IF NEW.email IS NULL OR NEW.full_name IS NULL THEN
    RETURN NEW;
  END IF;

  v_cohort := coalesce(nullif(btrim(NEW.cohort), ''), 'summer-2026');
  v_headline := CASE v_cohort
    WHEN 'october-2026-film' THEN 'AI Filmmaker — October 2026 Film Cohort'
    WHEN 'summer-2026'       THEN 'AI Maker — Summer 2026 Cohort'
    ELSE 'AI Maker — AIMG Cohort'
  END;

  -- Idempotent per cohort: skip if this email already has a row in THIS cohort.
  IF EXISTS (
    SELECT 1 FROM public.students
     WHERE lower(email) = lower(NEW.email) AND cohort = v_cohort
  ) THEN
    RETURN NEW;
  END IF;

  v_source := coalesce(nullif(btrim(NEW.preferred_name), ''), NEW.full_name);
  v_base := lower(regexp_replace(regexp_replace(btrim(v_source), '[[:space:](].*$', ''), '[^A-Za-z0-9]', '', 'g'));
  IF v_base IS NULL OR v_base = '' THEN
    v_base := 'student';
  END IF;

  v_last_init := lower(left(regexp_replace(btrim(NEW.full_name), '^.*[[:space:]]', ''), 1));
  v_last_init := regexp_replace(v_last_init, '[^a-z0-9]', '', 'g');

  v_candidates := ARRAY[v_base];
  IF v_last_init <> '' THEN
    v_candidates := v_candidates || (v_base || v_last_init);
  ELSE
    v_candidates := v_candidates || (v_base || '2');
  END IF;
  FOR i IN 2..9 LOOP
    v_candidates := v_candidates || (v_base || i::text);
  END LOOP;

  SELECT count(*) INTO v_count FROM public.students WHERE cohort = v_cohort;

  FOREACH v_candidate IN ARRAY v_candidates LOOP
    BEGIN
      INSERT INTO public.students (
        cohort, slug, full_name, headline, email,
        city, current_work, ai_experience, coding_experience,
        something_made, eight_week_goal, goal, final_project_goal,
        links, sort_order
      ) VALUES (
        v_cohort, v_candidate, NEW.full_name, v_headline, NEW.email,
        NEW.city, NEW.current_work, NEW.ai_experience, NEW.coding_experience,
        NEW.something_made, NEW.eight_week_goal,
        CASE WHEN lower(btrim(coalesce(NEW.goal, ''))) IN ('', 'i''m not sure yet', 'help me decide')
             THEN NULL ELSE btrim(NEW.goal) END,
        CASE WHEN lower(btrim(coalesce(NEW.final_project, ''))) IN ('', 'i''m not sure yet', 'help me decide')
             THEN NULL ELSE btrim(NEW.final_project) END,
        NEW.portfolio_url, v_count + 1
      );
      RETURN NEW;
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;

  RAISE WARNING 'create_student_from_paid_application: no free slug for %', NEW.email;
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'create_student_from_paid_application failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- ── 3. Backfill: paid enrollees with no profile in their own cohort ─────────
UPDATE public.cohort_applications a
   SET status = status
 WHERE a.status = 'paid'
   AND NOT EXISTS (
     SELECT 1 FROM public.students s
      WHERE lower(s.email) = lower(a.email)
        AND s.cohort = coalesce(nullif(btrim(a.cohort), ''), 'summer-2026'));

-- ── 4. October homework schedule ────────────────────────────────────────────
-- Four Saturdays (Oct 3, 10, 17, 24), 1–4 PM ET. Film homework handed out in
-- sessions 1–3 is due at the start (1:00 PM EDT) of the next session for
-- critique. Titles are placeholders — admins edit them like Summer's.
INSERT INTO public.assignments (cohort, number, week_assigned, week_due, title, description, assigned_on, due_at) VALUES
  ('october-2026-film', 1, 1, 2, 'Film Homework 1 (placeholder)', 'Brief handed out at Session 1. Bring it to Session 2 for critique.', '2026-10-03', '2026-10-10 13:00:00-04'),
  ('october-2026-film', 2, 2, 3, 'Film Homework 2 (placeholder)', 'Brief handed out at Session 2. Bring it to Session 3 for critique.', '2026-10-10', '2026-10-17 13:00:00-04'),
  ('october-2026-film', 3, 3, 4, 'Film Homework 3 (placeholder)', 'Brief handed out at Session 3. Bring it to Session 4 for critique.', '2026-10-17', '2026-10-24 13:00:00-04')
ON CONFLICT (cohort, number) DO NOTHING;
