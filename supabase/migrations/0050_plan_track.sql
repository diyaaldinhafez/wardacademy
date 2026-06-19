-- 0050_plan_track
-- Dual track for the study plan: Ward's own CEFR plan, OR reinforcement that
-- follows the child's real government-school curriculum. The scope/milestone
-- labels feed the Bloom Map's ScopeChip and milestone banner.

alter table public.study_plans add column if not exists track text not null default 'cefr' check (track in ('cefr', 'school'));
alter table public.study_plans add column if not exists scope_label text;
alter table public.study_plans add column if not exists milestone_label text;
