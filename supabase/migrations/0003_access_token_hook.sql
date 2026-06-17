-- 0003_access_token_hook
--
-- Custom Access Token hook: on every token issuance, look up the user's
-- profile and inject `tenant_id` and `roles` into the JWT claims. RLS policies
-- then read `auth.jwt() ->> 'tenant_id'` to isolate by tenant, with no extra
-- round-trips at request time.
--
-- After applying this migration, the hook must be ENABLED once in the Supabase
-- dashboard: Authentication → Hooks → "Customize Access Token (JWT) Claims" →
-- select public.custom_access_token_hook. (A project setting, not SQL.)

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims   jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_tenant uuid;
  v_roles  public.user_role[];
begin
  select tenant_id, roles
    into v_tenant, v_roles
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  if v_tenant is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant::text), true);
  end if;
  claims := jsonb_set(claims, '{roles}', coalesce(to_jsonb(v_roles), '[]'::jsonb), true);

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The hook executes as the supabase_auth_admin role. Let only that role run it
-- and read the profile data it needs; deny everyone else.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.profiles to supabase_auth_admin;

-- supabase_auth_admin is not BYPASSRLS, so give it an explicit read policy.
create policy profiles_auth_admin_read on public.profiles
  for select to supabase_auth_admin
  using (true);
