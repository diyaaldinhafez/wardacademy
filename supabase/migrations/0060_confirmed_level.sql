-- 0060_confirmed_level
--
-- The human-confirmed CEFR entry level — separate from suggested_level (the
-- machine result, kept as an audit trace, never overwritten). The admin confirms
-- or overrides the suggested level at the completed-test step; readers prefer
-- confirmed_level ?? suggested_level. Lives on BOTH lead_tests (where the operator
-- confirms, pre-provisioning) and placement_tests (the student-side copy that the
-- plan aggregator will read), carried across by provisionAccounts. Nullable &
-- non-breaking: existing rows stay null and fall back to suggested_level.

alter table public.lead_tests
  add column if not exists confirmed_level text
  check (confirmed_level is null or confirmed_level in ('A1', 'A2', 'B1'));

alter table public.placement_tests
  add column if not exists confirmed_level text
  check (confirmed_level is null or confirmed_level in ('A1', 'A2', 'B1'));
