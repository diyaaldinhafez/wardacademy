"use client";

import { useEffect, useState } from "react";
import { enroll } from "@/lib/content";
import Icon from "./Icon";
import Spark from "./Spark";
import ShareRow from "./ShareRow";

/**
 * VISUAL ONLY placement test. The "personalized AI generation" is a simulated
 * loading step; questions come from a fixed bank in content. Nothing is graded
 * on a server or stored. Renders its own content (no outer card).
 */
type Phase = "preparing" | "intro" | "quiz" | "result";

export default function PlacementTest({
  name,
  shareUrl,
}: {
  name?: string;
  shareUrl: string;
}) {
  const t = enroll.test;
  const [phase, setPhase] = useState<Phase>("preparing");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    t.questions.map(() => null),
  );

  useEffect(() => {
    if (phase !== "preparing") return;
    const id = setTimeout(() => setPhase("intro"), 1600);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === "preparing") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Spark className="animate-spin-slow h-12 w-12 text-brand" />
        <h3 className="mt-5 font-display text-xl font-bold text-ink">
          {t.preparingTitle}
        </h3>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">{t.preparingNote}</p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <h3 className="font-display text-2xl font-bold text-ink">{t.greeting(name)}</h3>
        <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">{t.intro}</p>
        <button
          type="button"
          onClick={() => setPhase("quiz")}
          className="brand-gradient mt-7 inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
        >
          {t.start}
          <Icon name="arrow-right" className="h-5 w-5" />
        </button>
      </div>
    );
  }

  if (phase === "result") {
    const score = answers.reduce<number>(
      (sum, a, i) => (a === t.questions[i].answer ? sum + 1 : sum),
      0,
    );
    const band = enroll.result.bands.find((b) => score >= b.min)!;
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand">
          <Spark className="h-8 w-8" />
        </span>
        <h3 className="mt-5 font-display text-2xl font-bold text-ink">{band.title}</h3>

        <div className="mt-6 grid w-full max-w-sm gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink/5 bg-cream/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {enroll.result.scoreLabel}
            </div>
            <div className="mt-1 font-display text-3xl font-bold text-brand">
              {score}<span className="text-xl text-ink-faint"> / {t.questions.length}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-ink/5 bg-cream/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {enroll.result.levelLabel}
            </div>
            <div className="mt-1 font-display text-lg font-bold text-ink">{band.level}</div>
          </div>
        </div>

        <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
          {enroll.result.teacherNote}
        </p>

        <div className="mt-6 w-full max-w-md">
          <p className="mb-2 text-sm font-semibold text-ink">{enroll.result.shareHeading}</p>
          <ShareRow url={shareUrl} message={enroll.share.resultMessage} />
        </div>
      </div>
    );
  }

  // phase === "quiz"
  const total = t.questions.length;
  const question = t.questions[qIndex];
  const picked = answers[qIndex];
  const last = qIndex === total - 1;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl bg-cream/70 p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand">
            <Spark className="h-3 w-3" />
            {question.kind}
          </span>
          <span className="text-xs font-semibold text-ink-muted">
            {t.questionOf(qIndex + 1, total)}
          </span>
        </div>
        <p className="mt-3 font-display text-lg font-bold text-ink">{question.q}</p>

        <div className="mt-4 grid gap-2.5">
          {question.options.map((opt, i) => {
            const isPicked = picked === i;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswers((a) => a.map((v, idx) => (idx === qIndex ? i : v)))}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-medium transition-all ${
                  isPicked
                    ? "border-brand bg-brand-50 text-brand"
                    : "border-ink/12 bg-white text-ink hover:border-brand/40"
                }`}
              >
                {opt}
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${isPicked ? "border-brand bg-brand text-white" : "border-ink/25"}`}>
                  {isPicked && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* progress dots */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {t.questions.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === qIndex ? "w-6 bg-brand" : i < qIndex ? "w-2 bg-brand/50" : "w-2 bg-ink/15"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        {qIndex > 0 && (
          <button
            type="button"
            onClick={() => setQIndex((i) => i - 1)}
            className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/30 hover:text-brand"
          >
            {enroll.back}
          </button>
        )}
        <button
          type="button"
          disabled={picked === null}
          onClick={() => (last ? setPhase("result") : setQIndex((i) => i + 1))}
          className="brand-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {last ? t.finish : t.next}
          <Icon name="arrow-right" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
