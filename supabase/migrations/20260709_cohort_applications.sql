-- Cohort enrollments. Payment IS enrollment: there is no acceptance step.
--
-- This table holds applicant PII (name, email, phone). RLS is enabled and NO
-- policies are created, which means anon and authenticated roles can do nothing
-- at all. Only the service-role key (server-side, in api/) can read or write it.
-- Do not add a "viewable by everyone" policy here — profiles has one, and that
-- is what makes member UUIDs public.

CREATE TABLE IF NOT EXISTS public.cohort_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  cohort TEXT NOT NULL DEFAULT 'summer-2026',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'canceled', 'refunded')),

  -- 1. About you
  full_name       TEXT NOT NULL,
  preferred_name  TEXT,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  city            TEXT NOT NULL,
  heard_about     TEXT NOT NULL,

  -- 2. Where you're starting from
  ai_experience     TEXT NOT NULL,
  coding_experience TEXT NOT NULL,
  current_work      TEXT NOT NULL,
  portfolio_url     TEXT,
  no_portfolio      BOOLEAN DEFAULT false,

  -- 3. Why
  goal            TEXT NOT NULL,
  eight_week_goal TEXT NOT NULL,
  something_made  TEXT NOT NULL,
  final_project   TEXT NOT NULL,

  -- 4. Logistics
  can_attend     TEXT NOT NULL,
  accommodations TEXT,

  -- 5. Consent + acknowledgements (all required at submit time)
  consent_tuition       BOOLEAN NOT NULL DEFAULT false,
  consent_equipment     BOOLEAN NOT NULL DEFAULT false,
  consent_attendance    BOOLEAN NOT NULL DEFAULT false,
  consent_homework      BOOLEAN NOT NULL DEFAULT false,
  consent_photo_release BOOLEAN NOT NULL DEFAULT false,
  consent_privacy       BOOLEAN NOT NULL DEFAULT false,
  consent_conduct       BOOLEAN NOT NULL DEFAULT false,

  -- Stripe
  stripe_session_id        TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents             INTEGER,
  paid_at                  TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.cohort_applications ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies. Service role only.

-- The seat check counts paid rows plus recently-started checkouts, so two people
-- paying at the same moment can't both take seat 20.
CREATE INDEX IF NOT EXISTS cohort_applications_seat_idx
  ON public.cohort_applications (cohort, status, created_at);

CREATE INDEX IF NOT EXISTS cohort_applications_session_idx
  ON public.cohort_applications (stripe_session_id);
