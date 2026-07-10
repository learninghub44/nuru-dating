-- Enforce a minimum age of 18 on the profiles table.
-- Run this against the live database (SQL Editor or `supabase db push`).
--
-- Note: if any existing rows violate this (birth_date making the user
-- under 18), this ALTER will fail until those rows are handled — check
-- first with:
--   SELECT id, email, birth_date FROM profiles
--   WHERE birth_date > (CURRENT_DATE - INTERVAL '18 years');

ALTER TABLE profiles
  ADD CONSTRAINT profiles_birth_date_min_age_18
  CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'));
