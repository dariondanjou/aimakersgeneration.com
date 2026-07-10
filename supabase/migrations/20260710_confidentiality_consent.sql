-- Adds the confidentiality / IP / mutual-protection acknowledgement to cohort
-- enrollments. Additive and backfilled: existing rows default to false, new
-- enrollments set it true (create-checkout-session.js requires the checkbox).
ALTER TABLE public.cohort_applications
  ADD COLUMN IF NOT EXISTS consent_confidentiality BOOLEAN NOT NULL DEFAULT false;
