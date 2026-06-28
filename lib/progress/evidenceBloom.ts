// Assessment Evidence-Model Redesign · gate AE-2 — the NEW aggregation, as PURE FUNCTIONS.
//
// Built ALONGSIDE the old aggregation (lib/curriculum/aggregatePlan + lib/progress/bloom),
// which stays live this gate. NOTHING here reads Supabase or React — inputs are plain
// values, outputs are numbers. Data fetching + wiring come in later gates (AE-3…AE-5).
// Source of the rules: Ward_Curriculum_Master_Reference.md §1–§5 (after the 2026-06-28
// Evidence-Model amendment): simple mean BELOW the skill, DECAYING 65/35 per-skill ACROSS
// completed units. The 0–10 → state bands are the EXISTING frozen scale (reused, not
// redefined).

import { stageForValue, type BloomStage } from "@/lib/skills";

export { stageForValue };
export type { BloomStage };

/** round to 4 decimals (matches the decaying-fold precision used everywhere). */
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** One completed unit's score for a given skill, in completion order. */
export type CompletedUnitSkill = { unitId: string; skillScore: number; completedAt: string };

/**
 * Layer 1 — objective = simple mean of its evidence values (0–10). No decay here.
 * Empty (no evidence yet) → 0 (seed).
 */
export function objectiveValue(evidence: number[]): number {
  return mean(evidence);
}

/**
 * Layer 2 — a skill WITHIN one unit = simple mean of that skill's objective values in the
 * unit. Un-assessed objectives are passed in as 0 and INCLUDED (do not drop them). Empty
 * (the skill has no objectives in the unit) → 0.
 */
export function skillInUnit(objectiveValues: number[]): number {
  return mean(objectiveValues);
}

/**
 * Layer 3 — the big-rose skill petal = DECAYING average 65/35 of that skill's per-unit score
 * ACROSS COMPLETED units. THIS is the decaying, now at SKILL level (it replaces the old
 * objective-level decay of trigger 0056 — not called here).
 *
 * `completed` must be ordered oldest→newest by completedAt (the caller sorts); the fold runs
 * in that order so the newest completion dominates:
 *   acc0 = first.skillScore ; acc = round(0.35*acc + 0.65*current, 4).
 * Empty → 0.
 */
export function skillPetalAcrossUnits(completed: CompletedUnitSkill[]): number {
  if (completed.length === 0) return 0;
  let acc = completed[0].skillScore;
  for (let i = 1; i < completed.length; i++) {
    acc = round4(0.35 * acc + 0.65 * completed[i].skillScore);
  }
  return acc;
}

/**
 * Layer 4 — unit overall = simple mean of the unit's FOUR skill scores. Equal-weighted
 * (CEFR-pure). Used for the unit-completion celebration bloom (the single lifecycle object).
 */
export function unitOverall(fourSkillScores: number[]): number {
  return mean(fourSkillScores);
}
