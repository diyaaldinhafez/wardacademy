-- 0054_assessment_tests
-- Turn assessments from a manual gradebook into real checkpoints: an AI test is
-- generated from a plan unit's objectives, the teacher reviews/approves it, the
-- child takes it in /learn, and it is auto-graded into a per-skill result.

-- Extend assessments: lifecycle (draft -> ready -> completed), the scope unit, and the per-skill result.
alter table public.assessments drop constraint if exists assessments_status_check;
alter table public.assessments add constraint assessments_status_check
  check (status in ('planned', 'draft', 'ready', 'completed'));
alter table public.assessments add column if not exists unit text;
alter table public.assessments add column if not exists result jsonb;

-- Questions + hidden answers (mirrors placement_questions). Learners reach these
-- only through trusted server code; they never get a select policy.
create table if not exists public.assessment_questions (
  id            uuid        primary key default gen_random_uuid(),
  assessment_id uuid        not null references public.assessments(id) on delete cascade,
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  skill         text        not null,            -- listening | speaking | reading | writing | vocabulary
  format        public.item_format not null default 'multiple_choice',
  prompt        text        not null,
  content       jsonb       not null default '{}'::jsonb, -- student-facing (options)
  answer        jsonb,                                    -- hidden from learners
  position      integer     not null default 0,
  response      jsonb,                                    -- learner's answer (filled on submit)
  is_correct    boolean
);

create index if not exists assessment_questions_assessment_idx on public.assessment_questions(assessment_id);

comment on table public.assessment_questions is
  'Assessment questions + hidden answers. Instructor/service-role only; learners take the test via a server action.';

alter table public.assessment_questions enable row level security;

create policy assessment_questions_instructor on public.assessment_questions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.assessment_questions to authenticated;
grant select, insert, update, delete on public.assessment_questions to service_role;
