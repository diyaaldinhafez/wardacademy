-- 0036_sessions_admin_read
--
-- Let the admin read sessions in its tenant (attendance/engagement monitoring in
-- the learning phase). Read-only; teaching stays with the instructor.

create policy sessions_admin_read on public.sessions
  for select to authenticated
  using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
