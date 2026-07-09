-- 0072_teacher_application_fields — §9(f) enrich the teacher intake for a first-pass fit screen.
--
-- Additive, all NULLABLE (partial/legacy rows survive). teacher_applications only — teacher_profiles
-- is UNCHANGED (extra application-only fields stay on the application record for reference; they are
-- NOT copied into teacher_profiles). No RLS change (the existing admin policy + service-role grant cover
-- these). Still record-only intake (R1): no account is created at application time.

alter table public.teacher_applications
  add column if not exists timezone               text,
  add column if not exists years_experience       integer,
  add column if not exists teaches_children        boolean,   -- has taught ages 9–13
  add column if not exists certifications          text,      -- TEFL / TESOL / CELTA / degree …
  add column if not exists english_level           text,      -- native / near-native / C1 …
  add column if not exists online_1to1_experience  boolean,
  add column if not exists weekly_availability      text,
  add column if not exists cv_url                   text,      -- a LINK (LinkedIn / Drive / CV url), not a file
  add column if not exists motivation               text;     -- "Why teach at Ward?"
