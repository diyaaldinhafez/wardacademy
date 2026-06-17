-- 0006_guardianships
--
-- Guardian-anchored identity (PRD §3/§6): the Guardian is the authenticated
-- account holder, linked one-to-many to Learners (their children), each link
-- carrying its own consent record + timestamp. Learners are minors (is_minor).
--
-- This migration also TIGHTENS profile visibility: instead of every tenant
-- member seeing every profile, we scope it by role — instructors see their
-- whole tenant, guardians see themselves + their own children, learners see
-- only themselves. The guardian check uses a SECURITY DEFINER helper so the
-- profiles policy never recurses through guardianships' own RLS.

alter table public.profiles
  add column is_minor boolean not null default false;

create table public.guardianships (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null references public.tenants(id) on delete cascade,
  guardian_id      uuid        not null references public.profiles(id) on delete cascade,
  learner_id       uuid        not null references public.profiles(id) on delete cascade,
  relationship     text,        -- e.g. parent, guardian
  consent_granted  boolean     not null default false,
  consent_at       timestamptz,
  created_at       timestamptz not null default now(),
  unique (guardian_id, learner_id),
  check (guardian_id <> learner_id)
);

create index guardianships_tenant_id_idx  on public.guardianships(tenant_id);
create index guardianships_guardian_id_idx on public.guardianships(guardian_id);
create index guardianships_learner_id_idx  on public.guardianships(learner_id);

comment on table public.guardianships is
  'Guardian -> Learner link (one guardian to many children) with per-child consent. Tenant-scoped.';

alter table public.guardianships enable row level security;

-- A guardian sees their own links; an instructor sees all links in the tenant.
create policy guardianships_select on public.guardianships
  for select to authenticated
  using (
    guardian_id = (select auth.uid())
    or (
      (auth.jwt() -> 'roles') ? 'instructor'
      and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Links are created/managed by trusted server code (onboarding + consent flow).
grant select on public.guardianships to authenticated;
grant select, insert, update, delete on public.guardianships to service_role;

-- Recursion-safe guardian check for use inside the profiles policy.
create function public.is_guardian_of(p_learner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.guardianships
    where guardian_id = (select auth.uid()) and learner_id = p_learner
  );
$$;

revoke execute on function public.is_guardian_of(uuid) from public, anon;
grant execute on function public.is_guardian_of(uuid) to authenticated;

-- Replace the broad tenant-wide profile read with a role-scoped one.
drop policy profiles_select_self_or_tenant on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())                                 -- self
    or (
      (auth.jwt() -> 'roles') ? 'instructor'                 -- instructor: whole tenant
      and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    or public.is_guardian_of(id)                             -- guardian: own children
  );
