-- Videos on member profiles: /community/profile/:id
--
--   profile_videos   one row per video a member shows on their profile, either
--                    an uploaded file (kind = 'upload', stored in the
--                    profile-videos bucket under <user_id>/…) or a hosted film
--                    (kind = 'link', a YouTube/Vimeo URL the client embeds).
--   profile-videos   public storage bucket for the uploaded files.
--
-- Profiles are public, so anyone can read the rows and play the files. Only the
-- owner can add, retitle, reorder or delete their own videos; admins can delete
-- any row or file for moderation. Anon gets no writes. Each member is capped at
-- 24 videos (rows, and objects in their storage folder).
-- Idempotent — safe to re-run.
--
-- user_id references auth.users (not profiles), same reasoning as the message
-- boards: a profiles row only exists once a member first saves their profile.

-- ── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT CHECK (title IS NULL OR char_length(title) <= 120),
  kind TEXT NOT NULL CHECK (kind IN ('upload', 'link')),
  url TEXT NOT NULL CHECK (url ~* '^https?://' AND char_length(url) <= 2000),
  storage_path TEXT CHECK (storage_path IS NULL OR char_length(storage_path) <= 512),
  mime TEXT CHECK (mime IS NULL OR char_length(mime) <= 100),
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes BETWEEN 0 AND 524288000),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Uploads must point into the owner's own folder; links carry no file.
  CONSTRAINT profile_videos_kind_shape CHECK (
    (kind = 'link' AND storage_path IS NULL)
    OR (kind = 'upload' AND storage_path IS NOT NULL
        AND split_part(storage_path, '/', 1) = user_id::text)
  )
);

CREATE INDEX IF NOT EXISTS profile_videos_user_order_idx
  ON public.profile_videos (user_id, sort_order, created_at);

-- ── Guard trigger ───────────────────────────────────────────────────────────
-- INSERT: enforce the 24-video cap (serialised per member with an advisory
-- lock so two parallel uploads can't both slip in at 23) and stamp created_at.
-- UPDATE: only title and sort_order may change.
CREATE OR REPLACE FUNCTION public.profile_videos_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtext('profile_videos:' || NEW.user_id::text));
    IF (SELECT count(*) FROM public.profile_videos WHERE user_id = NEW.user_id) >= 24 THEN
      RAISE EXCEPTION 'You can have up to 24 videos on your profile.' USING ERRCODE = '23514';
    END IF;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.url IS DISTINCT FROM OLD.url
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.mime IS DISTINCT FROM OLD.mime
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only a video''s title and order can be changed.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_videos_guard ON public.profile_videos;
CREATE TRIGGER profile_videos_guard
  BEFORE INSERT OR UPDATE ON public.profile_videos
  FOR EACH ROW EXECUTE FUNCTION public.profile_videos_guard();

-- ── Row level security ──────────────────────────────────────────────────────
ALTER TABLE public.profile_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profile videos." ON public.profile_videos;
CREATE POLICY "Anyone can view profile videos."
  ON public.profile_videos FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can add their own videos." ON public.profile_videos;
CREATE POLICY "Members can add their own videos."
  ON public.profile_videos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can edit their own videos." ON public.profile_videos;
CREATE POLICY "Members can edit their own videos."
  ON public.profile_videos FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can delete their own videos; admins any." ON public.profile_videos;
CREATE POLICY "Members can delete their own videos; admins any."
  ON public.profile_videos FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

REVOKE ALL ON public.profile_videos FROM anon;
GRANT SELECT ON public.profile_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_videos TO authenticated;

-- ── Storage bucket ──────────────────────────────────────────────────────────
-- Public read (files are served from /storage/v1/object/public/profile-videos/…
-- without a policy). 500 MB per file, browser-playable video types only.
-- NOTE: the project-wide upload limit (Dashboard → Storage → Settings) caps
-- this; it must be raised to at least 500 MB for the bucket limit to matter.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-videos', 'profile-videos', true, 524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Objects in the caller's own folder. SECURITY DEFINER so the count isn't
-- itself filtered by storage.objects RLS.
CREATE OR REPLACE FUNCTION public.profile_video_object_count()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INTEGER FROM storage.objects
   WHERE bucket_id = 'profile-videos'
     AND (storage.foldername(name))[1] = auth.uid()::text;
$$;

REVOKE EXECUTE ON FUNCTION public.profile_video_object_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_video_object_count() TO authenticated;

-- storage.objects policies. SELECT is needed by the storage API for deletes
-- and overwrites; it's limited to the owner's folder (plus admins) so the
-- bucket can't be listed — playback uses the public URL, not this policy.
DROP POLICY IF EXISTS "Members can see their own profile video files." ON storage.objects;
CREATE POLICY "Members can see their own profile video files."
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-videos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "Members can upload profile videos to their folder." ON storage.objects;
CREATE POLICY "Members can upload profile videos to their folder."
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.profile_video_object_count() < 24
  );

DROP POLICY IF EXISTS "Members can overwrite profile videos in their folder." ON storage.objects;
CREATE POLICY "Members can overwrite profile videos in their folder."
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Members can delete their profile videos; admins any." ON storage.objects;
CREATE POLICY "Members can delete their profile videos; admins any."
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-videos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
