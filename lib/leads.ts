// Lead pipeline helpers — status labels/tones and the single "next action".

export type Tone = "brand" | "neutral" | "success" | "warning" | "danger" | "info" | "apricot";

export const LEAD_STATUS_AR: Record<string, string> = {
  new: "جديد",
  booked: "محجوز",
  testing: "قيد الاختبار",
  tested: "اكتمل الاختبار",
  converted: "مُحوّل",
  archived: "مؤرشف",
};

export const LEAD_STATUS_TONE: Record<string, Tone> = {
  new: "apricot",
  booked: "brand",
  testing: "warning",
  tested: "success",
  converted: "neutral",
  archived: "neutral",
};

export const PIPELINE: { key: string; label: string }[] = [
  { key: "", label: "الكلّ" },
  { key: "new", label: "جديد" },
  { key: "booked", label: "محجوز" },
  { key: "testing", label: "قيد الاختبار" },
  { key: "tested", label: "اكتمل الاختبار" },
  { key: "converted", label: "مُحوّل" },
];

/** The single next action for a lead, given its status and its test's status. */
export function nextStep(leadStatus: string, testStatus?: string | null): { label: string; tone: Tone } | null {
  if (leadStatus === "converted") return null;
  if (leadStatus === "archived") return null;
  if (!testStatus) return { label: "ولّد اختبار التحديد", tone: "brand" };
  if (testStatus === "draft") return { label: "راجِع واعتمد الاختبار", tone: "warning" };
  if (testStatus === "shared") return { label: "بانتظار حلّ الطالب", tone: "neutral" };
  if (testStatus === "completed") return { label: "جهّز الحسابات", tone: "success" };
  return null;
}
