-- 0055_ward_curriculum_catalog
-- "منهاج وَرد" shared curriculum catalog (A1→B1 · 30 units · 215 objectives).
-- A frozen, platform-wide reference (NOT per-student, NOT tenant-scoped): the
-- student is pulled from the plan layer; objectives are never copied per student.
-- Named curriculum_* to avoid colliding with the live per-student `objectives`
-- table (retired in a later migration phase). Source: Ward_Curriculum_Master_Reference.md.

create table if not exists public.curriculum_units (
  unit_id         text primary key,                 -- e.g. "A1-U01"
  level           text    not null,                 -- A1 | A2 | B1
  unit_number     integer not null,
  title_ar        text    not null,
  topic           text,
  language_focus  text,
  vocab_key       text,
  vocab_thematic  text,
  l1_interference text,
  lessons_estimate text,
  content_note    text
);

create table if not exists public.curriculum_objectives (
  objective_id text primary key,                    -- e.g. "A1-U01-L1"
  unit_id      text    not null references public.curriculum_units(unit_id) on delete cascade,
  level        text    not null,
  unit_number  integer not null,
  skill_code   text    not null check (skill_code in ('L','S','R','W')),
  seq          integer not null,
  skill        text    not null check (skill in ('listening','speaking','reading','writing')),
  descriptor_ar text   not null,
  cefr_level   text    not null,                     -- may stretch above unit level (A1..B1+); ceiling B1+
  gse          integer,
  evidence     text    not null check (evidence in ('auto','teacher','mixed'))
);
create index if not exists curriculum_objectives_unit_idx on public.curriculum_objectives(unit_id);

alter table public.curriculum_units enable row level security;
alter table public.curriculum_objectives enable row level security;

-- Shared platform catalog: readable by any signed-in user; written only by service-role.
create policy curriculum_units_read on public.curriculum_units for select to authenticated using (true);
create policy curriculum_objectives_read on public.curriculum_objectives for select to authenticated using (true);

grant select on public.curriculum_units to authenticated;
grant select on public.curriculum_objectives to authenticated;
grant select, insert, update, delete on public.curriculum_units to service_role;
grant select, insert, update, delete on public.curriculum_objectives to service_role;
