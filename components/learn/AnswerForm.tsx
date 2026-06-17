"use client";

import { submitAnswer } from "@/app/learn/actions";
import SubmitButton from "@/components/studio/SubmitButton";

export default function AnswerForm({
  itemId,
  format,
  options,
}: {
  itemId: string;
  format: string;
  options?: string[];
}) {
  return (
    <form action={submitAnswer} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="itemId" value={itemId} />

      {format === "multiple_choice" &&
        (options ?? []).map((o, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input type="radio" name="answer" value={o} required /> {o}
          </label>
        ))}

      {format === "true_false" &&
        ["true", "false"].map((v) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="radio" name="answer" value={v} required /> {v === "true" ? "True" : "False"}
          </label>
        ))}

      {format === "fill_blank" && (
        <input
          name="answer"
          required
          placeholder="Your answer"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      )}

      {(format === "open" || format === "matching") && (
        <textarea
          name="answer"
          required
          rows={3}
          placeholder="Your answer"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
      )}

      {format === "audio" && (
        <>
          <p className="text-sm text-slate-500">Practice saying it aloud, then mark it as practiced.</p>
          <input type="hidden" name="answer" value="" />
        </>
      )}

      <SubmitButton
        pendingText="Submitting…"
        className="mt-1 self-start rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {format === "audio" ? "Mark as practiced" : "Submit answer"}
      </SubmitButton>
    </form>
  );
}
