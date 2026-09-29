-- Member-to-member messaging (LinkedIn style): /community?tab=messages
--
--   dm_conversations         a 1:1 (is_group = false) or a named group chat.
--   dm_conversation_members  who is in it, their role (owner|member) and how
--                            far they have read (last_read_at).
--   dm_messages              the messages. Edits set edited_at; deletes are
--                            soft (deleted_at set, body blanked).
--   dm_inbox                 view: one row per conversation I'm in.
--
-- Everything is prefixed dm_: this project already has unrelated
-- public.conversations / public.messages tables (a chat history with fan_id,
-- role, content) that must not be touched.
--
-- Signed-in members only: anon gets no privileges on any table, view or
-- function here, and every RPC refuses a caller without auth.uid().
-- Idempotent — safe to re-run.
--
-- Membership is never written by clients directly. Conversations and members
-- are created and changed only through the SECURITY DEFINER RPCs below, so a
-- member can't add themselves to someone else's conversation or forge who
-- started it. Clients can read (RLS: members only) and post / edit / delete
-- their own messages.
--
-- People reference auth.users (not profiles): a profile row only exists once
-- a member saves their profile. The client looks names/avatars up from
-- public.profiles and falls back to "Member".

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN NOT NULL DEFAULT false,
  title TEXT CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 120),
  -- 1:1s only: "<smaller uuid>:<larger uuid>", so there is exactly one
  -- conversation per unordered pair of members.
  direct_key TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dm_conversations_kind_check CHECK (
    (is_group AND direct_key IS NULL AND title IS NOT NULL)
    OR (NOT is_group AND direct_key IS NOT NULL AND title IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.dm_conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT dm_messages_body_check CHECK (
    char_length(body) <= 5000
    AND (deleted_at IS NOT NULL OR char_length(btrim(body)) >= 1)
  )
);

-- "My conversations, latest first": members by user, then conversations by
-- last_message_at. "Messages in a conversation by time": (conversation_id,
-- created_at) — also serves the latest-message lookup for inbox previews.
CREATE INDEX IF NOT EXISTS dm_conversation_members_user_idx
  ON public.dm_conversation_members (user_id, conversation_id);
CREATE INDEX IF NOT EXISTS dm_conversations_last_message_idx
  ON public.dm_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS dm_messages_conversation_created_idx
  ON public.dm_messages (conversation_id, created_at DESC, id DESC);

-- ── Membership helper ───────────────────────────────────────────────────────
-- SECURITY DEFINER so policies on conversation_members can ask "is the caller
-- in this conversation?" without re-entering conversation_members' own RLS
-- (which would recurse).
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.dm_conversation_members m
    WHERE m.conversation_id = p_conversation AND m.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_conversation_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID) TO authenticated;

-- ── Triggers ────────────────────────────────────────────────────────────────
-- Message guard: server-controlled timestamps; only body / deleted_at may
-- change; an edit stamps edited_at; a delete blanks the body and is final.
CREATE OR REPLACE FUNCTION public.messages_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.edited_at := NULL;
    NEW.deleted_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'These message fields cannot be changed.' USING ERRCODE = '42501';
  END IF;

  IF OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This message was deleted.' USING ERRCODE = '42501';
  END IF;

  IF NEW.deleted_at IS NOT NULL THEN
    NEW.deleted_at := now();
    NEW.body := '';
    NEW.edited_at := OLD.edited_at;
  ELSIF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  ELSE
    NEW.edited_at := OLD.edited_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard ON public.dm_messages;
CREATE TRIGGER messages_guard
  BEFORE INSERT OR UPDATE ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_guard();

