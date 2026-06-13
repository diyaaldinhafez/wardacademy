"use client";

import { useState } from "react";
import Icon from "./Icon";
import FlowerMark from "./FlowerMark";
import Reveal from "./Reveal";
import { useT } from "./LanguageProvider";

/**
 * Video / product tour. Styled poster + play button, ready to wire a real
 * video. Visual only for now: pressing play reveals a gentle "coming soon"
 * note instead of a fabricated clip. Swap the poster body for a <video>/embed.
 */
export default function VideoSection() {
  const L = useT().landing;
  const v = L.video;
  const [pressed, setPressed] = useState(false);

  return (
    <section id="tour" className="mx-auto w-full max-w-[1080px] px-6 pt-16">
      <Reveal className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
          {v.tag}
        </span>
        <h2 className="mt-3 font-display text-[28px] font-bold text-ink">{v.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">{v.sub}</p>
      </Reveal>

      <Reveal delay={80} className="mt-8">
        <button
          type="button"
          onClick={() => setPressed(true)}
          aria-label={v.cta}
          className="group relative block aspect-video w-full overflow-hidden rounded-[28px] border border-brand-100 shadow-ward-2"
        >
          {/* poster */}
          <span
            className="absolute inset-0"
            style={{ backgroundImage: "linear-gradient(135deg,#9f7de7 0%,#6840bd 100%)" }}
          />
          <FlowerMark className="absolute -bottom-10 -end-8 h-56 w-56 opacity-15" title="" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 shadow-ward-2 transition-transform group-hover:scale-105">
              {/* play triangle */}
              <svg width="26" height="26" viewBox="0 0 24 24" className="ms-1 text-brand" aria-hidden>
                <path d="M7 5l12 7-12 7z" fill="currentColor" />
              </svg>
            </span>
          </span>
          <span className="absolute bottom-4 start-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {v.duration}
          </span>
          {pressed && (
            <span className="absolute bottom-4 end-5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-brand-700">
              {L.showcase.comingSoon}
            </span>
          )}
        </button>
      </Reveal>
    </section>
  );
}
