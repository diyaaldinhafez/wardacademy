-- 0061_items_objective_catalog
--
-- Re-point homework items at the Ward Curriculum catalog: items.objective_id moves
-- from uuid → objectives(id) (the old free-text, plan-materialized table) to
-- text → curriculum_objectives(objective_id) (e.g. "A1-U01-L1"). This retires the
-- last hard dependency on the old objectives table for homework, completing the
-- plan↔catalog unification. curriculum_objectives.objective_id is the PRIMARY KEY,
-- so it is a valid FK target. Safe & clean: there are zero rows in items today, so
-- the type change carries no data.

-- Drop the old FK to objectives, retype the column, and FK it to the catalog.
alter table public.items drop constraint if exists items_objective_id_fkey;
alter table public.items alter column objective_id type text using objective_id::text;
alter table public.items
  add constraint items_objective_id_fkey
  foreign key (objective_id) references public.curriculum_objectives(objective_id) on delete cascade;
