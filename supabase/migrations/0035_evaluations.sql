-- 0035_evaluations
--
-- Periodic guardian evaluation of the teacher and the platform. Recorded by the
-- admin for now (the guardian will submit it directly from their account later).
-- One per learner per month.

create table public.evaluations (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  learner_id      uuid        not null references public.profiles(id) on delete cascade,
  period          text        not null,                                  -- 'YYYY-MM'
  teacher_rating  integer     check (teacher_rating between 1 and 5),
  platform_rating integer     check (platform_rating between 1 and 5),
  recommend       integer     check (recommend between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now(),
  unique (learner_id, period)
);
create index evaluations_tenant_idx on public.evaluations(tenant_id);
create index evaluations_learner_idx on public.evaluations(learner_id);

alter table public.evaluations enable row level security;

create policy evaluations_admin on public.evaluations
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.evaluations to authenticated;
grant select, insert, update, delete on public.evaluations to service_role;
