"use client";

import Icon from "./Icon";
import Reveal from "./Reveal";
import { useLandingMessages } from "./landingMessages";

/**
 * The Bloom Report — the brand's signature progress visual, shown as the
 * parent's living dashboard. Each of the five petals grows with a skill's
 * mastery, so the flower literally blooms as the child progresses.
 * Built for real (on-brand), modelled on the Claude Design skill-flower ref.
 */
const PETAL =
  "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";

function Sprout() {
  return (
    <svg width="11" height="13" viewBox="0 0 12 14" aria-hidden className="text-amber-500">
      <path d="M6 13V6.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M6 7.5C3.2 7.5 2 5.6 2 3.4 4.8 3.4 6 5.3 6 7.5Z" fill="currentColor" />
      <path d="M6 8.5C8.8 8.5 10 6.6 10 4.4 7.2 4.4 6 6.3 6 8.5Z" fill="currentColor" />
    </svg>
  );
}

export default function BloomReport() {
  const L = useLandingMessages();
  const r = L.bloomReport;
  const overall = Math.round(
    r.skills.reduce((sum, s) => sum + s.value, 0) / r.skills.length,
  );

  return (
    <section id="bloom" className="mx-auto w-full max-w-[1080px] px-6 pt-16">
      <Reveal className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
          {r.tag}
        </span>
        <h2 className="mt-3 font-display text-[28px] font-bold text-ink">{r.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">{r.sub}</p>
      </Reveal>

      <Reveal delay={80} className="mt-8">
        <div className="overflow-hidden rounded-[28px] border border-ink/8 bg-white shadow-ward-2">
          {/* dashboard chrome */}
          <div className="flex items-center justify-between border-b border-ink/8 bg-brand-50/50 px-5 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              <Icon name="lock" className="h-3.5 w-3.5" />
              account · {r.tag}
            </span>
            <span className="w-10" aria-hidden />
          </div>

          <div className="grid items-center gap-8 p-7 sm:p-9 lg:grid-cols-[0.85fr_1.15fr]">
            {/* the blooming flower */}
            <div className="relative mx-auto grid aspect-square w-full max-w-[280px] place-items-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(circle at 50% 45%, rgba(127,85,217,0.10), transparent 65%)" }}
                aria-hidden
              />
              <svg viewBox="0 0 100 100" className="w-[78%]" role="img" aria-label={r.title}>
                <defs>
                  <linearGradient id="br-petal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#9F7DE7" />
                    <stop offset="1" stopColor="#6840BD" />
                  </linearGradient>
                </defs>
                {r.skills.map((s, i) => {
                  const scale = 0.6 + (s.value / 100) * 0.4;
                  const opacity = 0.4 + (s.value / 100) * 0.6;
                  return (
                    <g key={s.name} transform={`rotate(${i * 72} 50 50)`}>
                      <path
                        d={PETAL}
                        fill="url(#br-petal)"
                        style={{
                          transformBox: "fill-box",
                          transformOrigin: "50% 100%",
                          transform: `scale(${scale})`,
                          opacity,
                        }}
                      />
                    </g>
                  );
                })}
                <circle cx="50" cy="50" r="10" fill="#F3EDFF" />
                <circle cx="50" cy="50" r="4" fill="#7F55D9" />
              </svg>
              <div className="absolute bottom-0 inline-flex items-center gap-1.5 rounded-full border border-ink/8 bg-white px-3 py-1.5 shadow-ward-1">
                <span className="font-display text-base font-bold text-brand-700">{overall}%</span>
              </div>
            </div>

            {/* skill bars + tags */}
            <div className="grid gap-3.5">
              {r.skills.map((s, i) => (
                <Reveal key={s.name} delay={i * 70} className="flex items-center gap-3">
                  <span className="flex w-24 shrink-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand" style={{ opacity: 0.45 + (s.value / 100) * 0.55 }} />
                    <span className="text-[13px] font-bold text-ink">{s.name}</span>
                  </span>
                  <span className="h-2.5 flex-1 rounded-full bg-brand-100">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${s.value}%`, background: "linear-gradient(90deg,#9f7de7,#6840bd)" }}
                    />
                  </span>
                  <span className="min-w-[4.5rem] shrink-0 whitespace-nowrap text-end text-[12px] font-bold text-brand-700">
                    {s.tag}
                  </span>
                </Reveal>
              ))}

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                  <Sprout />
                  {r.streak}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                  <Icon name="star" className="h-3 w-3 fill-current" stroke="none" />
                  {r.season}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                  <Icon name="check" className="h-3.5 w-3.5 text-leaf" />
                  {r.note}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
