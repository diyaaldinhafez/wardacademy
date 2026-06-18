-- 0023_lead_details
--
-- Richer enrolment form: guardian residence/nationality, and a fuller student
-- profile (date of birth, school type, goal, prior study, and per-skill
-- self-assessment). Existing columns are reused: student_grade = stage code,
-- student_level = overall self-assessed level code.

alter table public.leads
  add column if not exists guardian_country     text,
  add column if not exists guardian_nationality text,
  add column if not exists student_dob          date,
  add column if not exists school_type          text
    check (school_type in ('public', 'private', 'homeschool')),
  add column if not exists learning_goal        text
    check (learning_goal in ('general', 'curriculum')),
  add column if not exists prior_study          text,
  add column if not exists skill_levels         jsonb;  -- { listening, speaking, reading, writing, vocabulary }
