-- Film contest: submissions move from Google Drive to Vercel Blob.
--
--   contest_submissions.drive_name     → file_name  (YYYY-MM-DD-HHMMSS_FirstNameLastName_<file>)
--   contest_submissions.drive_file_id  → dropped
--   contest_submissions.drive_url      → dropped; file_url is the film's Blob URL
--   contest_submissions.file_pathname  → the Blob pathname the API reserved for
--                                        the upload (checked when it finishes)
--
-- No films had been submitted through Drive when this ran, so nothing is
-- carried over. contest_entries is recreated with the new columns.

DROP VIEW IF EXISTS public.contest_entries;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'contest_submissions' AND column_name = 'drive_name') THEN
    ALTER TABLE public.contest_submissions RENAME COLUMN drive_name TO file_name;
  END IF;
END $$;

ALTER TABLE public.contest_submissions
  DROP COLUMN IF EXISTS drive_file_id,
  DROP COLUMN IF EXISTS drive_url,
  ADD COLUMN IF NOT EXISTS file_pathname TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN public.contest_submissions.file_name IS 'YYYY-MM-DD-HHMMSS_FirstNameLastName_<their file name> (Eastern time)';
COMMENT ON COLUMN public.contest_submissions.file_url IS 'The film in Vercel Blob (public store, unguessable URL). Set once received.';

-- ── Admin view: every film with its entrant and Blob link ───────────────────
CREATE VIEW public.contest_entries
WITH (security_invoker = true) AS
SELECT
  s.contest,
  s.received_at,
  e.first_name,
  e.last_name,
  e.email,
  e.whatsapp_phone,
  e.linkedin_url,
  s.file_name,
  s.file_url,
  s.original_filename,
  s.mime_type,
  s.size_bytes,
  s.status,
  s.created_at,
  s.user_id,
  s.id AS submission_id
FROM public.contest_submissions s
JOIN public.contest_entrants e ON e.contest = s.contest AND e.user_id = s.user_id;

REVOKE ALL ON public.contest_entries FROM anon;
GRANT SELECT ON public.contest_entries TO authenticated;
