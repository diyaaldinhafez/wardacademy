-- 0068_ae8_drop_old_model — Assessment Evidence-Model Redesign · gate AE-8: HARD-DELETE.
--
-- The decaying trigger (0056) + all old aggregation/writer code were removed in AE-3, and every
-- surface now reads objective_evidence (AE-4/AE-6 → evidenceBloom). objective_assessments +
-- objective_progress are orphaned data that NOTHING reads or writes (app/lib have zero `.from()`
-- on either; the demo seeds were updated this gate; no incoming FK / view / RLS depends on them —
-- verified). Per Diya's locked decision (no real learners; broken-model test data): DROP both
-- tables — no archive (a pre-delete JSON snapshot lives in backups/ for technical rollback only).
-- IRREVERSIBLE. The live model (objective_evidence) is untouched.

drop table if exists public.objective_assessments;
drop table if exists public.objective_progress;
