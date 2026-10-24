-- profile_videos.size_bytes still capped rows at 500MB (the original CHECK
-- in 20260929160000), so a 500MB–1.5GB profile video would upload to the
-- bucket and then fail to save. Raise it to match the 1.5GB bucket limit
-- from 20261024100000. Safe to re-run.

ALTER TABLE public.profile_videos DROP CONSTRAINT IF EXISTS profile_videos_size_bytes_check;
ALTER TABLE public.profile_videos
  ADD CONSTRAINT profile_videos_size_bytes_check
  CHECK (size_bytes IS NULL OR size_bytes BETWEEN 0 AND 1572864000);
