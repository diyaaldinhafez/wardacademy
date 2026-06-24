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
import type { SupabaseClient } from "@supabase/supabase-js";

export type ObjectiveBloom = {
  objective_id: string;
  skill: Skill;
  seq: number;
  descriptor_ar: string;
  value: number; // 0–10 (0 when un-assessed)
  state: BloomStage;
  assessed: boolean;
};

export type UnitBloom = {
  unit_id: string;
  level: string;
  unit_number: number;
  title_ar: string;
  value: number; // 0–10, simple mean of ALL objectives (un-assessed = 0)
  stage: BloomStage;
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

type CatalogObjective = { objective_id: string; unit_id: string; skill: Skill; seq: number; descriptor_ar: string };
type CatalogUnit = { unit_id: string; level: string; unit_number: number; title_ar: string };

const LEVEL_ORDER = ["A1", "A2", "B1"];
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Pure roll-up: catalog + a (objective_id → current_value) map → StudentBloom. Unit-tested by the gate. */
export function computeStudentBloom(
  catalog: CatalogObjective[],
  units: CatalogUnit[],
  progress: Map<string, number>,
): StudentBloom {
  const unitById = new Map(units.map((u) => [u.unit_id, u]));
  const byUnit = new Map<string, CatalogObjective[]>();
  for (const o of catalog) {
    const arr = byUnit.get(o.unit_id) ?? [];
    arr.push(o);
    byUnit.set(o.unit_id, arr);
  }

  // A unit is "started" if any of its objectives has progress.
  const startedUnitIds = [...byUnit.entries()]
    .filter(([, objs]) => objs.some((o) => progress.has(o.objective_id)))
    .map(([unit_id]) => unit_id);

  const startedUnits: UnitBloom[] = startedUnitIds
    .map((unit_id) => {
      const u = unitById.get(unit_id);
      const objs = [...(byUnit.get(unit_id) ?? [])].sort((a, b) => a.seq - b.seq);
      const objectives: ObjectiveBloom[] = objs.map((o) => {
        const assessed = progress.has(o.objective_id);
        const value = assessed ? (progress.get(o.objective_id) as number) : 0;
        return { objective_id: o.objective_id, skill: o.skill, seq: o.seq, descriptor_ar: o.descriptor_ar, value, state: stageForValue(value), assessed };
      });
      const value = mean(objectives.map((o) => o.value)); // un-assessed = 0
      return {
        unit_id,
        level: u?.level ?? "",
        unit_number: u?.unit_number ?? 0,
        title_ar: u?.title_ar ?? unit_id,
        value,
        stage: stageForValue(value),
        objectives,
        assessedCount: objectives.filter((o) => o.assessed).length,
        total: objectives.length,
      };
    })
    .sort((a, b) => (LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)) || a.unit_number - b.unit_number);

  // Skill petals: across started units only, un-assessed objectives count as 0.
  const startedSet = new Set(startedUnitIds);
  const skills: SkillPetal[] = SKILLS.map((skill) => {
    const objs = catalog.filter((o) => o.skill === skill && startedSet.has(o.unit_id));
    const values = objs.map((o) => (progress.has(o.objective_id) ? (progress.get(o.objective_id) as number) : 0));
    const value = mean(values);
    return {
      skill,
      value,
      fraction: Math.max(0, Math.min(1, value / 10)),
      stage: stageForValue(value),
      assessed: objs.filter((o) => progress.has(o.objective_id)).length,
      total: objs.length,
    };
  });

  return {
    startedUnits,
    skills,
    startedUnitIds,
    assessedObjectives: [...progress.keys()].length,
  };
}

let _catalogCache: { catalog: CatalogObjective[]; units: CatalogUnit[] } | null = null;

/** Loads the frozen catalog once (it is platform-wide and immutable). */
async function loadCatalog(supabase: SupabaseClient) {
  if (_catalogCache) return _catalogCache;
  const [{ data: objs }, { data: units }] = await Promise.all([
    supabase.from("curriculum_objectives").select("objective_id, unit_id, skill, seq, descriptor_ar"),
    supabase.from("curriculum_units").select("unit_id, level, unit_number, title_ar"),
  ]);
  _catalogCache = { catalog: (objs ?? []) as CatalogObjective[], units: (units ?? []) as CatalogUnit[] };
  return _catalogCache;
}

/** Fetch + roll up one student's bloom from the live model (RLS-scoped client). */
export async function fetchStudentBloom(supabase: SupabaseClient, learnerId: string): Promise<StudentBloom> {
  const { catalog, units } = await loadCatalog(supabase);
  const { data: prog } = await supabase
    .from("objective_progress")
    .select("objective_id, current_value")
    .eq("student_id", learnerId);
  const map = new Map<string, number>();
  for (const r of (prog ?? []) as { objective_id: string; current_value: number }[]) map.set(r.objective_id, Number(r.current_value));
  return computeStudentBloom(catalog, units, map);
}

/** Fetch + roll up many students in one progress query (for the guardian's children). */
export async function fetchStudentBlooms(supabase: SupabaseClient, learnerIds: string[]): Promise<Map<string, StudentBloom>> {
  const out = new Map<string, StudentBloom>();
  if (learnerIds.length === 0) return out;
  const { catalog, units } = await loadCatalog(supabase);
  const { data: prog } = await supabase
    .from("objective_progress")
    .select("student_id, objective_id, current_value")
    .in("student_id", learnerIds);
  const byStudent = new Map<string, Map<string, number>>();
  for (const r of (prog ?? []) as { student_id: string; objective_id: string; current_value: number }[]) {
    const m = byStudent.get(r.student_id) ?? new Map<string, number>();
    m.set(r.objective_id, Number(r.current_value));
    byStudent.set(r.student_id, m);
  }
  for (const id of learnerIds) out.set(id, computeStudentBloom(catalog, units, byStudent.get(id) ?? new Map()));
  return out;
}
