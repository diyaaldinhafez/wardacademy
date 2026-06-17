// Shared item vocabulary (no dependencies) — safe to import from client or
// server. Mirrors the enums in migration 0005.

export const ITEM_FORMATS = [
  "multiple_choice",
  "fill_blank",
  "true_false",
  "matching",
  "open",
  "audio",
] as const;
export type ItemFormat = (typeof ITEM_FORMATS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ITEM_STATUSES = ["draft", "approved", "rejected"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const FORMAT_LABELS: Record<ItemFormat, string> = {
  multiple_choice: "Multiple choice",
  fill_blank: "Fill in the blank",
  true_false: "True / False",
  matching: "Matching",
  open: "Open answer",
  audio: "Audio (student recording)",
};
