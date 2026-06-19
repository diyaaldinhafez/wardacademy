-- 0049_skill_assessments
-- Teacher-set skill assessments. Used for Speaking (المحادثة), which is filled by
-- teacher judgement only (no automatic pronunciation scoring in v1). value is
-- 0..1 and drives the matching skill petal directly.

create table public.skill_assessments (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  learner_id  uuid        not null references public.profiles(id) on delete cascade,
  skill       text        not null,
  value       numeric     not null check (value >= 0 and value <= 1),
  label       text,
  note        text,
  updated_by  uuid        references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (learner_id, skill)
);

create index skill_assessments_learner_id_idx on public.skill_assessments(learner_id);

alter table public.skill_assessments enable row level security;

create policy skill_assessments_instructor on public.skill_assessments
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy skill_assessments_admin_read on public.skill_assessments
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy skill_assessments_select_learner on public.skill_assessments
  for select to authenticated using (learner_id = (select auth.uid()));
create policy skill_assessments_select_guardian on public.skill_assessments
  for select to authenticated using (public.is_guardian_of(learner_id));

grant select, insert, update, delete on public.skill_assessments to authenticated;
grant select, insert, update, delete on public.skill_assessments to service_role;
