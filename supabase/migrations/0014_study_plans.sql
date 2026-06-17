-- 0014_study_plans
--
-- AI-generated, teacher-approved study plan per learner (PRD §6): a titled,
-- ordered list of learning objectives, informed by the placement level. The
-- objective list is stored as a JSONB array on the plan row (simple, one
-- approval gate). Learner/guardian see the plan only once approved.

create table public.study_plans (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  learner_id  uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  level       text,                                   -- target CEFR level
  items       jsonb       not null default '[]'::jsonb, -- [{ description, level }]
  status      public.item_status not null default 'draft',
  created_by  uuid        references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index study_plans_tenant_id_idx on public.study_plans(tenant_id);
create index study_plans_learner_id_idx on public.study_plans(learner_id);

comment on table public.study_plans is
  'AI-generated, teacher-approved learning plan (ordered objectives in items jsonb). Family sees it once approved.';

alter table public.study_plans enable row level security;

create policy study_plans_modify_instructor on public.study_plans
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy study_plans_select_learner on public.study_plans
  for select to authenticated
  using (learner_id = (select auth.uid()) and status = 'approved');

create policy study_plans_select_guardian on public.study_plans
  for select to authenticated
  using (public.is_guardian_of(learner_id) and status = 'approved');

grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update, delete on public.study_plans to service_role;
