// Ward Academy progress aggregation — the ONE place unit/skill values are rolled
// up from the new model (curriculum_objectives + objective_progress). Every
// surface (learn · guardian · studio) consumes this, so they are consistent by
// construction. Source of truth for the rules: Ward_Curriculum_Master_Reference.md §5.
//
//   • Unit bloom  = simple mean of ALL the unit's objective values (an
//                   un-assessed objective counts as 0 / seed).            (§5)
//   • Skill petal = mean of that skill's objective values ACROSS STARTED
//                   units only (un-assessed-in-a-started-unit = 0; objectives
//                   in un-started units are excluded entirely). 0..1 = /10.  (§5, §249)
//   • "Started unit" = has ≥1 objective recorded in objective_progress.
//
// The design layer holds no logic: it receives value 0–10 and fraction 0..1.

import { SKILLS, type Skill, stageForValue, type BloomStage } from "@/lib/skills";
import { objectiveValue, skillInUnit, skillPetalAcrossUnits, unitOverall } from "./evidenceBloom";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ObjectiveBloom = {
  objective_id: string;
  skill: Skill;
  seq: number;
  descriptor_ar: string;
  descriptor_en: string | null; // audited English rendering; forced-en surfaces prefer it
  value: number; // 0–10 (0 when un-assessed)
  state: BloomStage;
  assessed: boolean;
};

export type UnitBloom = {
  unit_id: string;
  level: string;
  unit_number: number;
  title_ar: string;
  title_en: string | null; // audited English title; forced-en surfaces prefer it
  value: number; // 0–10, simple mean of ALL objectives (un-assessed = 0)
  stage: BloomStage;
  completed: boolean; // evidence model: the unit's unit-test has graded evidence (§3 "completed")
  objectives: ObjectiveBloom[];
  assessedCount: number;
  total: number;
};

export type SkillPetal = {
  skill: Skill;
  value: number; // 0–10
  fraction: number; // 0..1 (value/10) — drives FlowerProgress
  stage: BloomStage;
  assessed: number; // assessed objectives of this skill in started units
  total: number; // all objectives of this skill in started units
};

export type StudentBloom = {
  startedUnits: UnitBloom[]; // ordered by level then unit_number
  skills: SkillPetal[]; // always length 4, in SKILLS order
  startedUnitIds: string[];
  assessedObjectives: number;
};

type CatalogObjective = { objective_id: string; unit_id: string; skill: Skill; seq: number; descriptor_ar: string; descriptor_en: string | null };
type CatalogUnit = { unit_id: string; level: string; unit_number: number; title_ar: string; title_en: string | null };

const LEVEL_ORDER = ["A1", "A2", "B1"];

let _catalogCache: { catalog: CatalogObjective[]; units: CatalogUnit[] } | null = null;

/** Loads the frozen catalog once (it is platform-wide and immutable). */
async function loadCatalog(supabase: SupabaseClient) {
  if (_catalogCache) return _catalogCache;
  const [{ data: objs }, { data: units }] = await Promise.all([
    supabase.from("curriculum_objectives").select("objective_id, unit_id, skill, seq, descriptor_ar, descriptor_en"),
    supabase.from("curriculum_units").select("unit_id, level, unit_number, title_ar, title_en"),
  ]);
  _catalogCache = { catalog: (objs ?? []) as CatalogObjective[], units: (units ?? []) as CatalogUnit[] };
  return _catalogCache;
}


// ───────────────────────── Assessment Evidence-Model Redesign (read path) ─────────────────────────
// The StudentBloom shape, computed from objective_evidence via the AE-2 pure functions. This is
// now the ONLY model (the old objective_progress aggregation + trigger 0056 were retired in AE-3).
// Layers:
//   objective     = simple mean of its evidence (objectiveValue)
//   skill-in-unit = simple mean of that skill's objective values in the unit (skillInUnit; 0s incl)
//   big-rose petal= decaying 65/35 across COMPLETED units, ordered by completion (skillPetalAcrossUnits)
//   unit value    = mean of the 4 skill-in-unit petals (unitOverall)
// "Unit completed" = the unit has TEST-source evidence (auto_test|manual_test). In-progress units
// (homework evidence only) do NOT feed the big rose. Component shape is unchanged (value 0–10 / fraction).
type EvidenceRow = { objective_id: string; value: number; source: string; created_at: string };

