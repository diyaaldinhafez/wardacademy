-- 0029_tenant_break
--
-- Make the break between sessions configurable per tenant (default 15 min).

alter table public.tenants
  add column if not exists slot_break_minutes integer not null default 15
    check (slot_break_minutes between 0 and 120);
