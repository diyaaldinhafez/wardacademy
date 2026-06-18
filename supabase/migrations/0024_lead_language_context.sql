-- 0024_lead_language_context
--
-- Whether English is part of the child's daily life (vs. only academic), and
-- the home language(s) — important context for multilingual families (e.g. a
-- child in Germany: school German, home Arabic, English rarely used daily).

alter table public.leads
  add column if not exists english_use   text,   -- home_school | school_only | sometimes | rarely
  add column if not exists home_language text;
