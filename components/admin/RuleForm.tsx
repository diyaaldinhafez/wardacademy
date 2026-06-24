"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SubmitButton from "@/components/studio/SubmitButton";
import { WEEKDAY_EN, sessionsPerRule } from "@/lib/availability";

const sel = "ward-select__control";
const ctl = "ward-field__control";

export default function RuleForm({ breakMinutes, action }: { breakMinutes: number; action: (formData: FormData) => void | Promise<void> }) {
  const t = useTranslations("availability");
  const [weekday, setWeekday] = useState("1");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("18:00");
  const [slot, setSlot] = useState("");

  const count = end > start && slot ? sessionsPerRule(start, end, Number(slot), breakMinutes) : 0;

  return (
    <form action={action} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8 }}>
      <select name="weekday" value={weekday} onChange={(e) => setWeekday(e.target.value)} className={sel} style={{ width: "auto", minHeight: 40 }}>
        {WEEKDAY_EN.map((w, i) => (
          <option key={i} value={i}>{w}</option>
        ))}
      </select>
      <input type="time" name="startTime" value={start} onChange={(e) => setStart(e.target.value)} required className={ctl} style={{ width: "auto" }} />
      <input type="time" name="endTime" value={end} onChange={(e) => setEnd(e.target.value)} required className={ctl} style={{ width: "auto" }} />
      <select name="slotMinutes" value={slot} onChange={(e) => setSlot(e.target.value)} required className={sel} style={{ width: "auto", minHeight: 40 }}>
        <option value="" disabled>{t("slotPlaceholder")}</option>
        <option value="30">{t("minutes", { n: 30 })}</option>
        <option value="45">{t("minutes", { n: 45 })}</option>
      </select>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: count > 0 ? "var(--leaf-700)" : "var(--text-muted)",
          background: "var(--surface-sunken)",
          borderRadius: 999,
          padding: "8px 12px",
        }}
      >
        {t("sessionsPerWeek", { n: count })}
      </span>
      <SubmitButton pendingText="…" className="ward-btn ward-btn--primary ward-btn--sm">{t("addRule")}</SubmitButton>
    </form>
  );
}
