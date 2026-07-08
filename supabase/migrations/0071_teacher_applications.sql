-- 0071_teacher_applications — §9(f) Teacher Lifecycle Funnel (minimum depth).
--
-- A public, self-service teacher application — the teacher-side mirror of `leads`. The applicant
-- exists ONLY as a row in THIS table until an admin APPROVES; approval (provisionTeacher) is the
-- SOLE place an instructor account is minted. NO auth user, NO profiles row, and NO teacher_profiles
-- row is created at application time (R1 — the security core). teacher_profiles is UNCHANGED.
--
-- Public INSERT goes through the service-role client (like submitLead), so there is deliberately NO
-- anon/public RLS policy — the admin policy below governs authenticated (admin) reads/updates.

create table public.teacher_applications (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  full_name    text        not null,
  email        text        not null,
  phone        text,
  languages    text,       -- comma-separated (mirrors teacher_profiles.languages)
  specialties  text,       -- comma-separated (mirrors teacher_profiles.specialties)
  bio          text,
  note         text,       -- applicant free-text (experience / why)
  status       text        not null default 'applied' check (status in ('applied', 'approved', 'rejected')),
  reviewed_by  uuid        references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index teacher_applications_tenant_status_idx on public.teacher_applications(tenant_id, status, created_at desc);

alter table public.teacher_applications enable row level security;

-- Admin manages applications within their tenant; the PUBLIC form inserts via service-role (no anon policy).
create policy teacher_applications_admin on public.teacher_applications
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, update on public.teacher_applications to authenticated;
grant select, insert, update, delete on public.teacher_applications to service_role;
