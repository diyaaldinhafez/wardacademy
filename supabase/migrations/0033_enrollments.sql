-- 0033_enrollments
--
-- Learning phase: each active student has an enrollment (subscription) the
-- admin manages, with monthly invoices. Manual payment marking for now (a real
-- gateway is a later feature). Admin-only RLS.

alter table public.tenants add column if not exists currency text not null default 'SAR';

-- Admin can read all profiles in its tenant (manage active students/teachers).
create policy profiles_admin_read on public.profiles
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create table public.enrollments (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null references public.tenants(id) on delete cascade,
  learner_id         uuid        not null references public.profiles(id) on delete cascade,
  instructor_id      uuid        references public.profiles(id) on delete set null,
  status             text        not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  monthly_fee        integer     not null default 0,
  sessions_per_month integer,
  start_date         date        not null default current_date,
  paused_at          timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  created_at         timestamptz not null default now()
);
create index enrollments_tenant_idx on public.enrollments(tenant_id);
create index enrollments_learner_idx on public.enrollments(learner_id);

create table public.invoices (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  enrollment_id uuid        not null references public.enrollments(id) on delete cascade,
  learner_id    uuid        not null references public.profiles(id) on delete cascade,
  period        text        not null,                         -- 'YYYY-MM'
  amount        integer     not null,
  status        text        not null default 'pending' check (status in ('pending', 'paid', 'void')),
  due_date      date,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (enrollment_id, period)
);
create index invoices_tenant_idx on public.invoices(tenant_id);

alter table public.enrollments enable row level security;
alter table public.invoices enable row level security;

create policy enrollments_admin on public.enrollments
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy invoices_admin on public.invoices
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.enrollments to authenticated;
grant select, insert, update, delete on public.enrollments to service_role;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoices to service_role;
