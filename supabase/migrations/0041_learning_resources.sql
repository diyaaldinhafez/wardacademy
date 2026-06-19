-- 0041_learning_resources
-- Curriculum learning resources per learner (links/notes the teacher attaches).
-- Inert reference material — outside the generation/mastery engine.

create table public.learning_resources (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  learner_id  uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  url         text,
  note        text,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index learning_resources_learner_id_idx on public.learning_resources(learner_id);
create index learning_resources_tenant_id_idx on public.learning_resources(tenant_id);

alter table public.learning_resources enable row level security;

-- Instructor manages resources in their tenant.
create policy learning_resources_instructor on public.learning_resources
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Admin oversight (read).
create policy learning_resources_admin_read on public.learning_resources
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- The learner sees their own; a guardian sees their children's.
create policy learning_resources_select_learner on public.learning_resources
  for select to authenticated
  using (learner_id = (select auth.uid()));

create policy learning_resources_select_guardian on public.learning_resources
  for select to authenticated
  using (public.is_guardian_of(learner_id));

grant select, insert, update, delete on public.learning_resources to authenticated;
grant select, insert, update, delete on public.learning_resources to service_role;
