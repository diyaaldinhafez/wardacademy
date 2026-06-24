"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitLeadTest } from "@/app/t/actions";
import FlowerMark from "./FlowerMark";
import BudMark from "./BudMark";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Q = { id: string; prompt: string; content: any };

export default function LeadTestForm({ token, questions }: { token: string; questions: Q[] }) {
  const t = useTranslations("placement");
  const [state, action, pending] = useActionState(submitLeadTest, undefined);

  if (state?.result) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-ward-1">
        <FlowerMark className="mx-auto h-12 w-12" />
        <h2 className="mt-3 text-xl font-bold text-ink">{t("doneTitle")} <BudMark size={22} /></h2>
        <p className="mt-3 text-ink">
          {t("suggestedLevel")} <span className="text-2xl font-bold text-brand-700">{state.result.level}</span>
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {t("resultScore", { correct: state.result.correct, total: state.result.total })}
        </p>
        <p className="mt-3 text-sm text-ink-soft">{t("resultNote")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-3xl border border-brand-100 bg-cream/40 p-6 shadow-ward-1">
      <input type="hidden" name="token" value={token} />
      <p className="mb-4 text-sm text-ink-soft">{t("instruction")}</p>
      <div className="flex flex-col gap-5">
        {questions.map((q, idx) => (
          <div key={q.id}>
            <p className="font-medium text-ink" dir="ltr">
              {idx + 1}. {q.prompt}
            </p>
            <div className="mt-2 flex flex-col gap-1.5" dir="ltr">
              {((q.content?.options ?? []) as string[]).map((o, j) => (
                <label key={j} className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
                  <input type="radio" name={`q_${q.id}`} value={o} required className="h-4 w-4 accent-[#7F55D9]" />
                  <span className="text-ink">{o}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {state?.error && <p className="mt-4 text-sm font-semibold text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-leaf px-6 font-semibold text-white shadow-ward-1 transition-all hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
      >
        {pending ? t("grading") : t("submit")}
      </button>
    </form>
  );
}
