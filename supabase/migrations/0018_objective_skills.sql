-- 0018_objective_skills
--
-- The five petals = five skills (Design System §9b). For the flower to be HONEST
-- (each petal fills from the % of mastered objectives in that skill), objectives
-- must carry a skill tag. Fixed legal order: listening, speaking, reading,
-- writing, vocabulary. Nullable: objectives without a skill simply don't feed a
-- petal yet. (Speaking petal reflects teacher assessment; voice = completion,
-- counted separately — enforced in app logic, not here.)

create type public.skill as enum ('listening', 'speaking', 'reading', 'writing', 'vocabulary');

alter table public.objectives add column skill public.skill;

create index objectives_skill_idx on public.objectives(tenant_id, skill);
