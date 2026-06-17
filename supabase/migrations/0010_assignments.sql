-- 0010_assignments
--
-- Per-learner assignment. Until now every learner in a tenant could see every
-- approved item. The teacher should decide what each learner practices, so we
-- add assignments (approved item -> learner) and tighten the learner's view of
-- items to "approved AND assigned to me". Instructors still see everything.

create table public.assignments (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  item_id     uuid        not null references public.items(id) on delete cascade,
  learner_id  uuid        not null references public.profiles(id) on delete cascade,
  assigned_by uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (item_id, learner_id)
);

create index assignments_tenant_id_idx on public.assignments(tenant_id);
create index assignments_learner_id_idx on public.assignments(learner_id);
create index assignments_item_id_idx on public.assignments(item_id);

comment on table public.assignments is
  'Assigns an approved item to a specific learner. Scopes what each learner sees/practices.';

alter table public.assignments enable row level security;

-- Instructors manage assignments in their tenant.
create policy assignments_modify_instructor on public.assignments
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- A learner sees their own assignments; a guardian sees their children's.
create policy assignments_select_learner on public.assignments
  for select to authenticated
  using (learner_id = (select auth.uid()));

create policy assignments_select_guardian on public.assignments
  for select to authenticated
  using (public.is_guardian_of(learner_id));

grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.assignments to service_role;

-- Tighten the learner's item view: only approved items assigned to them.
-- (Instructors keep full access via items_modify_instructor.)
drop policy items_select_approved_tenant on public.items;

create policy items_select_approved_assigned on public.items
  for select to authenticated
  using (
    status = 'approved'
    and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.assignments a
      where a.item_id = items.id and a.learner_id = (select auth.uid())
    )
  );
