-- 0030_intro_reports
--
-- The AI-assisted intro-session report sent to the guardian after the free
-- session. The operator fills structured inputs; the AI drafts a warm report;
-- the operator reviews/edits and sends it. One report per lead.

create table public.intro_reports (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  lead_id      uuid        not null references public.leads(id) on delete cascade,
  engagement   text,
  strengths    jsonb,      -- string[] of codes
  focus        jsonb,      -- string[] of codes
  level        text,
  decision     text        check (decision in ('enroll', 'considering', 'declined')),
  teacher_note text,
  ai_report    text,       -- the generated (editable) report shown to the guardian
  status       text        not null default 'draft' check (status in ('draft', 'sent')),
  sent_at      timestamptz,
  created_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (lead_id)
);
create index intro_reports_tenant_idx on public.intro_reports(tenant_id);

alter table public.intro_reports enable row level security;

create policy intro_reports_admin on public.intro_reports
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.intro_reports to authenticated;
grant select, insert, update, delete on public.intro_reports to service_role;
