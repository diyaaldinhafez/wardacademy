-- 0070_item_bank_kind — AE-7 · the pre-built objective-tagged bank lives in `items`.
--
-- Live AI generation of homework/unit-test items is retired in favour of selecting from a
-- PRE-BUILT bank. The bank is the EXISTING `items` table (Decision 0 = extend, no new table):
-- an approved, objective-tagged item with target_learner_id NULL is a shared bank question;
-- homework = assign it (assignments), a unit test = snapshot chosen bank items into
-- assessment_questions. Everything the bank needs already exists (objective_id 0061,
-- grading/level/answer_key AE-1 0066, item_keys 0008, the approved/shared split 0069).
--
-- This migration adds the ONE missing thing: a homework-vs-test TYPE tag so the two teacher
-- panels filter the right subset. Additive + inert: nullable (existing/demo rows stay NULL and
-- are usable as either); no backfill; no trigger; no RLS change (0069 items policies cover it);
-- the frozen grade→evidence→bloom pipeline is untouched.

alter table public.items
  add column if not exists kind text
  check (kind is null or kind in ('homework', 'test'));

comment on column public.items.kind is
  'AE-7 bank typing: homework | test | null (either). Filters the teacher''s bank pickers; not read by grading.';
