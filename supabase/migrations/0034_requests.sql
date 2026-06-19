-- 0034_requests
--
-- Learning-phase cases: pause / cancel / complaint / other request, managed by
-- the admin as a queue. Enrollment status transitions live on the enrollment.

create table public.requests (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants(id) on delete cascade,
  learner_id uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null check (type in ('pause', 'cancel', 'complaint', 'other')),
  details    text,
  status     text        not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  resolution text,
  created_by uuid        references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);
create index requests_tenant_idx on public.requests(tenant_id, status);
create index requests_learner_idx on public.requests(learner_id);

alter table public.requests enable row level security;

create policy requests_admin on public.requests
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.requests to authenticated;
grant select, insert, update, delete on public.requests to service_role;
