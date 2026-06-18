-- 0017_lead_tests
--
-- Placement test for a LEAD (before any account). The teacher generates it from
-- the lead's student info, reviews + approves it, then shares a signed link
-- (WhatsApp). The student takes it via that link; questions/answers are never
-- exposed except through the trusted server path. Reaching the student only
-- after teacher approval preserves the governing principle.

create table public.lead_tests (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  lead_id         uuid        not null references public.leads(id) on delete cascade,
  status          text        not null default 'draft' check (status in ('draft', 'shared', 'completed')),
  share_token     text        unique,
  suggested_level text,
  created_by      uuid        references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  shared_at       timestamptz,
  completed_at    timestamptz
);

create index lead_tests_tenant_id_idx on public.lead_tests(tenant_id);
create index lead_tests_lead_id_idx on public.lead_tests(lead_id);

create table public.lead_test_questions (
  id           uuid        primary key default gen_random_uuid(),
  lead_test_id uuid        not null references public.lead_tests(id) on delete cascade,
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  level        text,
  format       public.item_format not null,
  prompt       text        not null,
  content      jsonb       not null default '{}'::jsonb, -- student-facing (options)
  answer       jsonb,                                    -- hidden
  position     integer     not null default 0,
  response     jsonb,
  is_correct   boolean
);

create index lead_test_questions_test_idx on public.lead_test_questions(lead_test_id);

comment on table public.lead_tests is
  'Pre-account placement test for a lead. Teacher-approved, shared by signed link; taken via server actions.';

alter table public.lead_tests enable row level security;
alter table public.lead_test_questions enable row level security;

-- Instructors manage them; the public take path goes through service-role
-- actions that validate the share token (no anon table access).
create policy lead_tests_instructor on public.lead_tests
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy lead_test_q_instructor on public.lead_test_questions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.lead_tests to authenticated;
grant select, insert, update, delete on public.lead_tests to service_role;
grant select, insert, update, delete on public.lead_test_questions to authenticated;
grant select, insert, update, delete on public.lead_test_questions to service_role;
