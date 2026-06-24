"use client";

import Reveal from "./Reveal";
import { useLandingMessages } from "./landingMessages";

/**
 * Outcomes band — calm social-proof stats (placeholder figures for now).
 * Soft gradient panel, bento-style grid.
 */
export default function Outcomes() {
  const L = useLandingMessages();
  const o = L.outcomes;
  return (
    <section id="outcomes" className="mx-auto w-full max-w-[1080px] px-6 pt-16">
      <Reveal>
        <div className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 to-white px-7 py-10 sm:px-10">
          <div className="text-center">
            <h2 className="font-display text-[26px] font-bold text-ink">{o.title}</h2>
            <p className="mx-auto mt-2.5 max-w-[56ch] text-[15px] leading-[1.7] text-ink-soft">{o.sub}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {o.stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 70} className="rounded-2xl border border-ink/8 bg-white p-5 text-center shadow-ward-1">
                <div className="font-display text-[32px] font-bold leading-none text-brand-700">{stat.value}</div>
                <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
