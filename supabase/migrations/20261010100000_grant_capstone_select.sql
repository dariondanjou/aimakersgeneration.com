-- Grant SELECT on the capstone columns (Oct 10, 2026).
--
-- students uses column-level SELECT grants (20260716_students_email_privacy):
-- the table SELECT is revoked and each readable column is granted back, so
-- "any column added to students later must be added to this grant list to be
-- visible." 20261004100000 added capstone_title / capstone_brief but granted
-- only UPDATE, never SELECT — so every client query that selects them
-- (the /students roster and each profile page) 42501s on the whole request,
-- its data comes back null, and the roster falls back to "coming soon".
--
-- Grant SELECT so the capstone fields are readable. Row visibility is still
-- governed by the members-only RLS policy (20261005100000); anon sees no rows.
-- Safe to re-run.

GRANT SELECT (capstone_title, capstone_brief) ON public.students TO anon, authenticated;
