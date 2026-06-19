-- 0043_item_target_learner
-- Tie an AI-generated homework draft to the student it was created for, so the
-- whole homework lifecycle (generate → review → approve → assign) lives inside
-- that student's page. Nullable: approved items remain reusable for anyone.

alter table public.items add column if not exists target_learner_id uuid references public.profiles(id) on delete set null;
create index if not exists items_target_learner_id_idx on public.items(target_learner_id);
