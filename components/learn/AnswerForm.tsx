"use client";

import { submitAnswer } from "@/app/learn/actions";
import SubmitButton from "@/components/studio/SubmitButton";

const opt =
  "flex cursor-pointer items-center gap-2 rounded-xl border border-brand-100 bg-cream/50 px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50";
const radio = "h-4 w-4 accent-[#7F55D9]";
const field = "rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400";

// Labels are passed in (forced `en` from the page) — the child surface is
// English-pure, so this component never reads the global locale.
export type AnswerLabels = {
  trueLabel: string;
  falseLabel: string;
  placeholder: string;
  audioHint: string;
  audioDone: string;
  send: string;
  sending: string;
};

export default function AnswerForm({
  itemId,
  format,
  options,
  labels,
}: {
  itemId: string;
  format: string;
  options?: string[];
  labels: AnswerLabels;
}) {
  return (
    <form action={submitAnswer} className="mt-3 flex flex-col gap-2" dir="ltr">
      <input type="hidden" name="itemId" value={itemId} />

      {format === "multiple_choice" && (
        <div className="flex flex-col gap-1.5" dir="ltr">
          {(options ?? []).map((o, i) => (
            <label key={i} className={opt}>
              <input type="radio" name="answer" value={o} required className={radio} /> {o}
            </label>
          ))}
        </div>
      )}

      {format === "true_false" && (
        <div className="flex gap-2">
          {[
            ["true", labels.trueLabel],
            ["false", labels.falseLabel],
          ].map(([v, label]) => (
            <label key={v} className={`${opt} flex-1`}>
              <input type="radio" name="answer" value={v} required className={radio} /> {label}
            </label>
          ))}
        </div>
      )}

      {format === "fill_blank" && <input name="answer" required placeholder={labels.placeholder} dir="ltr" className={field} />}

      {(format === "open" || format === "matching") && (
        <textarea name="answer" required rows={3} placeholder={labels.placeholder} dir="ltr" className={field} />
      )}

      {format === "audio" && (
        <>
          <p className="text-sm text-ink-soft">{labels.audioHint}</p>
          <input type="hidden" name="answer" value="" />
        </>
      )}

      <SubmitButton
        pendingText={labels.sending}
        className="mt-1 inline-flex h-10 items-center justify-center self-start rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-ward-1 hover:bg-brand-600 disabled:opacity-60"
      >
        {format === "audio" ? labels.audioDone : labels.send}
      </SubmitButton>
    </form>
  );
}
