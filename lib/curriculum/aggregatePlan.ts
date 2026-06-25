// Deterministic study-plan aggregation from the Ward Curriculum catalog.
// The plan is AGGREGATED from curriculum_objectives, never AI-generated or authored.
// Source of truth for the curriculum: Ward_Curriculum_Master_Reference.md.

import type { SupabaseClient } from "@supabase/supabase-js";

/** One plan item — shaped exactly like study_plans.items, so every consumer
 *  (/learn · /guardian · the teacher builder) reads it field-for-field. */
export type PlanItem = { id: string; description: string; skill: string; level: string; unit: string };

type CatalogRow = {
  objective_id: string;
  unit_id: string;
  unit_number: number;
  seq: number;
  skill: string;
  level: string;
  descriptor_ar: string;
};

/**
 * Aggregate the full study plan for a CEFR entry level: ALL of that level's
 * objectives, from Unit 1, in stable catalog order — no AI, no authoring.
 *  - id          = objective_id (e.g. A1-U01-L1), stable & real
 *  - unit        = the unit's title_ar
 *  - description = the objective's descriptor_ar
 *  - skill       = the objective's skill
 *  - level       = the NOMINAL unit level (o.level) — the child's journey
 *                  position. NOT cefr_level, which intentionally stretches above
 *                  the unit under Stretch+Spiral and would show a contradictory
 *                  per-lesson level if displayed.
 * Order: unit_number, seq, objective_id — total & stable (objective_id is the
 * tiebreaker, so no reliance on unspecified DB ordering).
 */
export async function aggregatePlanItems(supabase: SupabaseClient, level: string): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from("curriculum_objectives")
    .select("objective_id, unit_id, unit_number, seq, skill, level, descriptor_ar")
    .eq("level", level)
    .order("unit_number", { ascending: true })
    .order("seq", { ascending: true })
    .order("objective_id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CatalogRow[];
  if (rows.length === 0) return [];

  // Unit titles (title_ar) keyed by unit_id.
  const unitIds = [...new Set(rows.map((r) => r.unit_id))];
  const { data: units } = await supabase.from("curriculum_units").select("unit_id, title_ar").in("unit_id", unitIds);
  const titleByUnit = new Map<string, string>(((units ?? []) as { unit_id: string; title_ar: string }[]).map((u) => [u.unit_id, u.title_ar]));

  return rows.map((r) => ({
    id: r.objective_id,
    description: r.descriptor_ar,
    skill: r.skill,
    level: r.level, // nominal unit level (journey position), not cefr_level
    unit: titleByUnit.get(r.unit_id) ?? r.unit_id,
  }));
}
