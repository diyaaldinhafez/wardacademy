-- 0065_descriptor_en — English renderings of the frozen Arabic catalog.
--
-- Additive + non-breaking: two NULLABLE columns. The Arabic descriptor_ar / title_ar
-- stay the SOURCE OF TRUTH (Ward_Curriculum_Master_Reference.md); descriptor_en /
-- title_en are an audited derived rendering, loaded by scripts/load-descriptor-en.mjs.
-- No surface depends on these yet (loaded but not wired) — connect-before-cut at the
-- data layer. Re-runnable (if not exists).

alter table public.curriculum_objectives add column if not exists descriptor_en text;
alter table public.curriculum_units      add column if not exists title_en      text;
