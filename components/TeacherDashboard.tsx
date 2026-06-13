"use client";

import FlowerMark from "./FlowerMark";
import Spark from "./Spark";
import Icon from "./Icon";
import { useT } from "./LanguageProvider";

/**
 * Teacher dashboard mockup (browser frame), modelled on the Claude Design ref.
 * Lives inside the AI section: it shows where AI lives — the teacher's review
 * queue — with the key trust line "nothing reaches the student before you
 * approve". AI proposes (dashed + spark drafts); the teacher disposes.
 * First names only.
 */
export default function TeacherDashboard() {
  const tr = useT().landing.screens.teacher;
  const brand = useT().landing.brand;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-ward-2">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-ink/8 bg-cream/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="mx-auto rounded-md bg-white px-3 py-1 text-[11px] font-medium text-ink-faint">
          ward.academy/teacher
        </span>
      </div>

      <div className="grid bg-cream/30 text-start sm:grid-cols-[150px_1fr]">
        {/* sidebar */}
        <aside className="hidden border-e border-ink/8 bg-white p-3 sm:block">
          <div className="mb-4 flex items-center gap-2">
            <FlowerMark className="h-6 w-6" title="" />
            <b className="font-display text-[12px] text-brand-800">{brand}</b>
          </div>
          <nav className="grid gap-1">
            {tr.nav.map((n, i) => (
              <span
                key={n}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                  i === 1 ? "bg-brand-50 text-brand-700" : "text-ink-soft"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {i === 1 && <Spark gradient className="h-3 w-3" />}
                  {n}
                </span>
                {i === 1 && (
                  <span className="rounded-full bg-brand px-1.5 text-[9px] font-bold text-white">3</span>
                )}
              </span>
            ))}
          </nav>
        </aside>

        {/* main */}
        <div className="grid gap-3 p-4">
          {/* awaiting review — the AI-approval trust panel */}
          <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-3.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Spark gradient className="h-4 w-4" />
              <b className="text-[13px] font-bold text-ink">{tr.reviewTitle}</b>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink-muted sm:ms-auto">
                <Icon name="lock" className="h-3 w-3" />
                {tr.reviewNote}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {tr.reviewItems.map((it) => (
                <div key={it.t} className="rounded-xl border border-dashed border-brand-300 bg-white p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Spark gradient className="h-3 w-3" />
                    <b className="text-[10.5px] font-bold leading-tight text-ink">{it.t}</b>
                  </div>
                  <div className="mt-0.5 text-[9.5px] text-ink-muted">{it.s}</div>
                  <span className="mt-2 block rounded-full bg-brand-100 py-1 text-center text-[9.5px] font-bold text-brand-700">
                    {tr.reviewCta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* today's sessions */}
          <div className="rounded-2xl border border-ink/8 bg-white p-3.5">
            <b className="text-[13px] font-bold text-ink">{tr.todayTitle}</b>
            <div className="mt-2 grid gap-2">
              {tr.sessions.map((se, i) => (
                <div key={se.name} className="flex items-center gap-3 rounded-xl border border-ink/6 bg-cream/40 p-2">
                  <span className="font-display text-[12px] font-bold text-brand-700">{se.time}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                    {se.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[11px] font-bold text-ink">{se.name}</b>
                    <span className="block truncate text-[9.5px] text-ink-muted">{se.detail}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold ${
                      i === 0 ? "bg-brand text-white" : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {se.cta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
