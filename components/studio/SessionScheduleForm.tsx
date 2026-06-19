"use client";

import { useState } from "react";
import { scheduleSession } from "@/app/studio/actions";
import SubmitButton from "./SubmitButton";

const ctl = "ward-field__control";
const sel = "ward-select__control";

/** Schedule a session for one student, optionally tied to a lesson from the plan. */
export default function SessionScheduleForm({ learnerId, planItems }: { learnerId: string; planItems: { index: number; label: string }[] }) {
  const [local, setLocal] = useState("");
  const [lessonIdx, setLessonIdx] = useState("");
  const utc = local ? new Date(local).toISOString() : "";
  const lessonTitle = lessonIdx === "" ? "" : planItems.find((p) => String(p.index) === lessonIdx)?.label ?? "";

  return (
    <form action={scheduleSession} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8 }}>
      <input type="hidden" name="learnerId" value={learnerId} />
      <input type="hidden" name="scheduledAt" value={utc} />
      <input type="hidden" name="lessonTitle" value={lessonTitle} />
      <input type="hidden" name="planItemIndex" value={lessonIdx} />

      <input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} className={ctl} style={{ width: "auto" }} />
      <select value={lessonIdx} onChange={(e) => setLessonIdx(e.target.value)} className={sel} style={{ width: "auto", minHeight: 40, maxWidth: 220 }}>
        <option value="">— درس الجلسة (اختياري) —</option>
        {planItems.map((p) => (
          <option key={p.index} value={p.index}>{p.index + 1}. {p.label}</option>
        ))}
      </select>
      <select name="duration" defaultValue="30" className={sel} style={{ width: "auto", minHeight: 40 }}>
        <option value="30">30 دقيقة</option>
        <option value="45">45 دقيقة</option>
        <option value="60">60 دقيقة</option>
      </select>
      <SubmitButton pendingText="جارٍ الجدولة…" className="ward-btn ward-btn--primary ward-btn--sm">جدوِل جلسة</SubmitButton>
    </form>
  );
}
