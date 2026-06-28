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

// ── AE-4: per-OBJECTIVE auto evidence (Assessment Evidence-Model Redesign) ──
// Pure grouping of graded AUTO items by their objective_id → one ratio-keyed value each.
// Replaces the old per-SKILL flattening: each objective gets its OWN % → value. Items with
// a NULL objective_id OR grading !== 'auto' are SKIPPED (no row) → a safe no-op on current
// untagged production content. Consumed by the auto-grade actions to write objective_evidence.
export type GradedItem = { objective_id: string | null; grading: string | null; correct: boolean };
export type AutoEvidence = { objective_id: string; value: number };

export function buildAutoEvidence(items: GradedItem[]): AutoEvidence[] {
  const byObjective = new Map<string, { correct: number; total: number }>();
  for (const it of items) {
    if (!it.objective_id || it.grading !== "auto") continue; // skip untagged / non-auto
    const g = byObjective.get(it.objective_id) ?? { correct: 0, total: 0 };
    g.total += 1;
    if (it.correct) g.correct += 1;
    byObjective.set(it.objective_id, g);
  }
  return [...byObjective.entries()].map(([objective_id, g]) => ({
    objective_id,
    value: valueForPercent((g.correct / g.total) * 100), // §2-أ ratio key: <50→0 ·50–69→4 ·70–89→7 ·90+→10
  }));
}
