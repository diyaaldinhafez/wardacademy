"use client";

import { useLocale, useTranslations } from "next-intl";

type Slot = { id: string; starts_at: string; duration_minutes: number };

/** Slot radio list formatted in the VISITOR's local timezone. This is a client
 * component, so the values differ from the server render; suppressHydrationWarning
 * keeps the client (correct, local) value without a mismatch warning. */
export default function SlotPicker({ slots }: { slots: Slot[] }) {
  const t = useTranslations("enrollForm");
  const locale = useLocale();
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  if (slots.length === 0) {
    return <p className="text-sm text-ink-soft">{t("slotsEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-soft" suppressHydrationWarning>
        {t("localTz", { tz: tz ? ` (${tz})` : "" })}
      </p>
      {slots.map((s, i) => (
        <label
          key={s.id}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
        >
          <input type="radio" name="slotId" value={s.id} required defaultChecked={i === 0} className="h-4 w-4 accent-[#7F55D9]" />
          <span className="text-ink" suppressHydrationWarning>
            {fmt(s.starts_at)} · {t("minutes", { n: s.duration_minutes })}
          </span>
        </label>
      ))}
    </div>
  );
}