-- After a message: bump the conversation's last_message_at, mark it read for
-- the sender, and — in a 1:1 — bring back a member who had left it (so
-- "leaving" a 1:1 hides it until the next message, like an archive).
-- SECURITY DEFINER: members can't write conversations / conversation_members.
CREATE OR REPLACE FUNCTION public.messages_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  UPDATE public.dm_conversations
     SET last_message_at = GREATEST(last_message_at, NEW.created_at)
   WHERE id = NEW.conversation_id
  RETURNING direct_key INTO v_key;

  IF v_key IS NOT NULL THEN
    INSERT INTO public.dm_conversation_members (conversation_id, user_id, role, last_read_at)
    SELECT NEW.conversation_id, u::UUID, 'member', '-infinity'::TIMESTAMPTZ
      FROM unnest(string_to_array(v_key, ':')) AS u
     WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u::UUID)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  UPDATE public.dm_conversation_members
     SET last_read_at = GREATEST(last_read_at, NEW.created_at)
   WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.messages_after_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS messages_after_insert ON public.dm_messages;
CREATE TRIGGER messages_after_insert
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_after_insert();

-- ── Row level security ──────────────────────────────────────────────────────
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- Conversations and member lists: visible to the conversation's members only.
-- No INSERT/UPDATE/DELETE policies — writes go through the RPCs.
DROP POLICY IF EXISTS "Members can view their conversations." ON public.dm_conversations;
CREATE POLICY "Members can view their conversations."
  ON public.dm_conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "Members can view who is in their conversations." ON public.dm_conversation_members;
CREATE POLICY "Members can view who is in their conversations."
  ON public.dm_conversation_members FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

-- Messages: members read; members post as themselves; senders edit and
-- soft-delete their own (while still in the conversation). No hard deletes.
DROP POLICY IF EXISTS "Members can read messages in their conversations." ON public.dm_messages;
CREATE POLICY "Members can read messages in their conversations."
  ON public.dm_messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Members can post as themselves." ON public.dm_messages;
CREATE POLICY "Members can post as themselves."
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Senders can edit or delete their messages." ON public.dm_messages;
CREATE POLICY "Senders can edit or delete their messages."
  ON public.dm_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() AND public.is_conversation_member(conversation_id))
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id));

-- ── RPCs ────────────────────────────────────────────────────────────────────
-- All: SECURITY DEFINER (they write membership), sign-in required, EXECUTE for
-- authenticated only.

