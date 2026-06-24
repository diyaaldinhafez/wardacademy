-- 0056_objective_assessment_model
-- New per-student progress model over the frozen curriculum catalog
-- (curriculum_objectives). Source of truth: Ward_Curriculum_Master_Reference.md.
--   objective_assessments — append-only log: one row per assessment moment.
--   objective_progress   — current state per (student, objective): a recency-
--                          weighted DECAYING AVERAGE 0.35·previous + 0.65·new
--                          (first assessment = new), mapped to a 4-state band.
-- Replaces the old binary progress_records / petalValues bridge (retired later).

-- The ONE shared 0–10 → state band (mirrors lib/skills.ts stageForValue).
create or replace function public.ward_stage_for_value(v numeric)
returns text language sql immutable as $$
  select case
    when coalesce(v, 0) < 2   then 'seed'
    when v < 5.5              then 'bud'
    when v < 8.5              then 'balloon'
    else                           'bloom'
  end;
$$;

create table if not exists public.objective_assessments (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  student_id   uuid        not null references public.profiles(id) on delete cascade,
  objective_id text        not null references public.curriculum_objectives(objective_id) on delete cascade,
  value        numeric     not null check (value >= 0 and value <= 10),
  state        text        not null check (state in ('seed','bud','balloon','bloom')),
  evidence     text        check (evidence in ('auto','teacher','mixed')), -- source of THIS assessment
  assessed_at  timestamptz not null default now(),
  assessor     uuid        references public.profiles(id) on delete set null
);
create index if not exists objective_assessments_student_idx
  on public.objective_assessments(student_id, objective_id, assessed_at desc);

create table if not exists public.objective_progress (
  tenant_id        uuid        not null references public.tenants(id) on delete cascade,
  student_id       uuid        not null references public.profiles(id) on delete cascade,
  objective_id     text        not null references public.curriculum_objectives(objective_id) on delete cascade,
  current_value    numeric     not null,
  current_state    text        not null,
  last_assessed_at timestamptz not null,
  primary key (student_id, objective_id)
);
create index if not exists objective_progress_objective_idx on public.objective_progress(objective_id);

-- Normalise the assessment's own state from its value before insert.
create or replace function public.objective_assessments_fill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.state := public.ward_stage_for_value(new.value);
  return new;
end;
$$;

-- Decaying average roll-up: 0.35·previous + 0.65·new (first = new), per row, synchronously.
create or replace function public.objective_assessments_rollup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prev numeric;
  cv   numeric;
begin
  select current_value into prev
    from public.objective_progress
   where student_id = new.student_id and objective_id = new.objective_id;

  if prev is null then
    cv := new.value;
  else
    cv := round(0.35 * prev + 0.65 * new.value, 4);
  end if;

  insert into public.objective_progress
    (tenant_id, student_id, objective_id, current_value, current_state, last_assessed_at)
  values
    (new.tenant_id, new.student_id, new.objective_id, cv, public.ward_stage_for_value(cv), new.assessed_at)
  on conflict (student_id, objective_id) do update
    set current_value    = excluded.current_value,
        current_state    = excluded.current_state,
        last_assessed_at = excluded.last_assessed_at,
        tenant_id        = excluded.tenant_id;
  return new;
end;
$$;

create trigger objective_assessments_before
  before insert on public.objective_assessments
  for each row execute function public.objective_assessments_fill();

create trigger objective_assessments_after
  after insert on public.objective_assessments
  for each row execute function public.objective_assessments_rollup();

-- ---- RLS (mirrors progress_records: learner sees own, guardian sees children, instructor manages tenant, admin reads) ----
alter table public.objective_assessments enable row level security;
alter table public.objective_progress    enable row level security;

create policy objective_assessments_instructor on public.objective_assessments
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy objective_assessments_select_learner  on public.objective_assessments
  for select to authenticated using (student_id = (select auth.uid()));
create policy objective_assessments_select_guardian on public.objective_assessments
  for select to authenticated using (public.is_guardian_of(student_id));
create policy objective_assessments_admin_read on public.objective_assessments
  for select to authenticated using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- objective_progress is written ONLY by the (security-definer) trigger + service-role; clients read.
create policy objective_progress_select_instructor on public.objective_progress
  for select to authenticated using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy objective_progress_select_learner on public.objective_progress
  for select to authenticated using (student_id = (select auth.uid()));
create policy objective_progress_select_guardian on public.objective_progress
  for select to authenticated using (public.is_guardian_of(student_id));
create policy objective_progress_admin_read on public.objective_progress
  for select to authenticated using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.objective_assessments to authenticated;
grant select on public.objective_progress to authenticated;
grant select, insert, update, delete on public.objective_assessments to service_role;
grant select, insert, update, delete on public.objective_progress to service_role;
