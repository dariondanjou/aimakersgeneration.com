-- AIMG 30-second ad contest — the prize is free entry into the October 2026
-- Film Cohort. Entry is free; entering requires an AIMG account.
--
--   contest_entrants     one row per person per contest: contact details
--                        (email, WhatsApp number, optional LinkedIn)
--   contest_submissions  one row per film. The file itself lives in the
--                        contest's Google Drive submissions folder; the row
--                        keeps the Drive file id and a link to it.
--   contest_entries      admin view: every film with its entrant's details
--                        and Drive link, newest first.
--
-- Films are uploaded straight from the browser to Google Drive through an
-- upload session opened by /api/contest-upload (service role), which is the
-- only writer of contest_submissions. Entrants read their own rows; admins
-- (public.is_admin()) read everything. Safe to re-run.

-- ── Entrants ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contest_entrants (
  contest        TEXT NOT NULL DEFAULT 'oct-2026-film-ad',
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name     TEXT NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 60),
  last_name      TEXT NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 60),
  email          TEXT NOT NULL CHECK (char_length(email) <= 200 AND position('@' in email) > 1),
  whatsapp_phone TEXT NOT NULL CHECK (char_length(whatsapp_phone) BETWEEN 7 AND 30),
  linkedin_url   TEXT CHECK (linkedin_url IS NULL OR (linkedin_url ~* '^https?://' AND char_length(linkedin_url) <= 300)),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (contest, user_id)
);

ALTER TABLE public.contest_entrants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entrants can view their registration; admins all." ON public.contest_entrants;
CREATE POLICY "Entrants can view their registration; admins all."
  ON public.contest_entrants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Members can register themselves." ON public.contest_entrants;
CREATE POLICY "Members can register themselves."
  ON public.contest_entrants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Entrants can update their registration." ON public.contest_entrants;
CREATE POLICY "Entrants can update their registration."
  ON public.contest_entrants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.contest_entrants_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS contest_entrants_touch ON public.contest_entrants;
CREATE TRIGGER contest_entrants_touch BEFORE UPDATE ON public.contest_entrants
  FOR EACH ROW EXECUTE FUNCTION public.contest_entrants_touch();

-- ── Submissions (films) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contest_submissions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest           TEXT NOT NULL DEFAULT 'oct-2026-film-ad',
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  drive_name        TEXT NOT NULL,   -- YYYY-MM-DD-HHMMSS_FirstNameLastName_<their file name>
  mime_type         TEXT,
  size_bytes        BIGINT,
  status            TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'received')),
  drive_file_id     TEXT,
  drive_url         TEXT,            -- link to the film in the Drive submissions folder
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  received_at       TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS contest_submissions_user_idx
  ON public.contest_submissions (contest, user_id, created_at DESC);

ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entrants can view their films; admins all." ON public.contest_submissions;
CREATE POLICY "Entrants can view their films; admins all."
  ON public.contest_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
-- No insert/update/delete policies: only /api/contest-upload (service role) writes.

-- ── Admin view: every film with its entrant and Drive link ──────────────────
CREATE OR REPLACE VIEW public.contest_entries
WITH (security_invoker = true) AS
SELECT
  s.contest,
  s.received_at,
  e.first_name,
  e.last_name,
  e.email,
  e.whatsapp_phone,
  e.linkedin_url,
  s.drive_name,
  s.drive_url,
  s.original_filename,
  s.size_bytes,
  s.status,
  s.created_at,
  s.user_id,
  s.id AS submission_id
FROM public.contest_submissions s
JOIN public.contest_entrants e ON e.contest = s.contest AND e.user_id = s.user_id;

REVOKE ALL ON public.contest_entrants, public.contest_submissions, public.contest_entries FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.contest_entrants TO authenticated;
GRANT SELECT ON public.contest_submissions, public.contest_entries TO authenticated;
