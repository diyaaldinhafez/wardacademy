-- 0058_retire_old_progress
-- Phase 5 retirement — runs ONLY after verifying that auto-graded unit tests now
-- write objective_assessments(evidence='auto') and move objective_progress
-- (Guard 1), and after the backup snapshot was taken (Guard 3):
--   backups/phase5_old_model_2026-06-24.json
--
-- The old progress half is dead: drop the submissions→progress_records trigger +
-- function and the progress_records table. Then clear the demo/junk rows from the
-- old objectives table (Grade 6 · null-level · the demo set). The objectives table
-- itself stays — the study-plan builder still materialises plan objectives into it
-- (objectives.plan_id → study_plans is ON DELETE SET NULL, so study_plans survive).
-- Clearing objectives cascades to the demo items/submissions (ON DELETE CASCADE).

drop trigger if exists submissions_after_write on public.submissions;
drop function if exists public.submissions_update_progress() cascade;
drop table if exists public.progress_records cascade;

delete from public.objectives;
