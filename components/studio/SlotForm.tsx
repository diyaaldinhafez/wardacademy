"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

export default function SlotForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [local, setLocal] = useState("");
  const utc = local ? new Date(local).toISOString() : "";

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        required
        className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
      />
      <input type="hidden" name="startsAt" value={utc} />
      <select name="duration" defaultValue="30" className="rounded-lg border border-brand-200 px-2 py-1.5 text-sm">
        <option value="30">30 دقيقة</option>
        <option value="45">45 دقيقة</option>
        <option value="60">60 دقيقة</option>
      </select>
      <SubmitButton
        pendingText="جارٍ الإضافة…"
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        أضِف موعداً
      </SubmitButton>
    </form>
  );
}
