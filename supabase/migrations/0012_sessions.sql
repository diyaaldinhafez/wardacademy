-- 0012_sessions
--
-- Live 1:1 sessions + the report after each session (the landing's promise).
-- Times are UTC (timestamptz). Overlap is prevented in the database itself via
-- exclusion constraints: an instructor (and a learner) cannot have two active
-- sessions whose time ranges overlap. The session report is gated like items —
-- it reaches the guardian/learner only once the teacher approves it.

create extension if not exists btree_gist;

create type public.session_status as enum ('scheduled', 'completed', 'cancelled');

create table public.sessions (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null references public.tenants(id) on delete cascade,
  instructor_id    uuid        not null references public.profiles(id) on delete cascade,
  learner_id       uuid        not null references public.profiles(id) on delete cascade,
  scheduled_at     timestamptz not null,
  duration_minutes integer     not null default 30 check (duration_minutes between 5 and 240),
  -- ends_at is derived from scheduled_at + duration by a trigger; storing it as
  -- a plain column keeps the exclusion expression IMMUTABLE (timestamptz +
  -- interval is only STABLE, so it can't appear in an index expression).
  ends_at          timestamptz not null,
  status           public.session_status not null default 'scheduled',
  created_at       timestamptz not null default now(),
  constraint sessions_no_overlap_instructor exclude using gist (
    instructor_id with =,
    tstzrange(scheduled_at, ends_at) with &&
  ) where (status <> 'cancelled'),
  constraint sessions_no_overlap_learner exclude using gist (
    learner_id with =,
    tstzrange(scheduled_at, ends_at) with &&
  ) where (status <> 'cancelled')
);

create function public.sessions_set_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.scheduled_at + make_interval(mins => new.duration_minutes);
  return new;
end;
$$;

create trigger sessions_before_write
  before insert or update on public.sessions
  for each row execute function public.sessions_set_ends_at();

create index sessions_tenant_id_idx on public.sessions(tenant_id);
create index sessions_learner_id_idx on public.sessions(learner_id);
create index sessions_scheduled_at_idx on public.sessions(scheduled_at);

comment on table public.sessions is
  'Scheduled 1:1 session (UTC). Overlap prevented per instructor and per learner via exclusion constraints.';

create table public.session_reports (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.sessions(id) on delete cascade,
  tenant_id   uuid        not null references public.tenants(id) on delete cascade,
  learner_id  uuid        not null references public.profiles(id) on delete cascade,
  summary     text        not null,
  strengths   text,
  improve     text,
  status      public.item_status not null default 'draft', -- draft -> approved gate
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (session_id)
);

create index session_reports_tenant_id_idx on public.session_reports(tenant_id);
create index session_reports_learner_id_idx on public.session_reports(learner_id);

comment on table public.session_reports is
  'Post-session report. Reaches guardian/learner only when status = approved (teacher gate).';

alter table public.sessions enable row level security;
alter table public.session_reports enable row level security;

-- Sessions: instructor manages tenant; learner sees own; guardian sees children.
create policy sessions_modify_instructor on public.sessions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy sessions_select_learner on public.sessions
  for select to authenticated
  using (learner_id = (select auth.uid()));

create policy sessions_select_guardian on public.sessions
  for select to authenticated
  using (public.is_guardian_of(learner_id));

-- Reports: instructor manages tenant; learner/guardian see only APPROVED ones.
create policy session_reports_modify_instructor on public.session_reports
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy session_reports_select_learner on public.session_reports
  for select to authenticated
  using (learner_id = (select auth.uid()) and status = 'approved');

create policy session_reports_select_guardian on public.session_reports
  for select to authenticated
  using (public.is_guardian_of(learner_id) and status = 'approved');

grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.sessions to service_role;
grant select, insert, update, delete on public.session_reports to authenticated;
grant select, insert, update, delete on public.session_reports to service_role;
