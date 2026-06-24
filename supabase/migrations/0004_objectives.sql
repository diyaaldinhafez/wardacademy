-- 0004_objectives
--
-- Objective = the neutral spine of the platform (PRD §5/§6). Plans, items and
-- reports are all measured against objectives. An objective bends to either a
-- CEFR ladder node or a flexible school topic ("dual-track"). Objectives form a
-- tree (parent_id) so a level/unit can hold sub-objectives.
--
-- Tenant-isolated. Anyone in the tenant may read; only Instructors (role from
-- the JWT) may create/modify — enforcing the layered role model (PRD §4).

create type public.objective_track as enum ('cefr', 'school');

create table public.objectives (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  parent_id   uuid        references public.objectives(id) on delete set null,
  track       public.objective_track not null,
  level       text,        -- CEFR code (A1..B1) or a school reference label
  description text        not null,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index objectives_tenant_id_idx on public.objectives(tenant_id);
create index objectives_parent_id_idx on public.objectives(parent_id);

comment on table public.objectives is
  'Learning objective — the neutral spine. Dual-track (CEFR or school), tree-structured, tenant-scoped.';

alter table public.objectives enable row level security;

-- Read: any signed-in user within the same tenant.
create policy objectives_select_tenant on public.objectives
  for select to authenticated
  using ( tenant_id = (auth.jwt() ->> 'tenant_id')::uuid );

-- Create / update / delete: Instructors within the same tenant.
create policy objectives_modify_instructor on public.objectives
  for all to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'roles') ? 'instructor'
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'roles') ? 'instructor'
  );

-- Table-level grants (RLS still restricts rows); service role bypasses RLS.
grant select, insert, update, delete on public.objectives to authenticated;
grant select, insert, update, delete on public.objectives to service_role;
