-- 0042_assessments
-- Assessments that punctuate the study plan at milestones: end of a unit, a
-- term/chapter, or the whole plan. The teacher plans them and records results.

create table public.assessments (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  learner_id    uuid        not null references public.profiles(id) on delete cascade,
  title         text        not null,
  scope         text        not null default 'unit' check (scope in ('unit', 'term', 'plan')),
  status        text        not null default 'planned' check (status in ('planned', 'completed')),
  score         int,
  max_score     int,
  notes         text,
  scheduled_for date,
  completed_at  timestamptz,
  created_by    uuid        references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index assessments_learner_id_idx on public.assessments(learner_id);
create index assessments_tenant_id_idx on public.assessments(tenant_id);

alter table public.assessments enable row level security;

create policy assessments_instructor on public.assessments
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy assessments_admin_read on public.assessments
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy assessments_select_learner on public.assessments
  for select to authenticated
  using (learner_id = (select auth.uid()));

create policy assessments_select_guardian on public.assessments
  for select to authenticated
  using (public.is_guardian_of(learner_id));

grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.assessments to service_role;
