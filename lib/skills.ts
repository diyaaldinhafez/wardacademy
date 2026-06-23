// Ward Academy progress model (presentation contract for the Bloom Map).
// Source of truth for the curriculum/model: Ward_Curriculum_Master_Reference.md.
// The design layer holds NO assessment logic — the platform computes the numbers
// here and passes plain props (value 0–10, fraction 0..1, counts) to the components.

// Four petals = four skills. Vocabulary is NOT a petal — it is a separate track
// shown by VocabCounter (the language foundation: vocabulary + grammar).
export const SKILLS = ["listening", "speaking", "reading", "writing"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_AR: Record<Skill, string> = {
  listening: "الاستماع",
  speaking: "المحادثة",
  reading: "القراءة",
  writing: "الكتابة",
};

export const SKILL_EN: Record<Skill, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
};

// Vocabulary — tracked and counted, never a petal.
export const VOCAB_SKILL = "vocabulary" as const;
export const VOCAB_AR = "الأساس اللغوي";
export const VOCAB_EN = "Building Blocks";

// Every objective skill that can exist in the data (the 4 petals + vocabulary).
export const OBJECTIVE_SKILLS = [...SKILLS, VOCAB_SKILL] as const;

// Speaking is filled by teacher assessment only (no auto pronunciation scoring).
export const TEACHER_ASSESSED: Skill = "speaking";

// The teacher rates Speaking on this scale; value (0..1) drives the petal.
export const SPEAKING_LEVELS: { value: number; label: string }[] = [
  { value: 0.25, label: "يبدأ" },
  { value: 0.5, label: "تتطوّر" },
  { value: 0.75, label: "جيّدة" },
  { value: 1, label: "متمكّنة" },
];

export type Petal = { name: Skill; ar: string; value: number; mastered: number; total: number };

type ProgressLike = { attempts: number; correct: number; skill?: string | null };

// An objective counts as "mastered" once attempted with a solid correct ratio.
export const isMastered = (p: { attempts: number; correct: number }) =>
  p.attempts >= 1 && p.correct / Math.max(1, p.attempts) >= 0.6;

/**
 * Four petal values (0..1) = the fraction of mastered objectives in each skill —
 * real progress, never a fabricated percentage. Skills with no activity stay at 0.
 * (Vocabulary is excluded — it is the VocabCounter track.)
 */
export function petalValues(progress: ProgressLike[]): Petal[] {
  const by = new Map<string, { total: number; mastered: number }>();
  for (const p of progress) {
    if (!p.skill) continue;
    const b = by.get(p.skill) ?? { total: 0, mastered: 0 };
    b.total += 1;
    if (isMastered(p)) b.mastered += 1;
    by.set(p.skill, b);
  }
  return SKILLS.map((s) => {
    const b = by.get(s) ?? { total: 0, mastered: 0 };
    return { name: s, ar: SKILL_AR[s], value: b.total ? b.mastered / b.total : 0, mastered: b.mastered, total: b.total };
  });
}

/** Count of mastered vocabulary objectives — the VocabCounter value. */
export function vocabMastered(progress: ProgressLike[]): number {
  return progress.filter((p) => p.skill === VOCAB_SKILL && isMastered(p)).length;
}

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

/** Map an honest progress tally → the 0–10 lifecycle value (no attempts = seed). */
export function valueOf(p: { attempts: number; correct: number }): number {
  if (!p.attempts) return 0;
  return Math.max(0, Math.min(10, (p.correct / p.attempts) * 10));
}