-- Open the 1:1 with another member, creating it the first time. Idempotent per
-- unordered pair; re-adds either side if they had left it.
CREATE OR REPLACE FUNCTION public.start_direct_conversation(other_user UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_key TEXT;
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in to send messages.' USING ERRCODE = '42501';
  END IF;
  IF other_user IS NULL OR other_user = v_me THEN
    RAISE EXCEPTION 'You can''t message yourself.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = other_user) THEN
    RAISE EXCEPTION 'That member doesn''t exist.' USING ERRCODE = '22023';
  END IF;

  v_key := CASE WHEN v_me::TEXT < other_user::TEXT
                THEN v_me::TEXT || ':' || other_user::TEXT
                ELSE other_user::TEXT || ':' || v_me::TEXT END;

  INSERT INTO public.dm_conversations (is_group, direct_key, created_by)
  VALUES (false, v_key, v_me)
  ON CONFLICT (direct_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.dm_conversations WHERE direct_key = v_key;
  END IF;

  INSERT INTO public.dm_conversation_members (conversation_id, user_id, role)
  VALUES (v_id, v_me, 'member'), (v_id, other_user, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_id;
END;
$$;

-- A named group: the caller is the owner; member_ids are everyone else.
CREATE OR REPLACE FUNCTION public.create_group_conversation(title TEXT, member_ids UUID[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_title TEXT := btrim(coalesce(create_group_conversation.title, ''));
  v_ids UUID[];
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in to send messages.' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_title) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Give the group a name (up to 120 characters).' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(array_agg(DISTINCT u), '{}') INTO v_ids
    FROM unnest(coalesce(create_group_conversation.member_ids, '{}')) AS u
   WHERE u IS NOT NULL AND u <> v_me
     AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u);

  IF cardinality(v_ids) < 1 THEN
    RAISE EXCEPTION 'Add at least one other member.' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_ids) > 49 THEN
    RAISE EXCEPTION 'Groups can have up to 50 members.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dm_conversations (is_group, title, created_by)
  VALUES (true, v_title, v_me)
  RETURNING id INTO v_id;

  INSERT INTO public.dm_conversation_members (conversation_id, user_id, role)
  VALUES (v_id, v_me, 'owner');
  INSERT INTO public.dm_conversation_members (conversation_id, user_id, role)
  SELECT v_id, u, 'member' FROM unnest(v_ids) AS u;

  RETURN v_id;
END;
$$;

-- Group owners add members. Returns how many were actually added.
CREATE OR REPLACE FUNCTION public.add_conversation_members(conversation UUID, member_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_existing INTEGER;
  v_added INTEGER;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in to send messages.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dm_conversations c
      JOIN public.dm_conversation_members m ON m.conversation_id = c.id
     WHERE c.id = add_conversation_members.conversation AND c.is_group
       AND m.user_id = v_me AND m.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the group owner can add members.' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent adds so the 50-member cap holds.
  PERFORM 1 FROM public.dm_conversations WHERE id = add_conversation_members.conversation FOR UPDATE;

  SELECT count(*) INTO v_existing FROM public.dm_conversation_members
   WHERE conversation_id = add_conversation_members.conversation;

  WITH candidates AS (
    SELECT DISTINCT u FROM unnest(coalesce(add_conversation_members.member_ids, '{}')) AS u
     WHERE u IS NOT NULL
       AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u)
       AND NOT EXISTS (SELECT 1 FROM public.dm_conversation_members m
                        WHERE m.conversation_id = add_conversation_members.conversation AND m.user_id = u)
  )
  SELECT count(*) INTO v_added FROM candidates;

  IF v_existing + v_added > 50 THEN
    RAISE EXCEPTION 'Groups can have up to 50 members.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dm_conversation_members (conversation_id, user_id, role)
  SELECT add_conversation_members.conversation, u, 'member'
    FROM unnest(coalesce(add_conversation_members.member_ids, '{}')) AS u
   WHERE u IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  GET DIAGNOSTICS v_added = ROW_COUNT;

  RETURN v_added;
END;
$$;

-- Leave a conversation. A leaving group owner hands ownership to the longest-
-- standing member; the last one out deletes the conversation (and messages).
-- Leaving a 1:1 hides it until the next message arrives.
CREATE OR REPLACE FUNCTION public.leave_conversation(conversation UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Sign in to send messages.' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.dm_conversations WHERE id = leave_conversation.conversation FOR UPDATE;

  DELETE FROM public.dm_conversation_members
   WHERE conversation_id = leave_conversation.conversation AND user_id = v_me
  RETURNING role INTO v_role;

  IF v_role IS NULL THEN
    RETURN; -- not a member: nothing to do
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.dm_conversation_members
                  WHERE conversation_id = leave_conversation.conversation) THEN
    DELETE FROM public.dm_conversations WHERE id = leave_conversation.conversation;
    RETURN;
  END IF;

  IF v_role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM public.dm_conversation_members
     WHERE conversation_id = leave_conversation.conversation AND role = 'owner'
  ) THEN
    UPDATE public.dm_conversation_members SET role = 'owner'
     WHERE conversation_id = leave_conversation.conversation
       AND user_id = (SELECT user_id FROM public.dm_conversation_members
                       WHERE conversation_id = leave_conversation.conversation
                       ORDER BY joined_at, user_id LIMIT 1);
  END IF;
END;
$$;

-- Mark everything in a conversation as read for the caller.
CREATE OR REPLACE FUNCTION public.mark_conversation_read(conversation UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to send messages.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.dm_conversation_members
     SET last_read_at = GREATEST(last_read_at, now())
   WHERE conversation_id = mark_conversation_read.conversation AND user_id = auth.uid();
END;
$$;

-- How many of my conversations have unread messages (for the nav badge).
-- SECURITY INVOKER: it only reads rows the caller can already see.
CREATE OR REPLACE FUNCTION public.unread_conversation_count()
RETURNS INTEGER
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to see messages.' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT count(*)::INTEGER
      FROM public.dm_conversation_members m
      JOIN public.dm_conversations c ON c.id = m.conversation_id
     WHERE m.user_id = auth.uid() AND c.last_message_at > m.last_read_at
  );
END;
$$;

-- Find members to message, by name or username. Returns id, display name and
-- avatar only — never email. Only members with a saved profile are findable.
-- SECURITY INVOKER: reads profiles under the caller's own RLS.
CREATE OR REPLACE FUNCTION public.search_members(q TEXT)
RETURNS TABLE (id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  v_q TEXT := btrim(coalesce(search_members.q, ''));
  v_pat TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to search members.' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_q) < 1 OR char_length(v_q) > 100 THEN
    RETURN;
  END IF;
  v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
    SELECT p.id,
           coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, 'Member')::TEXT,
           p.avatar_url::TEXT
      FROM public.profiles p
     WHERE p.id <> auth.uid()
       AND (p.first_name ILIKE v_pat
            OR p.last_name ILIKE v_pat
            OR p.username ILIKE v_pat
            OR concat_ws(' ', p.first_name, p.last_name) ILIKE v_pat)
     ORDER BY (p.username ILIKE v_q OR concat_ws(' ', p.first_name, p.last_name) ILIKE v_q) DESC,
              p.first_name NULLS LAST, p.last_name NULLS LAST, p.username NULLS LAST
     LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_direct_conversation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_group_conversation(TEXT, UUID[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_conversation_members(UUID, UUID[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_conversation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unread_conversation_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_members(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_conversation_members(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unread_conversation_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_members(TEXT) TO authenticated;

-- ── Inbox ───────────────────────────────────────────────────────────────────
-- One row per conversation I'm in, with my read state, the member ids, and a
-- preview of the latest message. security_invoker so the caller's RLS applies.
DROP VIEW IF EXISTS public.dm_inbox;
CREATE VIEW public.dm_inbox
WITH (security_invoker = true) AS
  SELECT c.id, c.is_group, c.title, c.direct_key, c.created_by, c.created_at, c.last_message_at,
         me.role AS my_role, me.last_read_at,
         (c.last_message_at > me.last_read_at AND lm.id IS NOT NULL) AS unread,
         (SELECT array_agg(m2.user_id ORDER BY m2.joined_at, m2.user_id)
            FROM public.dm_conversation_members m2
           WHERE m2.conversation_id = c.id) AS member_ids,
         lm.id AS last_message_id,
         lm.sender_id AS last_sender_id,
         left(lm.body, 200) AS last_body,
         lm.deleted_at IS NOT NULL AS last_deleted,
         lm.created_at AS last_created_at
    FROM public.dm_conversation_members me
    JOIN public.dm_conversations c ON c.id = me.conversation_id
    LEFT JOIN LATERAL (
      SELECT m.id, m.sender_id, m.body, m.deleted_at, m.created_at
        FROM public.dm_messages m
       WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1
    ) lm ON true
   WHERE me.user_id = auth.uid();

-- ── Privileges ──────────────────────────────────────────────────────────────
REVOKE ALL ON public.dm_conversations, public.dm_conversation_members, public.dm_messages, public.dm_inbox FROM anon;
REVOKE ALL ON public.dm_conversations, public.dm_conversation_members, public.dm_messages, public.dm_inbox FROM authenticated;
GRANT SELECT ON public.dm_conversations, public.dm_conversation_members, public.dm_inbox TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.dm_messages TO authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Stream message inserts/edits to subscribed members (Realtime applies the
-- SELECT policy above per subscriber). Skipped where the publication doesn't
-- exist (e.g. plain Postgres).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dm_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
  END IF;
END;
$$;
