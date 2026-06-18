-- 0022_intro_report
--
-- The operations coordinator records the outcome of the free intro session on
-- the lead (lightweight; not a learning session report).

alter table public.leads
  add column if not exists intro_outcome   text,   -- e.g. 'interested' / 'follow_up' / 'declined'
  add column if not exists intro_notes     text,
  add column if not exists intro_done_at   timestamptz;
