-- Message boards for signed-in members: /community?tab=boards
--
--   boards         a category (General, Show Your Work, …). cohort = NULL means
--                  open to every signed-in member; a non-null cohort limits the
--                  board to students of that cohort (plus admins).
--   board_threads  a topic: title + body (+ optional link to your work).
--   board_posts    replies to a thread, shown oldest-first.
--
-- Everything here is members-only: anon gets no privileges at all.
-- Idempotent — safe to re-run.
--
-- Author display: author_id references auth.users (not profiles), because a
-- profile row is only created when a member first saves their profile (there
-- is no on-signup trigger), so an FK to profiles would reject posts from
-- members who never edited their profile. The client looks up display names
-- from public.profiles by author_id and falls back to "Member".

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cohort TEXT,                                   -- NULL = open to all members
  admin_only_posting BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.board_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) <= 10000),
  link_url TEXT CHECK (link_url IS NULL OR (link_url ~* '^https?://' AND char_length(link_url) <= 2000)),
  pinned BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.board_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 10000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_threads_board_order_idx
  ON public.board_threads (board_id, pinned DESC, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS board_threads_activity_idx
  ON public.board_threads (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS board_posts_thread_created_idx
  ON public.board_posts (thread_id, created_at);

-- ── Seed boards ─────────────────────────────────────────────────────────────
INSERT INTO public.boards (slug, name, description, sort_order, admin_only_posting) VALUES
  ('announcements',  'Announcements',     'News from the AIMG team — sessions, cohorts, and events.', 0, true),
  ('general',        'General',           'Say hello, ask anything, talk shop with fellow AI makers.', 10, false),
  ('show-your-work', 'Show Your Work',    'Share a clip, a frame, a work in progress. Ask for critique.', 20, false),
  ('tools',          'Tools & Workflows', 'Magnific, Kling, Veo, Runway, ComfyUI — tips, prompts, and pipelines.', 30, false),
  ('gigs',           'Gigs & Collabs',    'Looking for collaborators, offering work, or hiring? Post it here.', 40, false)
ON CONFLICT (slug) DO NOTHING;

-- ── Visibility helper ───────────────────────────────────────────────────────
-- SECURITY DEFINER because students.email is not readable by `authenticated`
-- (see 20260716_students_email_privacy.sql), and policies run with the
-- caller's privileges. Returns true if the caller is a student of p_cohort.
CREATE OR REPLACE FUNCTION public.is_cohort_member(p_cohort TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.cohort = p_cohort
      AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.jwt() ->> 'email'))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_cohort_member(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_cohort_member(TEXT) TO authenticated;

-- ── Triggers ────────────────────────────────────────────────────────────────
-- Protected columns. Enforced with triggers rather than column GRANTs because
-- admins and members share the same `authenticated` role: a column grant
-- could not let admins pin/lock while stopping everyone else.
-- pg_trigger_depth() > 1 means the write comes from our own reply-count
-- trigger below (not from a client), which must be allowed to touch
-- reply_count / last_activity_at on someone else's thread.
CREATE OR REPLACE FUNCTION public.board_threads_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    NEW.last_activity_at := now();
    NEW.reply_count := 0;
    IF NOT public.is_admin() THEN
      NEW.pinned := false;
      NEW.locked := false;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;  -- internal bookkeeping from board_posts_sync_thread()
  END IF;

  IF NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.reply_count IS DISTINCT FROM OLD.reply_count
     OR NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'These thread fields cannot be changed.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin() AND (
       NEW.pinned IS DISTINCT FROM OLD.pinned
    OR NEW.locked IS DISTINCT FROM OLD.locked
    OR NEW.board_id IS DISTINCT FROM OLD.board_id) THEN
    RAISE EXCEPTION 'Only admins can pin, lock, or move threads.' USING ERRCODE = '42501';
  END IF;

  -- updated_at marks a content edit (the UI shows "edited"), not pin/lock.
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.link_url IS DISTINCT FROM OLD.link_url THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS board_threads_guard ON public.board_threads;
CREATE TRIGGER board_threads_guard
  BEFORE INSERT OR UPDATE ON public.board_threads
  FOR EACH ROW EXECUTE FUNCTION public.board_threads_guard();

CREATE OR REPLACE FUNCTION public.board_posts_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'These reply fields cannot be changed.' USING ERRCODE = '42501';
  END IF;

  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS board_posts_guard ON public.board_posts;
CREATE TRIGGER board_posts_guard
  BEFORE INSERT OR UPDATE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.board_posts_guard();

-- Keep reply_count / last_activity_at on the thread in sync. SECURITY DEFINER
-- so a member replying to someone else's thread can bump its counters (RLS
-- would otherwise block the UPDATE — members can only update their own).
CREATE OR REPLACE FUNCTION public.board_posts_sync_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.board_threads
       SET reply_count = reply_count + 1,
           last_activity_at = GREATEST(last_activity_at, NEW.created_at)
     WHERE id = NEW.thread_id;
    RETURN NEW;
  END IF;

  -- DELETE (also fires during a thread's cascade delete; the UPDATE then
  -- simply matches no row).
  UPDATE public.board_threads t
     SET reply_count = GREATEST(t.reply_count - 1, 0),
         last_activity_at = COALESCE(
           (SELECT max(p.created_at) FROM public.board_posts p WHERE p.thread_id = t.id),
           t.created_at)
   WHERE t.id = OLD.thread_id;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.board_posts_sync_thread() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS board_posts_sync_thread ON public.board_posts;
