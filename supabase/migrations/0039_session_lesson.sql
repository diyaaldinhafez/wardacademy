-- 0039_session_lesson
-- Link a session to its lesson in the study plan (the session is the spine of
-- the student's journey: a time + a lesson + its homework + its report).

alter table public.sessions add column if not exists lesson_title text;
alter table public.sessions add column if not exists plan_item_index int;
