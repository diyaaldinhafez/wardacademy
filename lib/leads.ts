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

// ---- Registration pipeline (single source of truth) ----
// One word per step, in order.
export const PIPELINE_STEPS = [
  { key: "register", label: "التسجيل" },
  { key: "book", label: "الحجز" },
  { key: "test", label: "الاختبار" },
  { key: "session", label: "الجلسة" },
  { key: "payment", label: "الدفع" },
  { key: "accounts", label: "الحسابات" },
] as const;

export type Step = { key: string; label: string; done: boolean };
export type PipelineInput = {
  hasBooking: boolean;
  testStatus?: string | null; // draft | shared | completed
  introStatus?: string | null; // draft | sent
  paymentStatus?: string | null; // pending | link_sent | paid
  converted: boolean;
};

function actionFor(i: number, input: PipelineInput): { label: string; tone: Tone } {
  switch (i) {
    case 1:
      return { label: "أرسِل رابط الحجز", tone: "apricot" };
    case 2:
      if (!input.testStatus) return { label: "ولّد الاختبار", tone: "brand" };
      if (input.testStatus === "draft") return { label: "اعتمد الاختبار", tone: "warning" };
      return { label: "بانتظار حلّ الطالب", tone: "neutral" };
    case 3:
      if (input.introStatus === "draft") return { label: "أرسِل تقرير الجلسة", tone: "warning" };
      return { label: "سجّل تقرير الجلسة", tone: "brand" };
    case 4:
      if (input.paymentStatus === "link_sent") return { label: "بانتظار الدفع", tone: "neutral" };
      return { label: "أرسِل رابط الدفع", tone: "apricot" };
    case 5:
      return { label: "جهّز الحسابات", tone: "success" };
    default:
      return { label: "عرض", tone: "neutral" };
  }
}

/** Compute the pipeline: each step's done state (contiguous), the current step,
 * and the single next action. One place feeds the list, the detail, and the buttons. */
export function computePipeline(input: PipelineInput): {
  steps: Step[];
  currentIndex: number;
  nextAction: { label: string; tone: Tone } | null;
} {
  const raw = [
    true, // register — the lead exists
    input.hasBooking,
    input.testStatus === "completed",
    input.introStatus === "sent",
    input.paymentStatus === "paid" || input.converted,
    input.converted,
  ];
  // Make completion contiguous: a step counts as done if any later step is done.
  const done = [...raw];
  for (let i = done.length - 2; i >= 0; i--) if (done[i + 1]) done[i] = true;

  const steps = PIPELINE_STEPS.map((s, i) => ({ key: s.key, label: s.label, done: done[i] }));
  const firstOpen = done.indexOf(false);
  const currentIndex = firstOpen < 0 ? steps.length : firstOpen;
  const nextAction = firstOpen < 0 ? null : actionFor(firstOpen, input);
  return { steps, currentIndex, nextAction };
}
