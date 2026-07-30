-- Verified homework checklist: each submission is scanned by the server
-- (/api/scan-homework, Claude with the service role) for relevance to its
-- assignment. The profile page's checklist circle for a week only checks once
-- at least one submission for that week's assignment scans as relevant.
--
-- scan_status lifecycle: 'pending' (just uploaded) → 'relevant' | 'off_topic'
-- | 'error' (scan failed; can be retried). There is intentionally NO client
-- UPDATE policy on student_submissions, so only the server (service role) can
-- write scan results — students cannot mark their own homework as verified.

ALTER TABLE public.student_submissions
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'relevant', 'off_topic', 'error')),
  ADD COLUMN IF NOT EXISTS scan_note TEXT;
