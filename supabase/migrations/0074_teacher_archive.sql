-- 0074_teacher_archive — Archive (teachers + applications) + application permanent-delete support.
--
-- Adds the VISIBILITY dimension, independent of the existing ACCESS dimension:
--   • ACCESS      = active ⇔ profiles.roles has 'instructor' AND not banned (existing; Deactivate/Reactivate).
--   • VISIBILITY  = roster ⇔ teacher_profiles.archived_at IS NULL (NEW; Archive/Restore).
-- INVARIANT: archived ⟹ deactivated (archiveTeacher forces access revocation). Deactivated does NOT
-- imply archived. Restore returns a teacher to the roster still DEACTIVATED (admin must Reactivate).
--
-- Applications gain an 'archived' status. Pending shows status='applied' only; rejected + archived
-- live together in an "Archived applications" view. Permanent hard-delete of an application is a
-- RUNTIME action (service-role), guarded to never-approved / no-live-account rows — not a migration.
--
-- Purely additive: a new nullable column + a widened CHECK + an index. No drops, no backfill.
-- Widening a CHECK never rejects existing rows. Ships lock-step with the code (same commit).

-- ── (a) applications: allow the 'archived' status ────────────────────────────────────────
alter table public.teacher_applications
  drop constraint teacher_applications_status_check,
  add  constraint teacher_applications_status_check
       check (status in ('applied', 'approved', 'rejected', 'archived'));

-- ── (b) teachers: the VISIBILITY dimension (nullable timestamp; NULL = in roster) ─────────
-- Separate from teacher_profiles.status (the access/metadata flag). archived_at is admin-written
-- only — the teacher owner path (set_my_teacher_bio, 0073) touches bio only, so no RLS change is
-- needed (the 0037 admin `for all` policy already permits admin UPDATE of this column).
alter table public.teacher_profiles
  add column archived_at timestamptz;
create index teacher_profiles_archived_idx on public.teacher_profiles(tenant_id, archived_at);
