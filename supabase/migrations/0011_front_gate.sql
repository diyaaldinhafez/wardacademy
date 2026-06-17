-- 0011_front_gate
--
-- Self-serve onboarding (PRD §3). A guardian signs up and joins the default
-- tenant (v1 has a single instructor/tenant). They then create their child's
-- prepared login. login_email lets the guardian see the child's sign-in email.

alter table public.tenants add column is_default boolean not null default false;

-- At most one default tenant.
create unique index tenants_one_default_idx on public.tenants (is_default) where is_default;

-- Display-only: the email a profile signs in with (the child's prepared login).
alter table public.profiles add column login_email text;
