-- 0032_admin_controls
--
-- Operations control: archive (soft-hide) a lead, an internal ops note, and a
-- per-lead activity log (who did what, when).

alter table public.leads
  add column if not exists archived  boolean not null default false,
  add column if not exists ops_note  text;

create index if not exists leads_archived_idx on public.leads(tenant_id, archived);

create table public.lead_events (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants(id) on delete cascade,
  lead_id    uuid        not null references public.leads(id) on delete cascade,
  actor_id   uuid        references public.profiles(id) on delete set null,
  actor_name text,
  kind       text        not null,
  at         timestamptz not null default now()
);
create index lead_events_lead_idx on public.lead_events(lead_id, at desc);

alter table public.lead_events enable row level security;

create policy lead_events_admin on public.lead_events
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.lead_events to authenticated;
grant select, insert, update, delete on public.lead_events to service_role;
