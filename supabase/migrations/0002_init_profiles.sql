-- 0002_init_profiles
--
-- One row per Supabase Auth user (auth.users). This is the base identity for
-- every person in the system. Roles are *layered* (PRD §4): everyone is a
-- Learner at base, with Instructor / Guardian / Admin layered on top — modelled
-- as an array so a single person can hold several roles.
--
-- Every profile belongs to exactly one tenant; RLS isolates by tenant. The
-- tenant_id used by policies comes from the JWT (added by the access-token hook
-- in the next migration). Until that hook is enabled, the tenant claim is
-- absent and tenant-scoped reads simply return nothing — secure by default.

create type public.user_role as enum ('learner', 'guardian', 'instructor', 'admin');

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  tenant_id   uuid        not null references public.tenants(id) on delete restrict,
  full_name   text,
  roles       public.user_role[] not null default array['learner']::public.user_role[],
  created_at  timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles(tenant_id);

comment on table public.profiles is
  'One row per Supabase Auth user. Base identity + layered roles, scoped to a tenant.';

alter table public.profiles enable row level security;

-- A signed-in user can read their own profile, and any profile within their
-- own tenant. (select auth.uid()) per PRD §7; tenant_id is read from the JWT.
create policy profiles_select_self_or_tenant on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- No insert/update/delete policies for clients: writes go through trusted
-- server code (service role, which bypasses RLS).

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
