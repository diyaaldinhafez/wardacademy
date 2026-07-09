-- 0073_teacher_lifecycle_coherence — Teacher-lifecycle coherence redesign.
--
-- Realizes the approved redesign (application ↔ teacher_profiles):
--   1) DURABLE LINK  application → instructor, mirroring leads.converted_learner_id (0048).
--      teacher_applications.instructor_id is stamped at approval (provisionTeacher) and is the
--      join that RETIRES email-matching. One-time backfill links already-approved applications.
--   2) IMMUTABLE ARCHIVE  the fit-screen fields stay ONLY on teacher_applications (never copied
--      to teacher_profiles); admin views them read-only via the link. Nothing here changes them.
--   3) DELETE DEAD DATA  specialties + languages had zero downstream consumers (no parent/student
--      display, no matching logic) → DROP from BOTH tables. Irreversible; accepted.
--   4) TEACHER SELF-EDIT  a teacher owns exactly ONE field on her own profile: bio. Realized as an
--      owner-scoped SELECT policy + a SECURITY DEFINER function scoped to (own row) × (bio column).
--      NO direct instructor write policy exists → a teacher cannot write phone/status/notes/
--      start_date, cannot touch another teacher's row, and cannot bypass the RPC to write bio.
--
-- Ownership after this migration:
--   • application  (immutable archive, no editor)         — fit-screen fields + as-applied bio/phone
--   • teacher-owned (teacher edits in /studio)            — bio
--   • admin-owned  (admin edits in /admin)                — status(button only), phone, notes, start_date

-- ── (1) durable link (additive) ────────────────────────────────────────────────────────
alter table public.teacher_applications
  add column instructor_id uuid references public.profiles(id) on delete set null;
create index teacher_applications_instructor_idx on public.teacher_applications(instructor_id);

-- ── (1b) one-time backfill: link already-APPROVED applications to their instructor by email ─
-- Retires email as the *live* join by materializing it once into the durable link. Only matches
-- approved applications to real instructor profiles. Manually-created teachers (e.g. Ghinwa) have
-- no application row → stay unlinked → the admin panel shows "No application on file" (intended).
-- profiles.roles is a user_role[] enum array (NOT jsonb) — membership is `= any(...)`, not `?`.
update public.teacher_applications a
   set instructor_id = p.id
  from public.profiles p
 where a.status = 'approved'
   and a.instructor_id is null
   and lower(a.email) = lower(p.login_email)
   and 'instructor' = any(p.roles);

-- ── (3) DROP dead columns from BOTH tables (irreversible — zero consumers, no matching) ───
alter table public.teacher_profiles    drop column specialties;
alter table public.teacher_profiles    drop column languages;
alter table public.teacher_applications drop column specialties;
alter table public.teacher_applications drop column languages;

-- ── (4) TEACHER SELF-EDIT — owner-scoped SELECT + bio-only definer write ──────────────────
-- READ: an instructor may SELECT only HER OWN teacher_profiles row (to display current bio).
--   Scoped by instructor_id = auth.uid(); she cannot read another teacher's row. The existing
--   teacher_profiles_admin policy (0037) is untouched → admin keeps full read/write.
create policy teacher_profiles_owner_select_instructor on public.teacher_profiles
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor'
         and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
         and instructor_id = (select auth.uid()));

-- WRITE: the ONLY instructor mutation path for teacher_profiles. Bio only, own row only.
--   SECURITY DEFINER (mirrors is_my_learner / owns_session in 0069) so it bypasses RLS, but is
--   hard-scoped: it updates ONLY the bio column, ONLY WHERE instructor_id = auth.uid(). Because
--   there is NO instructor UPDATE/INSERT/DELETE policy on the table, a teacher's *direct* write is
--   denied by RLS — this RPC is her sole write, and it cannot reach any admin-owned column or any
--   other teacher's row. The roles guard makes a non-instructor caller a no-op (defense in depth).
create function public.set_my_teacher_bio(p_bio text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.teacher_profiles
     set bio = p_bio
   where instructor_id = (select auth.uid())
     and (auth.jwt() -> 'roles') ? 'instructor';
$$;
revoke execute on function public.set_my_teacher_bio(text) from public, anon;
grant  execute on function public.set_my_teacher_bio(text) to authenticated;
