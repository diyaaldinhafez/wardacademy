-- 0020_availability_rules
--
-- Recurring weekly availability for intro sessions. The admin defines weekly
-- rules (e.g. every Monday 16:00–18:00, 30-min slots) plus exception dates
-- (holidays / blocked days). A server action expands these into concrete
-- bookable availability_slots over a rolling horizon (UPSERT; never touches
-- booked or manually-added slots).

-- Per-tenant timezone for interpreting rule local times.
alter table public.tenants add column if not exists timezone text not null default 'Asia/Riyadh';

create table public.availability_rules (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  instructor_id uuid        not null references public.profiles(id) on delete cascade,
  weekday       smallint    not null check (weekday between 0 and 6), -- 0 = Sunday … 6 = Saturday
  start_time    time        not null,
  end_time      time        not null check (end_time > start_time),
  slot_minutes  integer     not null default 30 check (slot_minutes between 5 and 240),
  active        boolean     not null default true,
  created_at    timestamptz not null default now()
);
create index availability_rules_tenant_idx on public.availability_rules(tenant_id);

create table public.availability_exceptions (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants(id) on delete cascade,
  on_date    date        not null,
  kind       text        not null default 'block' check (kind in ('block')), -- room for 'open' later
  reason     text,
  created_at timestamptz not null default now(),
  unique (tenant_id, on_date)
);
create index availability_exceptions_tenant_idx on public.availability_exceptions(tenant_id);

-- Mark rule-generated slots so regeneration can prune them without touching
-- booked or manually-added slots.
alter table public.availability_slots
  add column if not exists source_rule_id uuid references public.availability_rules(id) on delete set null;

alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;

create policy availability_rules_admin on public.availability_rules
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy availability_exceptions_admin on public.availability_exceptions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_rules to service_role;
grant select, insert, update, delete on public.availability_exceptions to authenticated;
grant select, insert, update, delete on public.availability_exceptions to service_role;
