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
// English (admin is English by internal decision).
export const LEAD_STATUS_EN: Record<string, string> = {
  new: "New",
  booked: "Booked",
  testing: "Testing",
  tested: "Tested",
  converted: "Converted",
  archived: "Archived",
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

// English labels (admin is English by internal decision), keyed by step.key.
export const PIPELINE_LABEL_EN: Record<string, string> = {
  register: "Register",
  book: "Book",
  test: "Test",
  session: "Session",
  payment: "Payment",
  accounts: "Accounts",
};

export type Step = { key: string; label: string; done: boolean };
export type PipelineInput = {
  hasBooking: boolean;
  testStatus?: string | null; // draft | shared | completed
  introStatus?: string | null; // draft | sent
  paymentStatus?: string | null; // pending | link_sent | paid
  converted: boolean;
};

function actionFor(i: number, input: PipelineInput): { key: string; tone: Tone } {
  switch (i) {
    case 1:
      return { key: "sendBookingLink", tone: "apricot" };
    case 2:
      if (!input.testStatus) return { key: "generateTest", tone: "brand" };
      if (input.testStatus === "draft") return { key: "approveTest", tone: "warning" };
      return { key: "awaitingStudent", tone: "neutral" };
    case 3:
      if (input.introStatus === "draft") return { key: "sendReport", tone: "warning" };
      return { key: "logReport", tone: "brand" };
    case 4:
      if (input.paymentStatus === "link_sent") return { key: "awaitingPayment", tone: "neutral" };
      return { key: "sendPaymentLink", tone: "apricot" };
    case 5:
      return { key: "provisionAccounts", tone: "success" };
    default:
      return { key: "view", tone: "neutral" };
  }
}

// English labels (admin) for the next-action chip + the status filter tabs.
export const ACTION_LABEL_EN: Record<string, string> = {
  sendBookingLink: "Send booking link",
  generateTest: "Generate test",
  approveTest: "Approve test",
  awaitingStudent: "Awaiting student",
  sendReport: "Send session report",
  logReport: "Log session report",
  awaitingPayment: "Awaiting payment",
  sendPaymentLink: "Send payment link",
  provisionAccounts: "Provision accounts",
  view: "View",
};
export const PIPELINE_EN: Record<string, string> = {
  "": "All", new: "New", booked: "Booked", testing: "Testing", tested: "Tested", converted: "Converted",
};

/** Compute the pipeline: each step's done state (contiguous), the current step,
 * and the single next action. One place feeds the list, the detail, and the buttons. */
export function computePipeline(input: PipelineInput): {
  steps: Step[];
  currentIndex: number;
  nextAction: { key: string; tone: Tone } | null;
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
