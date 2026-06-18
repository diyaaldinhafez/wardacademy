-- 0019_admin_access
--
-- Separation of duties: the enrolment funnel (leads, intro-session slots,
-- placement tests) moves from the teaching role to a dedicated operations
-- role. The `admin` role now owns these tables; instructors no longer touch
-- pre-enrolment work. Account provisioning still runs via the service role,
-- which bypasses RLS (and is additionally guarded in-code by assertAdmin()).

-- leads
drop policy if exists leads_instructor on public.leads;
create policy leads_admin on public.leads
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- availability_slots
drop policy if exists slots_instructor on public.availability_slots;
create policy slots_admin on public.availability_slots
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- lead_tests
drop policy if exists lead_tests_instructor on public.lead_tests;
create policy lead_tests_admin on public.lead_tests
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- lead_test_questions
drop policy if exists lead_test_q_instructor on public.lead_test_questions;
create policy lead_test_q_admin on public.lead_test_questions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
