"use client";

import Image from "next/image";
import Spark from "./Spark";
import Reveal from "./Reveal";
import { useT } from "./LanguageProvider";

/**
 * "Inside a live session" — a warm, AI-generated lifestyle image of a child in
 * a live 1:1 online lesson (no real student; resolves the privacy concern),
 * with light on-brand overlays. The same frame can hold a real clip/photo later.
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
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[860px] overflow-hidden rounded-[28px] border border-brand-100 shadow-ward-2 sm:aspect-video">
          <Image
            src="/session.jpg"
            alt={s.title}
            fill
            sizes="(max-width: 880px) 100vw, 860px"
            className="object-cover"
          />

          {/* soft scrim for overlay legibility */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />

          {/* LIVE badge */}
          <span className="absolute start-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-300 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
            </span>
            {s.live}
          </span>

          {/* lesson caption */}
          <div className="absolute bottom-4 start-4 max-w-[64%] rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-ward-1 backdrop-blur">
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
