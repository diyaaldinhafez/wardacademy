-- 0040_assignment_session
-- Attach homework to the session it belongs to (so each session bundles its own
-- homework). Nullable: an assignment may exist without a session.

alter table public.assignments add column if not exists session_id uuid references public.sessions(id) on delete set null;
create index if not exists assignments_session_id_idx on public.assignments(session_id);
