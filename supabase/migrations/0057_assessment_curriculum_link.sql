-- 0057_assessment_curriculum_link
-- Phase 5: tie a unit test to a catalog unit so its auto-graded result can feed
-- the new model. On completion, each skill's percentage → percent key → value →
-- objective_assessments(evidence='auto') for every catalog objective of
-- (curriculum_unit_id, skill). Additive + reversible (nullable FK, no data touched).
alter table public.assessments
  add column if not exists curriculum_unit_id text references public.curriculum_units(unit_id);

create index if not exists assessments_curriculum_unit_idx on public.assessments(curriculum_unit_id);
