-- 0021_learner_assignment
--
-- A learner is assigned to a specific teacher at provisioning time, so the
-- student appears in that teacher's workspace (and the model is ready for
-- multiple teachers). Tenant-scoped RLS already governs visibility.

alter table public.profiles
  add column if not exists assigned_instructor_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_assigned_instructor_idx on public.profiles(assigned_instructor_id);
