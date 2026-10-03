-- October 2026 Film Cohort roster moves (Oct 3, 2026).
--
--   1. Erica Chisholm (Summer 2026 jobs cohort) joins the film cohort: her
--      Summer profile is copied into a new October row — same person, same
--      login, same portfolio media — and her Summer row stays as it was.
--   2. Shaye leaves the film cohort and becomes an early registrant for the
--      Winter 2027 Jobs Cohort (January): her profile and her application are
--      re-filed under 'winter-2027-jobs', so she no longer appears on the
--      October roster and the paid-application backfill won't recreate it.
--   3. The paid-application trigger learns the Winter cohort's headline.
--
-- Names are matched as stored: Erica's row is spelled "Chisolm", and Shaye's
-- is "Shaýe Joan Gbefwi" (accented, hence 'sha_e %').
--
-- Each move refuses to guess: it aborts unless the name matches exactly one
-- row. Safe to re-run (a move that's already done is skipped).

-- ── 1. Erica Chisholm → October film cohort ─────────────────────────────────
DO $$
DECLARE
  v_src     public.students%ROWTYPE;
  v_n       int;
  v_new_id  uuid;
  v_slug    text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.students
              WHERE cohort = 'october-2026-film'
                AND lower(btrim(full_name)) IN ('erica chisholm', 'erica chisolm')) THEN
    RAISE NOTICE 'Erica Chisholm already has an October profile — skipped.';
    RETURN;
  END IF;

  SELECT count(*) INTO v_n FROM public.students
   WHERE cohort <> 'october-2026-film' AND lower(btrim(full_name)) IN ('erica chisholm', 'erica chisolm');
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one earlier profile for Erica Chisholm, found %', v_n;
  END IF;

  SELECT * INTO v_src FROM public.students
   WHERE cohort <> 'october-2026-film' AND lower(btrim(full_name)) IN ('erica chisholm', 'erica chisolm');

  -- Slugs are global; the Summer row keeps hers, so pick the next free one.
  v_slug := v_src.slug || '-film';
  WHILE EXISTS (SELECT 1 FROM public.students WHERE slug = v_slug) LOOP
    v_slug := v_slug || '2';
  END LOOP;

  INSERT INTO public.students (
    cohort, slug, full_name, headline, bio, goal, final_project_goal,
    avatar_url, links, email, user_id,
    city, current_work, ai_experience, coding_experience, something_made,
    sort_order
  ) VALUES (
    'october-2026-film', v_slug, v_src.full_name,
    'AI Filmmaker — October 2026 Film Cohort',
    v_src.bio, v_src.goal, NULL,
    v_src.avatar_url, v_src.links, v_src.email, v_src.user_id,
    v_src.city, v_src.current_work, v_src.ai_experience, v_src.coding_experience, v_src.something_made,
    (SELECT coalesce(max(sort_order), 0) + 1 FROM public.students WHERE cohort = 'october-2026-film')
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.student_media (student_id, kind, url, title, created_at)
  SELECT v_new_id, kind, url, title, created_at
    FROM public.student_media WHERE student_id = v_src.id;

  RAISE NOTICE 'Erica Chisholm added to the October film cohort at /students/%', v_slug;
END $$;

-- ── 2. Shaye → Winter 2027 Jobs Cohort early registrant ─────────────────────
DO $$
DECLARE
  v_id    uuid;
  v_email text;
  v_n     int;
BEGIN
  SELECT count(*) INTO v_n FROM public.students
   WHERE cohort = 'october-2026-film' AND full_name ILIKE 'sha_e %';
  IF v_n = 0 THEN
    RAISE NOTICE 'No Shaye on the October roster — skipped.';
    RETURN;
  ELSIF v_n > 1 THEN
    RAISE EXCEPTION 'Expected one Shaye on the October roster, found %', v_n;
  END IF;

  SELECT id, email INTO v_id, v_email FROM public.students
   WHERE cohort = 'october-2026-film' AND full_name ILIKE 'sha_e %';

  UPDATE public.students
     SET cohort = 'winter-2027-jobs',
         headline = 'AI Maker — Winter 2027 Jobs Cohort',
         sort_order = (SELECT coalesce(max(sort_order), 0) + 1 FROM public.students WHERE cohort = 'winter-2027-jobs')
   WHERE id = v_id;

  IF v_email IS NOT NULL THEN
    UPDATE public.cohort_applications
       SET cohort = 'winter-2027-jobs'
     WHERE cohort = 'october-2026-film' AND lower(email) = lower(v_email);
  END IF;

  RAISE NOTICE 'Shaye moved to the Winter 2027 Jobs Cohort (early registrant).';
END $$;

-- ── 3. Winter headline in the paid-application trigger ──────────────────────
-- Same function as 20260929100000_separate_cohorts.sql, plus the Winter case.
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
    WHEN 'winter-2027-jobs'  THEN 'AI Maker — Winter 2027 Jobs Cohort'
    WHEN 'october-2026-film' THEN 'AI Filmmaker — October 2026 Film Cohort'
    WHEN 'summer-2026'       THEN 'AI Maker — Summer 2026 Cohort'
    ELSE 'AI Maker — AIMG Cohort'
  END;

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
