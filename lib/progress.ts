// Derive an honest "bud -> bloom" stage from real tallies — never a fabricated
// percentage (PRD §5). attempts/correct are performance; completions are
// participation only and do not change the stage.
export type Tally = { attempts: number; correct: number; completions: number };

export type Stage = { label: string; level: 0 | 1 | 2 | 3 | 4 };

export function bloomStage(p: Tally): Stage {
  if (p.attempts === 0) {
    return p.completions > 0 ? { label: "Practiced", level: 1 } : { label: "Not started", level: 0 };
  }
  const ratio = p.correct / p.attempts;
  if (p.attempts >= 3 && ratio >= 0.8) return { label: "Blooming", level: 4 };
  if (ratio >= 0.6) return { label: "Growing", level: 3 };
  if (ratio >= 0.3) return { label: "Budding", level: 2 };
  return { label: "Sprouting", level: 1 };
}
