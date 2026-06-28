-- 0066_ae1_item_evidence_schema — Assessment Evidence-Model Redesign · gate AE-1 (SCHEMA ONLY).
--
-- Additive + INERT. Tags items/questions per-objective + grading/media/method/level/
-- answer_key/rubric_ref, and adds the new objective_evidence log. NOTHING reads or writes
-- these yet (no service code, no bloom.ts, no UI). The retiring model stays fully LIVE this
-- gate: trigger 0056 + objective_assessments + objective_progress are UNTOUCHED (retired
-- later in AE-3 / AE-8). NO backfill — existing rows keep their NULLs (they belong to the
-- model hard-deleted in AE-8; not worth migrating). connect-before-cut: we only ADD here.

-- ── items (homework): objective_id already exists (0061); add the rest, all NULLABLE ──
alter table public.items add column if not exists grading    text;
alter table public.items add column if not exists media      text;
alter table public.items add column if not exists method     text;
alter table public.items add column if not exists level      text;
alter table public.items add column if not exists answer_key jsonb;
alter table public.items add column if not exists rubric_ref text;

-- ── assessment_questions (unit tests): add objective_id (replaces skill-only) + the rest ──
alter table public.assessment_questions add column if not exists objective_id text
  references public.curriculum_objectives(objective_id) on delete set null;
alter table public.assessment_questions add column if not exists grading    text;
alter table public.assessment_questions add column if not exists media      text;
alter table public.assessment_questions add column if not exists method     text;
alter table public.assessment_questions add column if not exists level      text;
alter table public.assessment_questions add column if not exists answer_key jsonb;
alter table public.assessment_questions add column if not exists rubric_ref text;

-- BINARY grading (no 'hybrid') · media (no 'video') · level A1/A2/B1. Existing rows are NULL
-- (the `… is null or …` form lets them pass); enforced for new/updated rows. `method` stays
-- free text (the Curriculum Reference §11 measurement method).
alter table public.items add constraint items_grading_chk check (grading is null or grading in ('auto','manual'));
alter table public.items add constraint items_media_chk   check (media   is null or media   in ('text','image','audio'));
alter table public.items add constraint items_level_chk   check (level   is null or level   in ('A1','A2','B1'));
alter table public.assessment_questions add constraint aq_grading_chk check (grading is null or grading in ('auto','manual'));
alter table public.assessment_questions add constraint aq_media_chk   check (media   is null or media   in ('text','image','audio'));
alter table public.assessment_questions add constraint aq_level_chk   check (level   is null or level   in ('A1','A2','B1'));

-- ── NEW evidence log — SEPARATE from objective_assessments (which stays live until AE-8) ──
-- Inert this gate: no trigger, no aggregation, no reader/writer. `item_id` is a plain
-- provenance pointer (NOT a hard FK): evidence may come from items (homework) OR
-- assessment_questions (unit test), so a single FK can't span both tables — `source`
-- disambiguates which table item_id refers to.
create table if not exists public.objective_evidence (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  learner_id   uuid        not null references public.profiles(id) on delete cascade,
  objective_id text        not null references public.curriculum_objectives(objective_id) on delete cascade,
  value        numeric     not null check (value >= 0 and value <= 10),
  source       text        not null check (source in ('auto_homework','auto_test','manual_homework','manual_test')),
  item_id      uuid,       -- provenance: items.id OR assessment_questions.id (see `source`)
  created_at   timestamptz not null default now()
);
create index if not exists objective_evidence_learner_obj_idx
  on public.objective_evidence(learner_id, objective_id, created_at desc);

-- RLS — mirrors objective_assessments (learner sees own · guardian sees children ·
-- instructor manages tenant · admin reads). No client/app writer is wired this gate.
alter table public.objective_evidence enable row level security;

create policy objective_evidence_instructor on public.objective_evidence
  for all to authenticated
  using ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check ((auth.jwt() -> 'roles') ? 'instructor' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy objective_evidence_select_learner on public.objective_evidence
  for select to authenticated using (learner_id = (select auth.uid()));
create policy objective_evidence_select_guardian on public.objective_evidence
  for select to authenticated using (public.is_guardian_of(learner_id));
create policy objective_evidence_admin_read on public.objective_evidence
  for select to authenticated using ((auth.jwt() -> 'roles') ? 'admin' and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

grant select, insert, update, delete on public.objective_evidence to authenticated;
grant select, insert, update, delete on public.objective_evidence to service_role;
