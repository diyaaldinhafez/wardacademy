-- 0005_items
--
-- Item = a question, tagged with its objective from creation (PRD §6). In v1 it
-- is AI-generated *original* content (origin='ai') or entered manually
-- ('manual'). `source` is the attribution field — intentionally empty in v1, a
-- reserved hook. `content` holds the format-specific payload (options, answer…).
--
-- Governing principle (PRD §6 line 24): no AI output reaches a student or
-- guardian before the Instructor approves it. RLS enforces this directly:
--   * everyone in the tenant can read APPROVED items;
--   * only Instructors can read drafts and create/modify/approve.

create type public.item_format     as enum ('multiple_choice','fill_blank','true_false','matching','open','audio');
create type public.item_difficulty  as enum ('easy','medium','hard');
create type public.item_origin      as enum ('ai','manual');
create type public.item_status      as enum ('draft','approved','rejected');

create table public.items (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  objective_id uuid        not null references public.objectives(id) on delete cascade,
  format       public.item_format     not null,
  difficulty   public.item_difficulty not null default 'medium',
  prompt       text        not null,
  content      jsonb       not null default '{}'::jsonb,
  origin       public.item_origin     not null default 'ai',
  status       public.item_status     not null default 'draft',
  source       text,        -- attribution hook; intentionally empty in v1
  created_by   uuid        references public.profiles(id) on delete set null,
  approved_by  uuid        references public.profiles(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index items_tenant_id_idx    on public.items(tenant_id);
create index items_objective_id_idx on public.items(objective_id);
create index items_status_idx       on public.items(tenant_id, status);

comment on table public.items is
  'A question tagged with its objective. AI-original or manual; gated by Instructor approval before students see it.';

alter table public.items enable row level security;

-- Everyone in the tenant sees only APPROVED items.
create policy items_select_approved_tenant on public.items
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and status = 'approved'
  );

-- Instructors read/create/modify/approve everything in their tenant (drafts too).
create policy items_modify_instructor on public.items
  for all to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'roles') ? 'instructor'
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and (auth.jwt() -> 'roles') ? 'instructor'
  );

grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.items to service_role;
