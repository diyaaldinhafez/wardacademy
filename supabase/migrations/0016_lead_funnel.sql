-- 0016_lead_funnel
--
-- Enrolment funnel that precedes any account (teacher-managed onboarding):
--   * leads            — a public registration request (guardian + student info)
--   * availability_slots — intro-session times the teacher opens; the public
--                          books one (no account yet).
-- The public never touches these tables directly: the registration form and the
-- booking widget go through server actions (service role). Instructors manage
-- them via RLS. Accounts are provisioned later by the teacher from a lead.

create table public.leads (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants(id) on delete cascade,
  guardian_name  text        not null,
  guardian_email text        not null,
  guardian_phone text,                       -- for WhatsApp sharing
  student_name   text        not null,
  student_grade  text,                       -- e.g. "Grade 3"
  student_level  text,                       -- declared level (beginner / A1 …)
  student_notes  text,                       -- goals / details
  status         text        not null default 'new'
                   check (status in ('new', 'booked', 'testing', 'tested', 'converted', 'archived')),
  created_at     timestamptz not null default now()
);

create index leads_tenant_id_idx on public.leads(tenant_id);

comment on table public.leads is
  'Public enrolment request (NOT an account). The teacher reviews it and later provisions accounts.';

create table public.availability_slots (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  instructor_id uuid        not null references public.profiles(id) on delete cascade,
  starts_at     timestamptz not null,
  duration_minutes integer  not null default 30 check (duration_minutes between 5 and 240),
  status        text        not null default 'open' check (status in ('open', 'booked')),
  lead_id       uuid        references public.leads(id) on delete set null, -- set when booked
  created_at    timestamptz not null default now(),
  unique (instructor_id, starts_at)
);

create index availability_slots_tenant_id_idx on public.availability_slots(tenant_id);
create index availability_slots_open_idx on public.availability_slots(tenant_id, status, starts_at);

comment on table public.availability_slots is
  'Intro-session times the teacher opens for booking. Public reads open slots / books via server actions.';

alter table public.leads enable row level security;
alter table public.availability_slots enable row level security;

-- Instructors manage their tenant's leads (read/update/archive). Inserts come
-- from the public form via the service role, so no client INSERT grant.
create policy leads_instructor on public.leads
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.leads to service_role;

-- Instructors manage their tenant's slots. Public read/book go through the
-- service role (server actions), so no anon access.
create policy slots_instructor on public.availability_slots
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.availability_slots to authenticated;
grant select, insert, update, delete on public.availability_slots to service_role;
