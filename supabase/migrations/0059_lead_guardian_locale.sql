-- 0059_lead_guardian_locale
--
-- The guardian's preferred language for parent-facing comms (email + WhatsApp),
-- captured at registration from the LOCALE cookie — the language the parent used
-- while filling /enroll. Nullable & non-breaking: existing leads stay null, and
-- the app falls back to Arabic ('ar') when it's absent (the audience is Arabic).

alter table public.leads
  add column if not exists guardian_locale text;   -- 'en' | 'ar' (null → app falls back to 'ar')
