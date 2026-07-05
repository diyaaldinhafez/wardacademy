-- 0069_teacher_owner_rls
--
-- Owner-scope the INSTRUCTOR RLS policies so a teacher can only read/modify work
-- tied to HER OWN students — not every row in the tenant. Until now the instructor
-- policies on sessions / session_reports / manual_homework / assessments / items were
-- tenant+role scoped only ((roles ? 'instructor') AND tenant_id = jwt.tenant_id), which
-- let any instructor in a tenant touch every other instructor's rows. Ward/Yusr launch
-- multi-teacher, so ownership must be enforced at the DB, not just in the queries.
--
-- Ownership rule: a learner is a teacher's iff profiles.assigned_instructor_id = auth.uid().
--   • sessions / manual_homework carry a NOT-NULL instructor_id  → scope by that column.
--   • session_reports has no instructor_id                        → scope via its session (owns_session).
--   • assessments has only learner_id (+ created_by)              → scope via is_my_learner(learner_id).
--   • items are shared CONTENT (no learner_id)                    → SPLIT: approved items stay
--     tenant-readable by all instructors (shared bank, AE-7-aligned); the draft/write lifecycle
--     is owner-scoped by created_by (a teacher manages only items she authored).
--
-- Connect-before-cut: each new owner-scoped policy is CREATEd BEFORE the old tenant-wide
-- one is DROPped, in this same migration. Only *_instructor policies are touched — the
-- learner/guardian/admin policies (incl. sessions_admin_read, *_admin_read,
-- items_select_approved_assigned) are left exactly as-is, so /admin (role admin),
-- service-role paths, /learn and /guardian are unaffected.

-- ── SECURITY DEFINER helpers (mirror public.is_guardian_of from 0006) ──────────────────
-- SECURITY DEFINER so the subquery bypasses the target table's own RLS (no recursion),
-- exactly like is_guardian_of.

create function public.is_my_learner(p_learner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_learner and assigned_instructor_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_my_learner(uuid) from public, anon;
grant execute on function public.is_my_learner(uuid) to authenticated;

create function public.owns_session(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions
    where id = p_session and instructor_id = (select auth.uid())
  );
$$;
revoke execute on function public.owns_session(uuid) from public, anon;
grant execute on function public.owns_session(uuid) to authenticated;

-- ── sessions ───────────────────────────────────────────────────────────────────────────
create policy sessions_owner_instructor on public.sessions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and instructor_id = (select auth.uid()))
  with check ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and instructor_id = (select auth.uid()));
drop policy sessions_modify_instructor on public.sessions;

-- ── session_reports ──────────────────────────────────────────────────────────────────────
create policy session_reports_owner_instructor on public.session_reports
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and public.owns_session(session_id))
  with check ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and public.owns_session(session_id));
drop policy session_reports_modify_instructor on public.session_reports;

-- ── manual_homework ──────────────────────────────────────────────────────────────────────
create policy manual_homework_owner_instructor on public.manual_homework
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and instructor_id = (select auth.uid()))
  with check ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and instructor_id = (select auth.uid()));
drop policy manual_homework_instructor on public.manual_homework;

-- ── assessments ──────────────────────────────────────────────────────────────────────────
create policy assessments_owner_instructor on public.assessments
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and public.is_my_learner(learner_id))
  with check ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and public.is_my_learner(learner_id));
drop policy assessments_instructor on public.assessments;

-- ── items (SHARED-bank SPLIT) ────────────────────────────────────────────────────────────
-- (a) instructors keep tenant-wide READ of APPROVED items (the shared question bank).
create policy items_select_approved_instructor on public.items
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and status = 'approved');
-- (b) the draft/write lifecycle is owner-scoped by author (created_by). A teacher can read
--     and manage only the items SHE authored (drafts included); she cannot see/edit/approve
--     another teacher's drafts. Approved items authored by anyone remain readable via (a).
create policy items_write_instructor on public.items
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and created_by = (select auth.uid()))
  with check ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and created_by = (select auth.uid()));
drop policy items_modify_instructor on public.items;
