-- 0067_ae3_retire_decaying_trigger — Assessment Evidence-Model Redesign · gate AE-3.
--
-- RETIRE the objective-level decaying (the old model's engine). The surfaces now read
-- objective_evidence via the AE-2 functions (Surface-Wiring gate, Diya-verified), so the old
-- path objective_assessments → trigger 0056 → objective_progress has ZERO consumers. Drop the
-- two triggers + their functions (objective-level decay gone; the new decay is per-skill across
-- units, in TS). ward_stage_for_value is dropped too — it is used ONLY by these trigger
-- functions (confirmed: no other migration/column references it; the TS stageForValue is the
-- single live scale).
--
-- DATA IS NOT DELETED: objective_assessments + objective_progress rows REMAIN (hard-delete is
-- AE-8). After this, writing objective_assessments no longer moves objective_progress.

drop trigger   if exists objective_assessments_after  on public.objective_assessments;
drop trigger   if exists objective_assessments_before on public.objective_assessments;
drop function  if exists public.objective_assessments_rollup();
drop function  if exists public.objective_assessments_fill();
drop function  if exists public.ward_stage_for_value(numeric);
