-- 0001_init_tenants
--
-- The top-level isolation unit. Every domain table will carry a tenant_id and
-- isolate by it via RLS. RLS is enabled here; with no policies defined, the
-- anon and authenticated roles receive zero rows (secure by default). Trusted
-- server-side code uses the service-role key (BYPASSRLS) to manage tenants.

create table if not exists public.tenants (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  created_at  timestamptz not null default now()
);

comment on table public.tenants is
  'Top-level tenant / isolation unit. All domain tables reference tenant_id and isolate via RLS.';

alter table public.tenants enable row level security;

-- Clients never query tenants directly, so no grants to anon/authenticated.
-- Only the trusted server role can read/write it through the Data API.
grant select, insert, update, delete on public.tenants to service_role;
