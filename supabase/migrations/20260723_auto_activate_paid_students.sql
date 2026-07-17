-- Auto-activate paid applicants at the DATABASE level.
--
-- Profiles were being created only by the app code (api/_lib/student-roster.js,
-- called from the Stripe webhook and confirm-payment). That misses any payment
-- recorded another way — most importantly a manual "paid" edit in the Supabase
-- dashboard, which bypasses the app entirely. That gap is how a paid student
-- (Chechey Williams) was left off the roster.
--
-- This trigger closes the gap: whenever a cohort_applications row is (or becomes)
-- paid, it creates the matching public /students/<slug> profile if one does not
-- already exist — no matter how "paid" was set.
--
-- It mirrors ensureStudentProfile: same headline, same field mapping, same slug
-- strategy, same "undecided" placeholder scrub. It is defensive — it NEVER
-- raises, so a hiccup here can never roll back the underlying payment write.

CREATE OR REPLACE FUNCTION public.create_student_from_paid_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source     text;
  v_base       text;
  v_last_init  text;
  v_candidate  text;
  v_candidates text[];
  v_count      int;
  i            int;
BEGIN
  -- Need an email + name to build a profile.
  IF NEW.email IS NULL OR NEW.full_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotent: skip if this email already has a student row.
  IF EXISTS (SELECT 1 FROM public.students WHERE lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;

  -- Base slug: first token of preferred_name (fallback full_name), split on the
  -- first whitespace or "(", lowercased, non-alphanumerics stripped.
  -- "Liana (lee-anna)" -> "liana"; empty -> "student".
  v_source := coalesce(nullif(btrim(NEW.preferred_name), ''), NEW.full_name);
  -- keep the first token, strip non-alphanumerics, then lowercase
  v_base := lower(regexp_replace(regexp_replace(btrim(v_source), '[[:space:](].*$', ''), '[^A-Za-z0-9]', '', 'g'));
  IF v_base IS NULL OR v_base = '' THEN
    v_base := 'student';
  END IF;

  -- Last-name initial, lowercased (used for the first fallback slug).
  v_last_init := lower(left(regexp_replace(btrim(NEW.full_name), '^.*[[:space:]]', ''), 1));
  v_last_init := regexp_replace(v_last_init, '[^a-z0-9]', '', 'g');

  -- Candidate slugs, in order: base, base+lastInitial (or base2), base2..base9.
  v_candidates := ARRAY[v_base];
  IF v_last_init <> '' THEN
    v_candidates := v_candidates || (v_base || v_last_init);
  ELSE
    v_candidates := v_candidates || (v_base || '2');
  END IF;
  FOR i IN 2..9 LOOP
    v_candidates := v_candidates || (v_base || i::text);
  END LOOP;

  SELECT count(*) INTO v_count FROM public.students;

  FOREACH v_candidate IN ARRAY v_candidates LOOP
    BEGIN
      INSERT INTO public.students (
        slug, full_name, headline, email,
        city, current_work, ai_experience, coding_experience,
        something_made, eight_week_goal, goal, final_project_goal,
        links, sort_order
      ) VALUES (
        v_candidate, NEW.full_name, 'AI Maker — Summer 2026 Cohort', NEW.email,
        NEW.city, NEW.current_work, NEW.ai_experience, NEW.coding_experience,
        NEW.something_made, NEW.eight_week_goal,
        -- Scrub "undecided" placeholders to NULL so the student fills them in.
        CASE WHEN lower(btrim(coalesce(NEW.goal, ''))) IN ('', 'i''m not sure yet', 'help me decide')
             THEN NULL ELSE btrim(NEW.goal) END,
        CASE WHEN lower(btrim(coalesce(NEW.final_project, ''))) IN ('', 'i''m not sure yet', 'help me decide')
             THEN NULL ELSE btrim(NEW.final_project) END,
        NEW.portfolio_url, v_count + 1
      );
      RETURN NEW;  -- created successfully
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;  -- slug taken (or a race) — try the next candidate
    END;
  END LOOP;

  RAISE WARNING 'create_student_from_paid_application: no free slug for %', NEW.email;
  RETURN NEW;

EXCEPTION
  -- Belt and braces: never let profile creation fail the payment write.
  WHEN OTHERS THEN
    RAISE WARNING 'create_student_from_paid_application failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_paid_student ON public.cohort_applications;
CREATE TRIGGER trg_activate_paid_student
  AFTER INSERT OR UPDATE ON public.cohort_applications
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION public.create_student_from_paid_application();

-- One-time backfill: activate any already-paid application that has no student
-- row yet. Setting status to itself fires the trigger above (which is a no-op
-- for applications that already have a profile).
UPDATE public.cohort_applications
SET status = status
WHERE status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.students s WHERE lower(s.email) = lower(cohort_applications.email)
  );
