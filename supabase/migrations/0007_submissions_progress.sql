-- 0007_submissions_progress
--
-- Submission = a learner's answer to an approved item. Progress = an honest,
-- per-(learner, objective) tally that updates SYNCHRONOUSLY inside the same
-- transaction as the submission (PRD §5 — no queues, no event distillation).
--
-- We keep honest counts (attempts / correct / completions), not a fabricated
-- percentage; the "bud -> bloom" stage is derived from these in the UI. Per §5,
-- completion/participation marks (e.g. audio recordings) are kept SEPARATE from
-- performance and never enter the mastery measure.

create table public.submissions (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  item_id      uuid        not null references public.items(id) on delete cascade,
  objective_id uuid        not null references public.objectives(id) on delete cascade,
  learner_id   uuid        not null references public.profiles(id) on delete cascade,
  response     jsonb       not null default '{}'::jsonb,
  counts_toward_mastery boolean not null default true, -- false for completion-only (audio)
  is_correct   boolean,                                -- null until graded
  graded       boolean     not null default false,
  graded_by    uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  graded_at    timestamptz
);

create index submissions_tenant_id_idx  on public.submissions(tenant_id);
create index submissions_learner_id_idx  on public.submissions(learner_id);
create index submissions_item_id_idx     on public.submissions(item_id);

comment on table public.submissions is
  'A learner answer to an approved item. tenant/objective/kind are derived from the item by trigger.';

create table public.progress_records (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  learner_id   uuid        not null references public.profiles(id) on delete cascade,
  objective_id uuid        not null references public.objectives(id) on delete cascade,
  attempts     integer     not null default 0,  -- graded performance attempts
  correct      integer     not null default 0,
  completions  integer     not null default 0,  -- completion-only submissions (e.g. audio)
  last_activity_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (learner_id, objective_id)
);

create index progress_records_tenant_id_idx on public.progress_records(tenant_id);
create index progress_records_learner_id_idx on public.progress_records(learner_id);

comment on table public.progress_records is
  'Honest per-(learner, objective) tally; updated synchronously by trigger. bloom stage derived in UI.';

-- ---- Derive authoritative fields from the item (client only sends item/learner/response) ----
create function public.submissions_fill_from_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select i.tenant_id, i.objective_id, (i.format <> 'audio')
    into new.tenant_id, new.objective_id, new.counts_toward_mastery
  from public.items i
  where i.id = new.item_id;

  if new.tenant_id is null then
    raise exception 'item % not found', new.item_id;
  end if;
  return new;
end;
$$;

create trigger submissions_before_insert
  before insert on public.submissions
  for each row execute function public.submissions_fill_from_item();

-- ---- Synchronous progress update (runs in the submission's transaction) ----
create function public.submissions_update_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d_attempts    integer := 0;
  d_correct     integer := 0;
  d_completions integer := 0;
begin
  if TG_OP = 'INSERT' then
    if not new.counts_toward_mastery then
      d_completions := 1;
    elsif new.graded then
      d_attempts := 1;
      d_correct  := case when new.is_correct then 1 else 0 end;
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.counts_toward_mastery and new.graded and not old.graded then
      d_attempts := 1;
      d_correct  := case when new.is_correct then 1 else 0 end;
    end if;
  end if;

  if d_attempts = 0 and d_correct = 0 and d_completions = 0 then
    return new;
  end if;

  insert into public.progress_records
    (tenant_id, learner_id, objective_id, attempts, correct, completions, last_activity_at, updated_at)
  values
    (new.tenant_id, new.learner_id, new.objective_id, d_attempts, d_correct, d_completions, now(), now())
  on conflict (learner_id, objective_id) do update
    set attempts    = progress_records.attempts + excluded.attempts,
        correct     = progress_records.correct + excluded.correct,
        completions = progress_records.completions + excluded.completions,
        last_activity_at = now(),
        updated_at  = now();
  return new;
end;
$$;

create trigger submissions_after_write
  after insert or update on public.submissions
  for each row execute function public.submissions_update_progress();

-- ---- RLS ----
alter table public.submissions enable row level security;
alter table public.progress_records enable row level security;

-- Read: learner own, instructor tenant, guardian's children.
create policy submissions_select on public.submissions
  for select to authenticated
  using (
    learner_id = (select auth.uid())
    or ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    or public.is_guardian_of(learner_id)
  );

-- A learner submits their own answer, only to an approved item they can see
-- (the items RLS inside this subquery enforces approved + same tenant).
create policy submissions_insert_learner on public.submissions
  for insert to authenticated
  with check (
    learner_id = (select auth.uid())
    and exists (select 1 from public.items i where i.id = item_id)
  );

-- Grading is an instructor action within the tenant.
create policy submissions_update_instructor on public.submissions
  for update to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update on public.submissions to authenticated;
grant select, insert, update, delete on public.submissions to service_role;

-- Progress is read-only to clients; written only by the trigger + service role.
create policy progress_select on public.progress_records
  for select to authenticated
  using (
    learner_id = (select auth.uid())
    or ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
    or public.is_guardian_of(learner_id)
  );

grant select on public.progress_records to authenticated;
grant select, insert, update, delete on public.progress_records to service_role;
