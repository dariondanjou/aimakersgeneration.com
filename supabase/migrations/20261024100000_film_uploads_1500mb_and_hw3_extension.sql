-- Film uploads: triple the video size limit, and reopen the final capstone
-- (Oct 24, 2026).
--
-- 1. profile-videos (homework films and profile videos) goes from 500MB to
--    1.5GB. StudentProfile.jsx and ProfileVideos.jsx check the same limit
--    client-side.
-- 2. October film cohort, assignment 3 (the final capstone) was due at the
--    start of Session 4 (Sat Oct 24, 1:00 PM ET). Move it to Sat Oct 31,
--    1:00 PM ET so students can still turn in (or replace) their films
--    without a Late tag. Submissions already in keep their stamps.
-- Safe to re-run.

UPDATE storage.buckets
   SET file_size_limit = 1572864000 -- 1.5GB (1500 × 1024 × 1024)
 WHERE id = 'profile-videos';

UPDATE public.assignments
   SET due_at = '2026-10-31T17:00:00+00:00'
 WHERE cohort = 'october-2026-film' AND number = 3;
