-- Winter 2027 Jobs Cohort: every enrollee must show previous work — links,
-- uploaded files, or both (enforced in api/create-checkout-session.js).
--
--   work_links  extra links to previous work, one per line (portfolio_url
--               stays the primary link)
--   work_files  files uploaded to Vercel Blob via api/enroll-upload.js:
--               [{ "url", "pathname", "name", "size", "type" }, ...]

ALTER TABLE public.cohort_applications
  ADD COLUMN IF NOT EXISTS work_links TEXT,
  ADD COLUMN IF NOT EXISTS work_files JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.cohort_applications.work_links IS 'Extra links to previous work, one per line.';
COMMENT ON COLUMN public.cohort_applications.work_files IS 'Previous-work files in Vercel Blob (public store, unguessable URLs).';
