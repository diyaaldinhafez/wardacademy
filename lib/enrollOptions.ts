// Shared option sets + Arabic labels for the enrolment form and the admin view.
// Stored values are stable codes; labels are for display.

import { SKILLS, SKILL_AR, type Skill } from "@/lib/skills";

export type Opt = { value: string; label: string };

// Country of residence — curated for the target region (+ other).
export const COUNTRIES: string[] = [
  "السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان",
  "الأردن", "لبنان", "سوريا", "فلسطين", "العراق", "مصر",
  "اليمن", "السودان", "ليبيا", "تونس", "الجزائر", "المغرب",
  "تركيا", "دولة أخرى",
];

// Current school stage — Grade 1 through end of middle school (9 levels).
export const STAGES: Opt[] = [
  { value: "g1", label: "الأول الابتدائي" },
  { value: "g2", label: "الثاني الابتدائي" },
  { value: "g3", label: "الثالث الابتدائي" },
  { value: "g4", label: "الرابع الابتدائي" },
  { value: "g5", label: "الخامس الابتدائي" },
  { value: "g6", label: "السادس الابتدائي" },
  { value: "g7", label: "الأول المتوسط" },
  { value: "g8", label: "الثاني المتوسط" },
  { value: "g9", label: "الثالث المتوسط" },
];

export const SCHOOL_TYPES: Opt[] = [
  { value: "public", label: "مدرسة حكوميّة" },
  { value: "private", label: "مدرسة خاصّة" },
  { value: "homeschool", label: "تعليمٌ منزليّ" },
];

export const GOALS: Opt[] = [
  { value: "general", label: "تقويةٌ عامّة في الإنجليزية" },
  { value: "curriculum", label: "دعمٌ وفق المنهج الدراسيّ" },
];

// Overall self-assessed level.
export const LEVELS: Opt[] = [
  { value: "beginner", label: "مبتدئ" },
  { value: "basic", label: "أساسيّ" },
  { value: "intermediate", label: "متوسّط" },
  { value: "advanced", label: "متقدّم" },
];

// Per-skill self-rating scale (a measure for each of the five skills).
export const SKILL_RATINGS: Opt[] = [
  { value: "weak", label: "ضعيف" },
  { value: "fair", label: "مقبول" },
  { value: "good", label: "جيّد" },
  { value: "excellent", label: "ممتاز" },
];

export const PRIOR_STUDY: Opt[] = [
  { value: "none", label: "لا، فقط المدرسة" },
  { value: "courses", label: "نعم، دورات" },
  { value: "tutor", label: "نعم، معلّم خاصّ" },
  { value: "apps", label: "نعم, تطبيقات/ذاتيّ" },
];

export const ENROLL_SKILLS: Skill[] = [...SKILLS];
export { SKILL_AR };

// value → label lookups for the admin display.
const toMap = (opts: Opt[]) => Object.fromEntries(opts.map((o) => [o.value, o.label]));
export const LABELS: Record<string, Record<string, string>> = {
  stage: toMap(STAGES),
  schoolType: toMap(SCHOOL_TYPES),
  goal: toMap(GOALS),
  level: toMap(LEVELS),
  rating: toMap(SKILL_RATINGS),
  priorStudy: toMap(PRIOR_STUDY),
};
export const labelOf = (group: keyof typeof LABELS, value?: string | null) =>
  value ? LABELS[group]?.[value] ?? value : "—";
