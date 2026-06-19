-- 0045_objective_unit
-- Group objectives into units (a study plan is a sequence of units → lessons).
-- Each plan lesson becomes a measurable objective carrying its skill + unit, so
-- it can both generate homework and feed the right skill petal.

alter table public.objectives add column if not exists unit text;
