"use client";

import { useState } from "react";
import { scheduleSession } from "@/app/studio/actions";
import SubmitButton from "./SubmitButton";

// Converts the local datetime-local value to a UTC ISO string for the server.
export default function ScheduleForm({ learners }: { learners: { id: string; name: string }[] }) {
  const [local, setLocal] = useState("");
  const utc = local ? new Date(local).toISOString() : "";

  return (
    <form action={scheduleSession} className="flex flex-wrap items-end gap-2">
      <select name="learnerId" required defaultValue="" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
        <option value="" disabled>
          Choose a student…
        </option>
        {learners.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        required
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <input type="hidden" name="scheduledAt" value={utc} />
      <select name="duration" defaultValue="30" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
        <option value="30">30 min</option>
        <option value="45">45 min</option>
        <option value="60">60 min</option>
      </select>
      <SubmitButton
        pendingText="Scheduling…"
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        Schedule
      </SubmitButton>
    </form>
  );
}
