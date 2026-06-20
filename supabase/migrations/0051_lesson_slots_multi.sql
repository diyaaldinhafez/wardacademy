-- 0051_lesson_slots_multi
-- A student can have MORE THAN ONE fixed weekly lesson slot (e.g. Mon + Thu).
-- Each slot must fall inside the teacher's declared availability (enforced in the
-- action). Replace the one-per-learner unique with one-per (learner, weekday, time).

alter table public.lesson_schedules drop constraint if exists lesson_schedules_learner_id_key;
alter table public.lesson_schedules add constraint lesson_schedules_learner_slot_key unique (learner_id, weekday, time_of_day);
