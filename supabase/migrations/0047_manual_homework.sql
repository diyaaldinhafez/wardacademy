-- 0047_manual_homework
-- The manual homework path (Note 4): the teacher posts a homework from the
-- student's paper textbook (an image + optional worksheets); the student uploads
-- a photo of their handwritten solution; the teacher grades it manually. Kept
-- separate from AI items/submissions (which are objective-tagged & mastery-fed).

create table public.manual_homework (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  learner_id    uuid        not null references public.profiles(id) on delete cascade,
  instructor_id uuid        not null references public.profiles(id) on delete cascade,
  session_id    uuid        references public.sessions(id) on delete set null,
  title         text        not null,
  instructions  text,
  status        text        not null default 'assigned' check (status in ('assigned', 'submitted', 'graded')),
  score         int,
  max_score     int,
  feedback      text,
  created_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  graded_at     timestamptz
);

create index manual_homework_learner_id_idx on public.manual_homework(learner_id);
create index manual_homework_session_id_idx on public.manual_homework(session_id);
create index manual_homework_tenant_id_idx on public.manual_homework(tenant_id);

create table public.homework_files (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null references public.tenants(id) on delete cascade,
  manual_homework_id uuid        not null references public.manual_homework(id) on delete cascade,
  kind               text        not null check (kind in ('prompt', 'worksheet', 'submission')),
  file_path          text        not null,
  file_name          text,
  mime_type          text,
  size_bytes         bigint,
  uploaded_by        uuid        references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

create index homework_files_homework_id_idx on public.homework_files(manual_homework_id);

alter table public.manual_homework enable row level security;
alter table public.homework_files enable row level security;

-- manual_homework: instructor manages tenant; admin reads; learner/guardian read own.
create policy manual_homework_instructor on public.manual_homework
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy manual_homework_admin_read on public.manual_homework
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy manual_homework_select_learner on public.manual_homework
  for select to authenticated using (learner_id = (select auth.uid()));
create policy manual_homework_select_guardian on public.manual_homework
  for select to authenticated using (public.is_guardian_of(learner_id));

-- homework_files: instructor manages tenant; admin/learner/guardian read those of homework they may see.
create policy homework_files_instructor on public.homework_files
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy homework_files_select_related on public.homework_files
  for select to authenticated
  using (exists (
    select 1 from public.manual_homework h
    where h.id = homework_files.manual_homework_id
      and (h.learner_id = (select auth.uid()) or public.is_guardian_of(h.learner_id)
           or ((auth.jwt() -> 'roles') ? 'admin' and h.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid))
  ));

grant select, insert, update, delete on public.manual_homework to authenticated;
grant select, insert, update, delete on public.manual_homework to service_role;
grant select, insert, update, delete on public.homework_files to authenticated;
grant select, insert, update, delete on public.homework_files to service_role;
