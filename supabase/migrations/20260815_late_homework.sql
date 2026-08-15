-- Late homework: the deadline no longer closes the drop zone. Students can
-- still turn in work after 1:00 PM ET on the due date — it just goes in
-- flagged as late (the profile shows an amber outline / "Late" chip for it).
--
-- `late` is stamped by a BEFORE INSERT trigger from the assignment's due_at,
-- so the client can't choose it, and since there is intentionally no client
-- UPDATE policy on student_submissions it can't be cleared afterwards either.

ALTER TABLE public.student_submissions
  ADD COLUMN IF NOT EXISTS late BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.stamp_submission_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT (now() > a.due_at) INTO NEW.late
  FROM public.assignments a
  WHERE a.id = NEW.assignment_id;
  NEW.late := COALESCE(NEW.late, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_submissions_stamp_late ON public.student_submissions;
CREATE TRIGGER student_submissions_stamp_late
  BEFORE INSERT ON public.student_submissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_submission_late();

-- Backfill: anything recorded after its deadline (service-role inserts) is late.
UPDATE public.student_submissions s
SET late = true
FROM public.assignments a
WHERE a.id = s.assignment_id AND s.created_at > a.due_at AND s.late = false;

-- Submitting is open at any time now (the trigger marks it late past the deadline).
DROP POLICY IF EXISTS "Anyone can submit homework before the deadline." ON public.student_submissions;
DROP POLICY IF EXISTS "Anyone can submit homework." ON public.student_submissions;
CREATE POLICY "Anyone can submit homework."
  ON public.student_submissions FOR INSERT WITH CHECK (true);

-- Removal: on-time work locks once the deadline passes (the record of what
-- went in on time stays put); late submissions can be swapped out any time.
DROP POLICY IF EXISTS "Anyone can remove submissions before the deadline." ON public.student_submissions;
DROP POLICY IF EXISTS "Anyone can remove submissions before the deadline, or late ones any time." ON public.student_submissions;
CREATE POLICY "Anyone can remove submissions before the deadline, or late ones any time."
  ON public.student_submissions FOR DELETE
  USING (
    late
    OR EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND now() <= a.due_at)
  );
