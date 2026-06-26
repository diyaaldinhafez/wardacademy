-- 0064_profiles_comms_locale
--
-- The guardian's preferred communication language, carried onto the LIVE account
-- (profiles) so the parent surfaces/communication can follow it — until now it
-- lived only on `leads.guardian_locale` (set at enrollment) and never reached the
-- provisioned guardian account. Non-breaking: nullable, no default; null → the app
-- falls back to 'ar' on read.

alter table public.profiles
  add column if not exists comms_locale text check (comms_locale in ('en', 'ar'));
