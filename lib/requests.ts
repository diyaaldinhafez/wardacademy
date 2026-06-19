import type { Tone } from "@/lib/leads";

export const REQUEST_TYPES = [
  { value: "pause", label: "تعليق مؤقّت" },
  { value: "cancel", label: "إيقاف نهائيّ" },
  { value: "complaint", label: "شكوى" },
  { value: "other", label: "طلب آخر" },
];

export const REQUEST_TYPE_AR: Record<string, string> = Object.fromEntries(REQUEST_TYPES.map((t) => [t.value, t.label]));
export const REQUEST_TYPE_TONE: Record<string, Tone> = { pause: "warning", cancel: "danger", complaint: "danger", other: "neutral" };
export const REQUEST_STATUS_AR: Record<string, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مُغلقة" };
export const REQUEST_STATUS_TONE: Record<string, Tone> = { open: "apricot", in_progress: "warning", closed: "neutral" };
