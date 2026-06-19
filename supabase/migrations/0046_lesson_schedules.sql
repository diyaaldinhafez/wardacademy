-- 0046_lesson_schedules
-- A student's fixed recurring weekly lesson slot. The teacher sets it once, and
-- the system generates the upcoming sessions from it, each tied (in order) to
-- the next lesson in the approved study plan.

create table public.lesson_schedules (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null references public.tenants(id) on delete cascade,
  learner_id       uuid        not null references public.profiles(id) on delete cascade,
  instructor_id    uuid        not null references public.profiles(id) on delete cascade,
  weekday          int         not null check (weekday between 0 and 6), -- 0 = Sunday
  time_of_day      time        not null,
  duration_minutes int         not null default 30,
  active           boolean     not null default true,
  created_at       timestamptz not null default now(),
  unique (learner_id)
);

create index lesson_schedules_learner_id_idx on public.lesson_schedules(learner_id);
create index lesson_schedules_tenant_id_idx on public.lesson_schedules(tenant_id);

alter table public.lesson_schedules enable row level security;

create policy lesson_schedules_instructor on public.lesson_schedules
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy lesson_schedules_admin_read on public.lesson_schedules
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy lesson_schedules_select_learner on public.lesson_schedules
  for select to authenticated
  using (learner_id = (select auth.uid()));

create policy lesson_schedules_select_guardian on public.lesson_schedules
  for select to authenticated
  using (public.is_guardian_of(learner_id));

grant select, insert, update, delete on public.lesson_schedules to authenticated;
grant select, insert, update, delete on public.lesson_schedules to service_role;
