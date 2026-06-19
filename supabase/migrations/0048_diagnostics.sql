-- 0048_diagnostics
-- Phase 4 (Note 1): an AI diagnostic report generated from the sum of a student's
-- inputs (enrollment form + placement + intro-session report + internal notes).
-- The teacher reviews & approves it; it becomes the baseline. Internal — not
-- shown to the family.

-- Link a provisioned learner back to the lead it came from (to gather inputs).
alter table public.leads add column if not exists converted_learner_id uuid references public.profiles(id) on delete set null;
create index if not exists leads_converted_learner_idx on public.leads(converted_learner_id);

create table public.diagnostics (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  learner_id  uuid        not null unique references public.profiles(id) on delete cascade,
  report      text,
  status      text        not null default 'draft' check (status in ('draft', 'approved')),
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

create index diagnostics_learner_id_idx on public.diagnostics(learner_id);

alter table public.diagnostics enable row level security;

create policy diagnostics_instructor on public.diagnostics
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy diagnostics_admin_read on public.diagnostics
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.diagnostics to authenticated;
grant select, insert, update, delete on public.diagnostics to service_role;
