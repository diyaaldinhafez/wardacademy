// Ward Academy progress model (presentation contract for the Bloom Map).
// Source of truth for the curriculum/model: Ward_Curriculum_Master_Reference.md.
// The design layer holds NO assessment logic — the platform computes the numbers
// here and passes plain props (value 0–10, fraction 0..1, counts) to the components.

// Four petals = four skills. Vocabulary is NOT a petal — it is a separate,
// deferred track (the language foundation), out of the MVP and not assessed.
export const SKILLS = ["listening", "speaking", "reading", "writing"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_EN: Record<Skill, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
};

// Every objective skill that can exist in the assessed data (the four petals).
export const OBJECTIVE_SKILLS = [...SKILLS] as const;

// ————— The shared lifecycle scale (objective · unit · skill) —————
// FOUR states on one continuous value 0–10 (computed by the platform, never here).
export type BloomStage = "seed" | "bud" | "balloon" | "bloom";

/**
 * stageForValue — the ONE shared visual scale.
 *   seed 0 – <2 · bud 2 – <5.5 · balloon 5.5 – <8.5 · bloom 8.5 – 10
 */
export function stageForValue(value: number): BloomStage {
  const v = Number(value) || 0;
  if (v < 2) return "seed";
  if (v < 5.5) return "bud";
  if (v < 8.5) return "balloon";
  return "bloom";
}
