-- 0013_placement
--
-- Placement test (PRD §3/§5): a short generated test across CEFR levels that
-- informs a learner's starting level. The teacher starts it; the learner takes
-- it; an honest rule suggests a level. Questions + answers are NEVER exposed to
-- the learner via the API (instructor/service-role only) — the learner takes
-- the test through a server action that renders prompts only and grades on the
-- server. The learner/guardian see only the test row + its suggested level.

create table public.placement_tests (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  learner_id      uuid        not null references public.profiles(id) on delete cascade,
  status          text        not null default 'in_progress' check (status in ('in_progress', 'completed')),
  suggested_level text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index placement_tests_tenant_id_idx on public.placement_tests(tenant_id);
create index placement_tests_learner_id_idx on public.placement_tests(learner_id);

create table public.placement_questions (
  id                uuid        primary key default gen_random_uuid(),
  placement_test_id uuid        not null references public.placement_tests(id) on delete cascade,
  tenant_id         uuid        not null references public.tenants(id) on delete cascade,
  level             text        not null,            -- CEFR level this question targets
  format            public.item_format not null,
  prompt            text        not null,
  content           jsonb       not null default '{}'::jsonb, -- student-facing (options)
  answer            jsonb,                                    -- hidden from learners
  position          integer     not null default 0,
  response          jsonb,                                    -- learner's answer (filled on submit)
  is_correct        boolean
);

create index placement_questions_test_idx on public.placement_questions(placement_test_id);

comment on table public.placement_questions is
  'Placement questions + hidden answers. Instructor/service-role only; learners take the test via a server action.';

alter table public.placement_tests enable row level security;
alter table public.placement_questions enable row level security;

-- Tests: instructor manages tenant; learner sees own; guardian sees children's.
create policy placement_tests_modify_instructor on public.placement_tests
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy placement_tests_select_learner on public.placement_tests
  for select to authenticated
  using (learner_id = (select auth.uid()));

create policy placement_tests_select_guardian on public.placement_tests
  for select to authenticated
  using (public.is_guardian_of(learner_id));

-- Questions: instructor only (learners reach them through trusted server code).
create policy placement_questions_instructor on public.placement_questions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.placement_tests to authenticated;
grant select, insert, update, delete on public.placement_tests to service_role;
grant select, insert, update, delete on public.placement_questions to authenticated;
grant select, insert, update, delete on public.placement_questions to service_role;
