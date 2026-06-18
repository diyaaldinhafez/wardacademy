-- 0026_lead_student_age
--
-- Replace date of birth + school stage with a simple student age (7–15).
-- The dob / grade columns are left in place (unused) to avoid destructive drops.

alter table public.leads
  add column if not exists student_age integer check (student_age between 5 and 18);
