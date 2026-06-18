// Option sets + Arabic labels for the AI intro-session report.

export type Opt = { value: string; label: string };

export const ENGAGEMENT: Opt[] = [
  { value: "shy_then_warm", label: "خجولٌ في البداية ثمّ تفاعل" },
  { value: "engaged", label: "متفاعلٌ ومتحمّس" },
  { value: "calm_focused", label: "هادئٌ ومركّز" },
  { value: "needs_encouragement", label: "يحتاج تشجيعاً" },
];

export const STRENGTHS: Opt[] = [
  { value: "pronunciation", label: "النطق" },
  { value: "listening", label: "الاستماع" },
  { value: "vocabulary", label: "المفردات" },
  { value: "confidence", label: "الثقة" },
  { value: "comprehension", label: "الفهم" },
  { value: "enthusiasm", label: "الحماس" },
];

export const FOCUS: Opt[] = [
  { value: "listening", label: "الاستماع" },
  { value: "speaking", label: "التحدّث" },
  { value: "reading", label: "القراءة" },
  { value: "writing", label: "الكتابة" },
];

export const DECISION: Opt[] = [
  { value: "enroll", label: "قرّروا التسجيل في الجلسة" },
  { value: "considering", label: "يفكّرون في القرار" },
  { value: "declined", label: "غير مهتمّين الآن" },
];

const toMap = (o: Opt[]) => Object.fromEntries(o.map((x) => [x.value, x.label]));
export const INTRO_LABELS: Record<string, Record<string, string>> = {
  engagement: toMap(ENGAGEMENT),
  strengths: toMap(STRENGTHS),
  focus: toMap(FOCUS),
  decision: toMap(DECISION),
};
export const introLabel = (group: keyof typeof INTRO_LABELS, value?: string | null) =>
  value ? INTRO_LABELS[group]?.[value] ?? value : "";
export const introLabels = (group: keyof typeof INTRO_LABELS, values?: string[] | null) =>
  (values ?? []).map((v) => introLabel(group, v));
