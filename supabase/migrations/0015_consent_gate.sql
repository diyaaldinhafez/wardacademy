-- 0015_consent_gate
--
-- Enforce consent (PRD: consent is a condition for a minor's participation).
-- A learner can only see/practice assigned items if at least one of their
-- guardianships has consent_granted = true. The check is a SECURITY DEFINER
-- helper so the learner's own (RLS-restricted) view of guardianships doesn't
-- block it.

create function public.current_learner_consented()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.guardianships
    where learner_id = (select auth.uid()) and consent_granted
  );
$$;

revoke execute on function public.current_learner_consented() from public, anon;
grant execute on function public.current_learner_consented() to authenticated;

-- Add the consent requirement to the learner's item visibility.
drop policy items_select_approved_assigned on public.items;

create policy items_select_approved_assigned on public.items
  for select to authenticated
  using (
    status = 'approved'
    and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and public.current_learner_consented()
    and exists (
      select 1 from public.assignments a
      where a.item_id = items.id and a.learner_id = (select auth.uid())
    )
  );
