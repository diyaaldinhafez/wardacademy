// Evidence → assessment value (0–10). The "how a value is produced" side that
// feeds objective_assessments. Source: Ward_Curriculum_Master_Reference.md §2–§4.
//   • auto    — auto-graded percentage → percent key → state → 0/4/7/10.
//   • teacher — teacher picks the state directly → 0/4/7/10.
//   • mixed   — AI drafts a state, the teacher confirms it (same value scale).
import type { BloomStage } from "@/lib/skills";

export type Evidence = "auto" | "teacher" | "mixed";

/** The 0–10 anchor value for each state (seed/bud/balloon/bloom). */
export const STATE_VALUE: Record<BloomStage, number> = { seed: 0, bud: 4, balloon: 7, bloom: 10 };

/** Percent key (auto-graded skills): <50 seed · 50–69 bud · 70–89 balloon · 90+ bloom. */
export function stateForPercent(percent: number): BloomStage {
  const p = Number(percent) || 0;
  if (p < 50) return "seed";
  if (p < 70) return "bud";
  if (p < 90) return "balloon";
  return "bloom";
}

/** Auto-graded percentage (0–100) → assessment value (0–10) via the percent key. */
export function valueForPercent(percent: number): number {
  return STATE_VALUE[stateForPercent(percent)];
}

/** Teacher- or AI-chosen state → assessment value (0–10). */
export function valueForState(state: BloomStage): number {
  return STATE_VALUE[state];
}
