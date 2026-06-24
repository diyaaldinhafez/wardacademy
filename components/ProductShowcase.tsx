"use client";

import Icon from "./Icon";
import Reveal from "./Reveal";
import { useLandingMessages } from "./landingMessages";

/**
 * "A peek inside" — the parent app and the student app, designed as detailed,
 * on-brand mockups (based on the Claude Design references). First names only,
 * no full names. Bilingual via the screens copy in content.ts / i18n.ts.
 */
export default function ProductShowcase() {
  const L = useLandingMessages();
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
                <div className={`flex justify-center ${reversed ? "lg:order-2" : ""}`}>
                  <PhoneFrame>{i === 0 ? <ParentScreen /> : <StudentScreen />}</PhoneFrame>
                </div>
                <div className={`flex flex-col gap-4 ${reversed ? "lg:order-1" : ""}`}>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                    {item.tag}
                  </span>
                  <h3 className="font-display text-[22px] font-bold leading-snug text-ink">{item.title}</h3>
                  <p className="text-[15px] leading-[1.8] text-ink-soft">{item.desc}</p>
                  <ul className="grid gap-2.5">
                    {item.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[14px] font-medium text-ink">
                        <Check />
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

/* ---- shared bits ----------------------------------------------------- */

function Check() {
  return (
    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
      <svg width="11" height="11" viewBox="0 0 13 13" aria-hidden>
        <path d="M2.5 7l3 3 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-[290px]">
      <div className="overflow-hidden rounded-[36px] border-[7px] border-ink/85 bg-white shadow-ward-2">
        <div className="relative">
          <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/20" />
          {children}
        </div>
      </div>
    </div>
  );
}

function Sprout() {
  return (
    <svg width="10" height="12" viewBox="0 0 12 14" aria-hidden className="text-amber-500">
      <path d="M6 13V6.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M6 7.5C3.2 7.5 2 5.6 2 3.4 4.8 3.4 6 5.3 6 7.5Z" fill="currentColor" />
      <path d="M6 8.5C8.8 8.5 10 6.6 10 4.4 7.2 4.4 6 6.3 6 8.5Z" fill="currentColor" />
    </svg>
  );
}

function StreakPill({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-600">
      <Sprout />
      {label}
    </span>
  );
}

function Medal() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-ward-1">
      <Icon name="star" className="h-4 w-4 fill-current" stroke="none" />
    </span>
  );
}

function MiniBloom({ className = "h-14 w-14" }: { className?: string }) {
  const PETAL =
    "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
  const vals = [0.95, 0.7, 0.82, 0.6, 1];
  return (
    <svg viewBox="0 0 100 100" className={`shrink-0 ${className}`} aria-hidden>
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

/* ---- Parent app ------------------------------------------------------ */

function ParentScreen() {
  const p = useLandingMessages().screens.parent;
  return (
    <div className="grid gap-3 bg-gradient-to-b from-brand-50/70 to-white p-3.5 pt-7 text-start">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-display text-[16px] font-bold text-ink">{p.greeting}</h4>
          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{p.approved}</p>
        </div>
        <Medal />
      </div>

      <div className="flex gap-2">
        <ChildTab name={p.tabs[0]} active />
        <ChildTab name={p.tabs[1]} />
      </div>

      <div className="rounded-2xl border border-ink/8 bg-white p-3.5 shadow-ward-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <b className="font-display text-[14px] font-bold text-ink">{p.tabs[0]}</b>
            <div className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{p.childSeason}</div>
            <div className="text-[10.5px] leading-snug text-ink-muted">{p.childTeacher}</div>
          </div>
          <StreakPill label={p.streak} />
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold text-brand-700">
          <Icon name="clock" className="h-3 w-3" />
          {p.nextLabel} · {p.nextWhen}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-soft">{p.note}</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-brand-50/60 p-3">
        <MiniBloom className="h-12 w-12" />
        <div className="flex-1">
          <b className="block text-[12px] font-bold text-ink">{p.reportTag}</b>
          <span className="text-[10.5px] text-ink-muted">{p.reportWeek}</span>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[10.5px] font-bold text-brand-700 shadow-ward-1">{p.reportCta}</span>
      </div>
    </div>
  );
}

function ChildTab({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        active ? "border-brand bg-white text-brand-700" : "border-ink/10 bg-white/60 text-ink-muted"
      }`}
    >
      <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-100 text-[8px] font-bold text-brand-700">
        {name.charAt(0)}
      </span>
      {name}
    </span>
  );
}

/* ---- Student app ----------------------------------------------------- */

function StudentScreen() {
  const s = useLandingMessages().screens.student;
  return (
    <div className="grid gap-3 bg-gradient-to-b from-brand-50/70 to-white p-3.5 pt-7 text-start">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-display text-[16px] font-bold text-ink">{s.greeting}</h4>
          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-muted">{s.next}</p>
        </div>
        <Medal />
      </div>

      {/* the quest card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-3.5 text-white shadow-ward-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">
          <Icon name="check" className="h-2.5 w-2.5" />
          {s.questFrom}
        </span>
        <b className="mt-2 block font-display text-[15px] font-bold leading-snug">{s.questTitle}</b>
        <p className="mt-1 text-[11px] leading-snug text-brand-100">{s.questDesc}</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="ms-1 text-[10px] font-bold text-brand-100">{s.questStep}</span>
        </div>
        <span className="mt-3 block rounded-full bg-amber py-2 text-center text-[12px] font-bold text-brand-900">
          {s.questCta}
        </span>
      </div>

      {/* skill flower */}
      <div className="rounded-2xl border border-ink/8 bg-white p-3">
        <div className="flex items-center gap-3">
          <MiniBloom className="h-12 w-12" />
          <div className="flex-1">
            <b className="block text-[12px] font-bold text-ink">{s.flowerTitle}</b>
            <p className="text-[10.5px] leading-snug text-ink-muted">{s.flowerDesc}</p>
          </div>
        </div>
        <div className="mt-2">
          <StreakPill label={s.streak} />
        </div>
      </div>

      {/* more quests */}
      <div>
        <b className="text-[11px] font-bold text-ink">{s.moreTitle}</b>
        <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl border border-ink/8 bg-white p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50">
            <svg viewBox="0 0 40 52" width="14" height="18" aria-hidden>
              <path d="M20,50 C8,46 0,34 3,21 C5,10 12,4 20,0 C28,4 35,10 37,21 C40,34 32,46 20,50 Z" fill="#7F55D9" />
            </svg>
          </span>
          <div className="flex-1">
            <b className="block text-[11.5px] font-bold text-ink">{s.moreItem}</b>
            <span className="text-[10px] text-ink-muted">{s.moreNote}</span>
          </div>
          <span className="rounded-full bg-cream px-2 py-1 text-[9px] font-bold text-ink-muted">{s.moreWhen}</span>
        </div>
      </div>
    </div>
  );
}