export function computeEvidenceBloom(catalog: CatalogObjective[], units: CatalogUnit[], evidence: EvidenceRow[]): StudentBloom {
  const unitById = new Map(units.map((u) => [u.unit_id, u]));
  const objUnit = new Map(catalog.map((o) => [o.objective_id, o.unit_id]));
  const byUnit = new Map<string, CatalogObjective[]>();
  for (const o of catalog) { const arr = byUnit.get(o.unit_id) ?? []; arr.push(o); byUnit.set(o.unit_id, arr); }

  const evByObj = new Map<string, number[]>();
  const unitCompletedAt = new Map<string, string>(); // unit → latest TEST evidence timestamp ("completed")
  for (const e of evidence) {
    const arr = evByObj.get(e.objective_id) ?? []; arr.push(Number(e.value)); evByObj.set(e.objective_id, arr);
    if (e.source === "auto_test" || e.source === "manual_test") {
      const u = objUnit.get(e.objective_id);
      if (u) { const prev = unitCompletedAt.get(u); if (!prev || e.created_at > prev) unitCompletedAt.set(u, e.created_at); }
    }
  }
  const isAssessed = (oid: string) => evByObj.has(oid);
  const objVal = (oid: string) => (evByObj.has(oid) ? objectiveValue(evByObj.get(oid)!) : 0);
  const skillInUnitVal = (unitId: string, skill: Skill) =>
    skillInUnit((byUnit.get(unitId) ?? []).filter((o) => o.skill === skill).map((o) => objVal(o.objective_id)));

  const startedUnitIds = [...byUnit.entries()].filter(([, objs]) => objs.some((o) => isAssessed(o.objective_id))).map(([uid]) => uid);

  const startedUnits: UnitBloom[] = startedUnitIds
    .map((unit_id) => {
      const u = unitById.get(unit_id);
      const objs = [...(byUnit.get(unit_id) ?? [])].sort((a, b) => a.seq - b.seq);
      const objectives: ObjectiveBloom[] = objs.map((o) => {
        const value = objVal(o.objective_id);
        return { objective_id: o.objective_id, skill: o.skill, seq: o.seq, descriptor_ar: o.descriptor_ar, descriptor_en: o.descriptor_en ?? null, value, state: stageForValue(value), assessed: isAssessed(o.objective_id) };
      });
      const value = unitOverall(SKILLS.map((s) => skillInUnitVal(unit_id, s)));
      return { unit_id, level: u?.level ?? "", unit_number: u?.unit_number ?? 0, title_ar: u?.title_ar ?? unit_id, title_en: u?.title_en ?? null, value, stage: stageForValue(value), completed: unitCompletedAt.has(unit_id), objectives, assessedCount: objectives.filter((o) => o.assessed).length, total: objectives.length };
    })
    .sort((a, b) => (LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)) || a.unit_number - b.unit_number);

  const completed = [...unitCompletedAt.entries()].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)); // oldest→newest
  const completedSet = new Set(unitCompletedAt.keys());
  const skills: SkillPetal[] = SKILLS.map((skill) => {
    const series = completed.map(([uid, completedAt]) => ({ unitId: uid, skillScore: skillInUnitVal(uid, skill), completedAt }));
    const value = skillPetalAcrossUnits(series);
    const objs = catalog.filter((o) => o.skill === skill && completedSet.has(o.unit_id));
    return { skill, value, fraction: Math.max(0, Math.min(1, value / 10)), stage: stageForValue(value), assessed: objs.filter((o) => isAssessed(o.objective_id)).length, total: objs.length };
  });

  return { startedUnits, skills, startedUnitIds, assessedObjectives: evByObj.size };
}

export async function fetchEvidenceBlooms(supabase: SupabaseClient, learnerIds: string[]): Promise<Map<string, StudentBloom>> {
  const out = new Map<string, StudentBloom>();
  if (learnerIds.length === 0) return out;
  const { catalog, units } = await loadCatalog(supabase);
  const { data: ev } = await supabase
    .from("objective_evidence")
    .select("learner_id, objective_id, value, source, created_at")
    .in("learner_id", learnerIds);
  const byLearner = new Map<string, EvidenceRow[]>();
  for (const r of (ev ?? []) as (EvidenceRow & { learner_id: string })[]) {
    const arr = byLearner.get(r.learner_id) ?? [];
    arr.push({ objective_id: r.objective_id, value: Number(r.value), source: r.source, created_at: r.created_at });
    byLearner.set(r.learner_id, arr);
  }
  for (const id of learnerIds) out.set(id, computeEvidenceBloom(catalog, units, byLearner.get(id) ?? []));
  return out;
}

export async function fetchEvidenceBloom(supabase: SupabaseClient, learnerId: string): Promise<StudentBloom> {
  return (await fetchEvidenceBlooms(supabase, [learnerId])).get(learnerId)!;
}
