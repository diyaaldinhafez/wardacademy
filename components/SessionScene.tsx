"use client";

import Image from "next/image";
import Reveal from "./Reveal";
import { useT } from "./LanguageProvider";

/**
 * "Inside a live session" — a look at the actual lesson screen (flashcards, the
 * teacher and student tiles, the session toolbar). First names only. The image
 * is self-contained, so it's shown clean in a simple framed card.
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
        <div className="mx-auto max-w-[920px] overflow-hidden rounded-[24px] border border-ink/8 bg-white shadow-ward-2">
          <Image
            src="/session.jpg"
            alt={s.title}
            width={1720}
            height={960}
            sizes="(max-width: 940px) 100vw, 920px"
            className="h-auto w-full"
          />
        </div>
      </Reveal>

      <p className="mt-3 text-center text-xs text-ink-muted">{s.note}</p>
    </section>
  );
}
