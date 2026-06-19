-- 0037_teacher_profiles
--
-- Teacher metadata the admin manages (1:1 with an instructor profile). Keeps
-- public.profiles clean. Multi-teacher-ready (one row per instructor).

create table public.teacher_profiles (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  instructor_id uuid        not null references public.profiles(id) on delete cascade,
  bio           text,
  languages     text,       -- comma-separated
  specialties   text,       -- comma-separated
  phone         text,
  photo_url     text,
  start_date    date,
  status        text        not null default 'active' check (status in ('active', 'inactive')),
  notes         text,       -- internal ops notes
  created_at    timestamptz not null default now(),
  unique (instructor_id)
);
create index teacher_profiles_tenant_idx on public.teacher_profiles(tenant_id);

alter table public.teacher_profiles enable row level security;

create policy teacher_profiles_admin on public.teacher_profiles
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.teacher_profiles to authenticated;
grant select, insert, update, delete on public.teacher_profiles to service_role;
