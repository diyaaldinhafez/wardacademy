-- 0053_objective_plan_link
-- Link materialized objectives back to their plan + the stable lesson id they
-- came from, so the plan can be edited (even after approval) and re-synced
-- idempotently: new lessons add objectives, removed lessons drop theirs (only if
-- no progress yet).

alter table public.objectives add column if not exists plan_id uuid references public.study_plans(id) on delete set null;
alter table public.objectives add column if not exists plan_lesson_id text;
create index if not exists objectives_plan_id_idx on public.objectives(plan_id);
