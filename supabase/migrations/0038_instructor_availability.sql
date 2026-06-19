-- 0038_instructor_availability
--
-- Ownership shift: the teacher manages her OWN availability (rules, exceptions,
-- slots) from her account; the admin only views it (admin keeps its existing
-- read access via the admin policies). Multi-teacher-safe: instructor rows are
-- scoped to instructor_id = self.

create policy availability_rules_instructor on public.availability_rules
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and instructor_id = (select auth.uid()) and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and instructor_id = (select auth.uid()) and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy availability_slots_instructor on public.availability_slots
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and instructor_id = (select auth.uid()) and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and instructor_id = (select auth.uid()) and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy availability_exceptions_instructor on public.availability_exceptions
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Any signed-in tenant member can read their tenant's basic settings (timezone,
-- break) — needed by the teacher's slot generation.
create policy tenants_member_read on public.tenants
  for select to authenticated
  using (id = (auth.jwt() ->> 'tenant_id')::uuid);
