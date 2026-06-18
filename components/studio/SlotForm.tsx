"use client";

import { useState } from "react";
import { addSlot } from "@/app/studio/actions";
import SubmitButton from "./SubmitButton";

export default function SlotForm() {
  const [local, setLocal] = useState("");
  const utc = local ? new Date(local).toISOString() : "";

  return (
    <form action={addSlot} className="flex flex-wrap items-end gap-2">
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        required
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input type="hidden" name="startsAt" value={utc} />
      <select name="duration" defaultValue="30" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
        <option value="30">30 min</option>
        <option value="45">45 min</option>
        <option value="60">60 min</option>
      </select>
      <SubmitButton
        pendingText="Adding…"
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        Add slot
      </SubmitButton>
    </form>
  );
}
