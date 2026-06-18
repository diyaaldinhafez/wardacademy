-- 0027_learning_goal_values
--
-- Expand the allowed learning-goal values from two to five.

alter table public.leads drop constraint if exists leads_learning_goal_check;
alter table public.leads
  add constraint leads_learning_goal_check
  check (learning_goal in ('general', 'curriculum', 'conversation', 'foundation', 'exam'));
