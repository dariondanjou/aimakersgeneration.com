-- Allow a third cohort_resources kind: 'doc' (Oct 10, 2026).
--
-- Recordings are 'video', handouts are 'pdf' (viewable inline). An editable
-- handout — e.g. the Week 2 shot-list template, a .docx students fill in —
-- is download-only, so it gets its own kind. api/cohort-resources already
-- signs any storage_path regardless of kind; the UI shows a Download-only
-- card for 'doc'. Safe to re-run.

ALTER TABLE public.cohort_resources DROP CONSTRAINT IF EXISTS cohort_resources_kind_check;
ALTER TABLE public.cohort_resources
  ADD CONSTRAINT cohort_resources_kind_check CHECK (kind IN ('video', 'pdf', 'doc'));
