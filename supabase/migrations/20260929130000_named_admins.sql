-- Named admins: no shared password anywhere on the site. Every person signs in
-- with their own account (email + password, Google, …); an admin is a signed-in
-- user whose CONFIRMED sign-in email is on this list, or whose user id is in
-- public.admin_users (the older, id-based list — kept so nothing is lost).
-- Signed out is never an admin (auth.uid() is null).
--
-- Listing by email means an admin is recognised the first time they sign in,
-- with any sign-in method, without anyone looking up their user id. The email
-- must be confirmed (auth.users.email_confirmed_at) so nobody can claim admin
-- by signing up with an admin's address before the real person does.
--
-- Add an admin:     INSERT INTO public.admin_emails (email) VALUES ('x@y.com') ON CONFLICT DO NOTHING;
-- Remove an admin:  DELETE FROM public.admin_emails WHERE email = 'x@y.com';
--                   (and DELETE FROM public.admin_users WHERE user_id = '…' if listed there)
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY CHECK (email = lower(btrim(email)) AND position('@' in email) > 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- No policies: only the service role (and the SQL editor) can read or change
-- the list. Clients learn their own status through public.is_admin().
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_emails FROM anon, authenticated;

INSERT INTO public.admin_emails (email) VALUES
  ('dariondanjou@gmail.com'),  -- Darion
  ('thomasgheri@gmail.com')    -- Gheri
  -- Halania: add her sign-in email, e.g.
  -- ,('halania@example.com')
ON CONFLICT (email) DO NOTHING;

-- Same signature, grants and callers as before (RLS policies, the site nav,
-- api/_lib/admin-auth.js); only the membership rule widens.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1
        FROM auth.users u
        JOIN public.admin_emails e ON e.email = lower(u.email)
       WHERE u.id = auth.uid()
         AND u.email_confirmed_at IS NOT NULL
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Feedback inbox: was gated on profiles.is_admin, a separate flag on a row
-- members can edit themselves. Use the one admin list instead.
DROP POLICY IF EXISTS "Admins can read" ON public.feedback_messages;
CREATE POLICY "Admins can read"
  ON public.feedback_messages FOR SELECT TO authenticated
  USING (public.is_admin());
