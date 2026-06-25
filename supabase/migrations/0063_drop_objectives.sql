-- 0063_drop_objectives
--
-- Final cut of the plan↔catalog unification. The old materialized `objectives`
-- table is fully retired: the Ward Curriculum catalog (curriculum_objectives) is
-- the single source, plans aggregate from it, and progress lives in
-- objective_assessments / objective_progress. As of gate 5b the table holds 0 rows,
-- no submission references it (column nulled + trigger decoupled in 0062), and no
-- view/function/live-code path touches it.
--
-- Order matters: drop submissions.objective_id FIRST — that removes the last FK
-- pointing INTO objectives (submissions_objective_id_fkey) — then drop the table
-- (its self-referential objectives_parent_id_fkey drops with it).

alter table public.submissions drop column objective_id;

drop table public.objectives;
