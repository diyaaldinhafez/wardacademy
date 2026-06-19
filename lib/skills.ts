// Five petals = five skills (Design System §9b, fixed legal order).
// The 5th petal is the language foundation (vocabulary + grammar / "Building
// Blocks"); the internal key stays "vocabulary" for data continuity.
export const SKILLS = ["listening", "speaking", "reading", "writing", "vocabulary"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_AR: Record<Skill, string> = {
  listening: "الاستماع",
  speaking: "المحادثة",
  reading: "القراءة",
  writing: "الكتابة",
  vocabulary: "الأساس اللغوي",
};

export const SKILL_EN: Record<Skill, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  vocabulary: "Building Blocks",
};

// Speaking is filled by teacher assessment only (no auto pronunciation scoring).
export const TEACHER_ASSESSED: Skill = "speaking";

// The teacher rates Speaking on this scale; value (0..1) drives the petal.
export const SPEAKING_LEVELS: { value: number; label: string }[] = [
  { value: 0.25, label: "يبدأ" },
  { value: 0.5, label: "تتطوّر" },
  { value: 0.75, label: "جيّدة" },
  { value: 1, label: "متمكّنة" },
];

export type Petal = { name: Skill; ar: string; value: number };

type ProgressLike = { attempts: number; correct: number; skill?: string | null };

// An objective counts as "mastered" once attempted with a solid correct ratio.
const isMastered = (p: ProgressLike) => p.attempts >= 1 && p.correct / Math.max(1, p.attempts) >= 0.6;

/**
 * Each petal fills from the % of mastered objectives in that skill — from real
 * progress, never a fabricated percentage. Skills with no activity stay at 0.
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
    const b = by.get(s);
    return { name: s, ar: SKILL_AR[s], value: b && b.total ? Math.round((b.mastered / b.total) * 100) : 0 };
  });
}

// bud → balloon → bloom: three states of one unit (objective) progressing.
export type BloomStage = "bud" | "balloon" | "bloom";
export function unitStage(p: { attempts: number; correct: number }): BloomStage {
  if (p.attempts === 0) return "bud";
  const ratio = p.correct / Math.max(1, p.attempts);
  if (ratio >= 0.8 && p.attempts >= 2) return "bloom";
  return "balloon";
}
