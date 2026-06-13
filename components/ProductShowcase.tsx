"use client";

import FlowerMark from "./FlowerMark";
import Spark from "./Spark";
import Icon from "./Icon";
import Reveal from "./Reveal";
import { useT } from "./LanguageProvider";

/**
 * "A peek inside" — the parent dashboard and the student session, shown in
 * tasteful device frames. The screens are polished on-brand PLACEHOLDERS
 * (skeleton previews); drop real screenshots into <ParentScreen/StudentScreen>
 * (replace the placeholder body with <Image .../>) when they're ready.
 */
export default function ProductShowcase() {
  const L = useT().landing;
  const s = L.showcase;

  return (
    <section id="inside" className="mx-auto w-full max-w-[1080px] px-6 pt-16">
      <Reveal className="text-center">
        <h2 className="font-display text-[28px] font-bold text-ink">{s.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">{s.sub}</p>
      </Reveal>

      <div className="mt-10 grid gap-12">
        {s.items.map((item, i) => {
          const reversed = i % 2 === 1;
          return (
            <Reveal key={item.title}>
              <div className="grid items-center gap-8 lg:grid-cols-2">
                {/* device */}
                <div className={reversed ? "lg:order-2" : ""}>
                  {i === 0 ? (
                    <BrowserFrame label={s.previewLabel}>
                      <ParentScreen previewLabel={s.previewLabel} comingSoon={s.comingSoon} />
                    </BrowserFrame>
                  ) : (
                    <PhoneFrame label={s.previewLabel}>
                      <StudentScreen comingSoon={s.comingSoon} />
                    </PhoneFrame>
                  )}
                </div>

                {/* copy */}
                <div className={`flex flex-col gap-4 ${reversed ? "lg:order-1" : ""}`}>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                    {item.tag}
                  </span>
                  <h3 className="font-display text-[22px] font-bold leading-snug text-ink">{item.title}</h3>
                  <p className="text-[15px] leading-[1.8] text-ink-soft">{item.desc}</p>
                  <ul className="grid gap-2.5">
                    {item.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[14px] font-medium text-ink">
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
                          <svg width="11" height="11" viewBox="0 0 13 13" aria-hidden>
                            <path d="M2.5 7l3 3 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---- Frames ---------------------------------------------------------- */

function BrowserFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-ward-2">
      <div className="flex items-center gap-2 border-b border-ink/8 bg-cream/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        <span className="mx-auto rounded-md bg-white px-3 py-1 text-[11px] font-medium text-ink-faint">
          ward.academy/parent
        </span>
        <PreviewTag label={label} />
      </div>
      {children}
    </div>
  );
}

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <PreviewTag label={label} className="absolute end-2 top-3 z-10" />
      <div className="overflow-hidden rounded-[34px] border-[6px] border-ink/85 bg-white shadow-ward-2">
        <div className="relative">
          <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/20" />
          {children}
        </div>
      </div>
    </div>
  );
}

function PreviewTag({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-brand/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${className}`}>
      {label}
    </span>
  );
}

/* ---- Placeholder screens (swap for real screenshots) ----------------- */

function SkeletonLine({ w = "100%" }: { w?: string }) {
  return <span className="block h-2.5 rounded-full bg-ink/10" style={{ width: w }} />;
}

function ParentScreen({ comingSoon }: { previewLabel: string; comingSoon: string }) {
  return (
    <div className="relative grid gap-4 bg-gradient-to-br from-brand-50/70 to-white p-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <FlowerMark className="h-8 w-8" title="" />
        <div className="grid flex-1 gap-1.5">
          <SkeletonLine w="42%" />
          <SkeletonLine w="26%" />
        </div>
        <span className="rounded-full bg-leaf/15 px-2.5 py-1 text-[10px] font-bold text-leaf">on track</span>
      </div>
      {/* bloom + stat cards */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-ink/8 bg-white p-4">
        <MiniBloom />
        <div className="grid gap-2.5">
          {[80, 60, 72].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2 flex-1 rounded-full bg-brand-100">
                <span className="block h-full rounded-full bg-gradient-to-r from-brand-300 to-brand" style={{ width: `${w}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* session report row */}
      <div className="grid gap-2 rounded-2xl border border-ink/8 bg-white p-4">
        <div className="flex items-center justify-between">
          <SkeletonLine w="38%" />
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold text-brand-700">report</span>
        </div>
        <SkeletonLine w="90%" />
        <SkeletonLine w="64%" />
      </div>
      <span className="mx-auto text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{comingSoon}</span>
    </div>
  );
}

function StudentScreen({ comingSoon }: { comingSoon: string }) {
  return (
    <div className="grid gap-3 bg-gradient-to-b from-brand-50/70 to-white p-3 pt-6">
      {/* teacher video tile */}
      <div className="relative grid h-32 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600">
        <Icon name="teacher" className="h-10 w-10 text-white/85" />
        <span className="absolute bottom-2 end-2 grid h-10 w-8 place-items-center rounded-lg bg-white/90 text-brand">
          <Icon name="user" className="h-5 w-5" />
        </span>
        <span className="absolute bottom-2 start-2 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-bold text-white">live · 1:1</span>
      </div>
      {/* exercise card */}
      <div className="grid gap-2 rounded-2xl border border-ink/8 bg-white p-3">
        <div className="flex items-center gap-1.5">
          <Spark gradient className="h-3.5 w-3.5" />
          <SkeletonLine w="50%" />
        </div>
        <SkeletonLine w="92%" />
        <div className="mt-1 grid grid-cols-2 gap-2">
          <span className="h-8 rounded-xl bg-brand-50" />
          <span className="h-8 rounded-xl bg-brand-100" />
        </div>
      </div>
      <span className="mx-auto pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{comingSoon}</span>
    </div>
  );
}

function MiniBloom() {
  const PETAL =
    "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
  const vals = [0.92, 0.7, 0.8, 0.6, 1];
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16" aria-hidden>
      <defs>
        <linearGradient id="ms-petal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9F7DE7" />
          <stop offset="1" stopColor="#6840BD" />
        </linearGradient>
      </defs>
      {vals.map((v, i) => (
        <g key={i} transform={`rotate(${i * 72} 50 50)`}>
          <path
            d={PETAL}
            fill="url(#ms-petal)"
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: `scale(${v})`, opacity: 0.5 + v * 0.5 }}
          />
        </g>
      ))}
      <circle cx="50" cy="50" r="9" fill="#F3EDFF" />
      <circle cx="50" cy="50" r="3.5" fill="#7F55D9" />
    </svg>
  );
}
