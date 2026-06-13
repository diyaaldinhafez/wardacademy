"use client";

import FlowerMark from "./FlowerMark";
import Spark from "./Spark";
import Icon from "./Icon";
import Reveal from "./Reveal";
import { useT } from "./LanguageProvider";

/**
 * "Inside a live session" — a calm, on-brand mockup of the 1:1 video session
 * (replaces a video we don't have yet). Faces are abstract for privacy, first
 * names only. The same frame is ready to hold a real clip later.
 */
export default function SessionScene() {
  const s = useT().landing.session;
  return (
    <section id="tour" className="mx-auto w-full max-w-[1080px] px-6 pt-16">
      <Reveal className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
          {s.tag}
        </span>
        <h2 className="mt-3 font-display text-[28px] font-bold text-ink">{s.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">{s.sub}</p>
      </Reveal>

      <Reveal delay={80} className="mt-8">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[860px] overflow-hidden rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-400 to-brand-600 shadow-ward-2 sm:aspect-video">
          {/* subtle flower watermark */}
          <FlowerMark className="absolute -end-8 -top-8 h-40 w-40 opacity-[0.12]" title="" />

          {/* teacher (main tile), in the upper area */}
          <div className="absolute inset-x-0 top-0 grid h-[62%] place-items-center">
            <div className="flex flex-col items-center gap-3 text-white">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 ring-1 ring-white/20 sm:h-24 sm:w-24">
                <Icon name="teacher" className="h-10 w-10 text-white/90 sm:h-11 sm:w-11" />
              </span>
              <b className="font-display text-lg font-bold">{s.teacher}</b>
            </div>
          </div>

          {/* LIVE badge */}
          <span className="absolute start-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-300 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
            </span>
            {s.live}
          </span>

          {/* child tile */}
          <div className="absolute bottom-4 end-4 grid h-24 w-[72px] place-items-center gap-1 rounded-2xl border border-white/30 bg-white/90 shadow-ward-1 sm:w-20">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="user" className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-bold text-ink">{s.student}</span>
          </div>

          {/* lesson caption */}
          <div className="absolute bottom-4 start-4 max-w-[58%] rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-ward-1">
            <div className="flex items-center gap-1.5">
              <Spark gradient className="h-3.5 w-3.5" />
              <b className="text-[11px] font-bold text-brand-700">{s.skill}</b>
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ink">{s.caption}</p>
          </div>
        </div>
      </Reveal>

      <p className="mt-3 text-center text-xs text-ink-muted">{s.note}</p>
    </section>
  );
}
