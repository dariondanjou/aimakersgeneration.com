-- Session materials for /students (recordings, handouts), one row per item.
--
-- Read only by /api/cohort-resources (service role), which checks the caller
-- is a cohort member and signs or returns the file URLs. Recording URLs are
-- unguessable Vercel Blob links and act as the access key, so they live here
-- and never in the (public) repository; rows are added from the Supabase SQL
-- editor or CLI, not from migrations.
--
-- Exactly one of blob_url (Vercel Blob) or storage_path (private
-- `cohort-materials` bucket) is set. thumb is a public image path.
CREATE TABLE IF NOT EXISTS public.cohort_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort TEXT NOT NULL,
  week INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL CHECK (kind IN ('video', 'pdf')),
  title TEXT NOT NULL,
  description TEXT,
  meta TEXT,
  thumb TEXT,
  blob_url TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cohort_resources_one_source CHECK ((blob_url IS NULL) <> (storage_path IS NULL)),
  UNIQUE (cohort, week, title)
);

CREATE INDEX IF NOT EXISTS cohort_resources_cohort_idx
  ON public.cohort_resources (cohort, week, sort_order);

-- RLS on, no policies: service role only.
ALTER TABLE public.cohort_resources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cohort_resources FROM anon, authenticated;