CREATE TRIGGER board_posts_sync_thread
  AFTER INSERT OR DELETE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.board_posts_sync_thread();

-- ── Row level security ──────────────────────────────────────────────────────
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

-- Boards: open boards to every signed-in member; cohort boards to that
-- cohort's students; admins see everything.
DROP POLICY IF EXISTS "Members can view their boards." ON public.boards;
CREATE POLICY "Members can view their boards."
  ON public.boards FOR SELECT TO authenticated
  USING (cohort IS NULL OR public.is_admin() OR public.is_cohort_member(cohort));

DROP POLICY IF EXISTS "Admins can manage boards." ON public.boards;
CREATE POLICY "Admins can manage boards."
  ON public.boards FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Threads/posts inherit visibility: the EXISTS subqueries below are themselves
-- filtered by the boards / board_threads SELECT policies.
DROP POLICY IF EXISTS "Members can view threads on their boards." ON public.board_threads;
CREATE POLICY "Members can view threads on their boards."
  ON public.board_threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id));

DROP POLICY IF EXISTS "Members can start threads." ON public.board_threads;
CREATE POLICY "Members can start threads."
  ON public.board_threads FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_id
        AND (NOT b.admin_only_posting OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Authors can edit their threads; admins any." ON public.board_threads;
CREATE POLICY "Authors can edit their threads; admins any."
  ON public.board_threads FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (author_id = auth.uid() OR public.is_admin())
    AND EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id)
  );

DROP POLICY IF EXISTS "Authors can delete their threads; admins any." ON public.board_threads;
CREATE POLICY "Authors can delete their threads; admins any."
  ON public.board_threads FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Members can view replies on their boards." ON public.board_posts;
CREATE POLICY "Members can view replies on their boards."
  ON public.board_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.board_threads t WHERE t.id = thread_id));

DROP POLICY IF EXISTS "Members can reply to open threads; admins to any." ON public.board_posts;
CREATE POLICY "Members can reply to open threads; admins to any."
  ON public.board_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.board_threads t
      WHERE t.id = thread_id
        AND (NOT t.locked OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Authors can edit their replies; admins any." ON public.board_posts;
CREATE POLICY "Authors can edit their replies; admins any."
  ON public.board_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authors can delete their replies; admins any." ON public.board_posts;
CREATE POLICY "Authors can delete their replies; admins any."
  ON public.board_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());

-- ── Board list summary ──────────────────────────────────────────────────────
-- Thread count + latest activity per board for the board index. security_invoker
-- so the caller's RLS on boards/board_threads applies (PG15+).
CREATE OR REPLACE VIEW public.board_overview
WITH (security_invoker = true) AS
  SELECT b.id, b.slug, b.name, b.description, b.sort_order, b.cohort,
         b.admin_only_posting,
         count(t.id)::INTEGER AS thread_count,
         max(t.last_activity_at) AS last_activity_at
    FROM public.boards b
    LEFT JOIN public.board_threads t ON t.board_id = b.id
   GROUP BY b.id;

-- ── Privileges ──────────────────────────────────────────────────────────────
REVOKE ALL ON public.boards, public.board_threads, public.board_posts, public.board_overview FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;  -- writes gated to admins by RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_threads, public.board_posts TO authenticated;
GRANT SELECT ON public.board_overview TO authenticated;
