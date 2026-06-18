// Shared option sets + Arabic labels for the enrolment form and the admin view.
// Stored values are stable codes; labels are for display.

import { SKILL_AR, type Skill } from "@/lib/skills";

export type Opt = { value: string; label: string };

// Selectable ages for the student (7–15).
export const AGES: number[] = Array.from({ length: 9 }, (_, i) => i + 7);

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

// How much English is part of the child's daily life (academic vs. lived).
export const ENGLISH_USE: Opt[] = [
  { value: "home_school", label: "في البيت والمدرسة يومياً" },
  { value: "school_only", label: "في المدرسة فقط" },
  { value: "sometimes", label: "أحياناً (إعلام، ألعاب، أصدقاء)" },
  { value: "rarely", label: "نادراً — لغته اليومية غير الإنجليزية" },
];

export const RELATIONS: Opt[] = [
  { value: "father", label: "الأب" },
  { value: "mother", label: "الأمّ" },
  { value: "guardian", label: "وصيّ" },
  { value: "other", label: "آخر" },
];

export const REFERRALS: Opt[] = [
  { value: "facebook", label: "فيسبوك" },
  { value: "instagram", label: "إنستغرام" },
  { value: "friend", label: "صديق أو معرفة" },
  { value: "search", label: "بحث Google" },
  { value: "other", label: "مصدرٌ آخر" },
];

// The four assessed skills on the enrolment form (vocabulary excluded here).
export const ENROLL_SKILLS: Skill[] = ["listening", "speaking", "reading", "writing"];
export { SKILL_AR };

// value → label lookups for the admin display.
const toMap = (opts: Opt[]) => Object.fromEntries(opts.map((o) => [o.value, o.label]));
export const LABELS: Record<string, Record<string, string>> = {
  schoolType: toMap(SCHOOL_TYPES),
  goal: toMap(GOALS),
  level: toMap(LEVELS),
  rating: toMap(SKILL_RATINGS),
  priorStudy: toMap(PRIOR_STUDY),
  englishUse: toMap(ENGLISH_USE),
  relation: toMap(RELATIONS),
  referral: toMap(REFERRALS),
};
export const labelOf = (group: keyof typeof LABELS, value?: string | null) =>
  value ? LABELS[group]?.[value] ?? value : "—";
