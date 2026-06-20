-- 0052_intro_availability
-- Free intro/trial sessions are an OPERATIONS concern, scheduled independently of
-- any teacher. The admin defines when intro sessions can be booked; those windows
-- generate the bookable slots used by the registration funnel. The teacher's own
-- availability is now ONLY for her regular recurring lessons.

create table public.intro_availability_rules (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  weekday     int         not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time  time        not null,
  end_time    time        not null,
  slot_minutes int        not null default 30,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index intro_availability_rules_tenant_id_idx on public.intro_availability_rules(tenant_id);

alter table public.intro_availability_rules enable row level security;

create policy intro_rules_admin on public.intro_availability_rules
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.intro_availability_rules to authenticated;
grant select, insert, update, delete on public.intro_availability_rules to service_role;

-- Clear the stale OPEN slots that were generated from teacher availability; the
-- admin will regenerate intro slots. Booked slots (real trial bookings) stay.
delete from public.availability_slots where status = 'open';
