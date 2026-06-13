"use client";

import { useState } from "react";
import Link from "next/link";
import FlowerMark from "./FlowerMark";
import HeroBloom from "./HeroBloom";
import Spark from "./Spark";
import Icon from "./Icon";
import Button from "./ui/Button";
import LangToggle from "./LangToggle";
import { useT, useLang } from "./LanguageProvider";

const ENROLL = "/enroll";
const NAV_HREFS = ["#how", "#pricing", "#faq"];

/* Single purple petal (the five-skills mark) */
function Petal({ i }: { i: number }) {
  return (
    <svg
      viewBox="0 0 40 52"
      width="26"
      height="34"
      aria-hidden
      style={{ transform: `rotate(${(i - 2) * 14}deg)`, opacity: 0.55 + i * 0.1 }}
    >
      <path
        d="M20,50 C8,46 0,34 3,21 C5,10 12,4 20,0 C28,4 35,10 37,21 C40,34 32,46 20,50 Z"
        fill="#7F55D9"
      />
    </svg>
  );
}

/* White flower for the final CTA (on the purple bloom gradient) */
function WhiteFlower() {
  const PETAL =
    "M50,50 C38,46 30,34 33,22 C35,12 42,6 50,2 C58,6 65,12 67,22 C70,34 62,46 50,50 Z";
  return (
    <svg viewBox="0 0 100 100" width="54" height="54" aria-hidden className="mx-auto">
      <g fill="#FFFFFF">
        {[0, 72, 144, 216, 288].map((d) => (
          <path key={d} d={PETAL} transform={`rotate(${d} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="9" fill="#C8ABFF" />
      <circle cx="50" cy="50" r="3.5" fill="#3D2371" />
    </svg>
  );
}

/* A small leaf-green check for pricing feature rows */
function FeatureCheck() {
  return (
    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
      <svg width="11" height="11" viewBox="0 0 13 13" aria-hidden>
        <path d="M2.5 7l3 3 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* Trust pills — the system's core pattern: AI draft = dashed violet capsule
   with the spark; teacher-approved = SOLID LEAF-GREEN capsule with a check. */
function TrustPill({ kind, children }: { kind: "draft" | "approved"; children: React.ReactNode }) {
  if (kind === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-brand-300 bg-[#F4EEFF] px-3.5 py-1.5 text-xs font-semibold text-brand-700">
        <Spark gradient className="h-3.5 w-3.5" />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-leaf bg-leaf px-3.5 py-1.5 text-xs font-semibold text-white">
      <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden>
        <path d="M2.5 7l3 3 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  );
}

export default function Landing() {
  const t = useT();
  const { lang } = useLang();
  const L = t.landing;
  const shell = "mx-auto w-full max-w-[1080px] px-6";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* ---- Nav ---- */}
      <div className={shell}>
        <nav className="flex items-center gap-5 py-4" aria-label="main">
          <Link href="#top" className="flex items-center gap-2.5" aria-label={L.brand}>
            <FlowerMark className="h-10 w-10" title="" />
            <b className="font-display text-[17px] text-brand-800">{L.brand}</b>
          </Link>

          <div className="ms-3 hidden gap-5 md:flex">
            {L.nav.map((n, i) => (
              <a key={n} href={NAV_HREFS[i]} className="text-sm font-semibold text-ink-soft transition-colors hover:text-brand">
                {n}
              </a>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-3">
            <LangToggle />
            <Link href="/login" className="hidden text-sm font-semibold text-ink-soft hover:text-brand sm:inline">
              {L.login}
            </Link>
            <div className="hidden sm:block">
              <Button href={ENROLL} size="sm">
                {L.cta}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand md:hidden"
              aria-label={menuOpen ? L.closeMenu : L.menu}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "close" : "menu"} className="h-6 w-6" />
            </button>
          </div>
        </nav>

        {/* ---- Mobile menu ---- */}
        {menuOpen && (
          <div className="mb-3 grid gap-1 rounded-2xl border border-ink/8 bg-white p-3 shadow-ward-2 md:hidden">
            {L.nav.map((n, i) => (
              <a
                key={n}
                href={NAV_HREFS[i]}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand"
              >
                {n}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand"
            >
              {L.login}
            </Link>
            <Button href={ENROLL} size="md" className="mt-1 w-full">
              {L.cta}
            </Button>
          </div>
        )}
      </div>

      {/* ---- Hero ---- */}
      <header id="top">
        <div className={shell}>
          <div className="grid items-center gap-10 rounded-b-[32px] bg-gradient-to-b from-brand-50 to-white py-12 sm:py-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-5 text-center lg:text-start lg:ps-10">
              <h1 className="font-display text-[clamp(28px,5.2vw,46px)] font-bold leading-[1.3] text-brand-900">
                {L.hero.title}
              </h1>
              <p className="mx-auto max-w-[52ch] text-[17px] leading-[1.8] text-ink-soft lg:mx-0">
                {L.hero.sub}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
                <Button href={ENROLL} variant="warm" size="lg">
                  {L.cta}
                </Button>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-600">
                  {L.hero.note}
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <HeroBloom className="h-44 w-44 drop-shadow-[0_8px_30px_rgba(127,85,217,0.25)] sm:h-56 sm:w-56" title="" />
            </div>
          </div>
        </div>
      </header>

      {/* ---- How it works ---- */}
      <section id="how" className={`${shell} pt-16`}>
        <h2 className="text-center font-display text-[28px] font-bold text-ink">{L.how.title}</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {L.how.steps.map((s, i) => (
            <div key={i} className="flex flex-col gap-2.5 rounded-2xl border border-ink/5 bg-white p-5 shadow-ward-1">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-display text-[15px] font-bold text-brand-700">
                {lang === "ar" ? ["١", "٢", "٣"][i] : i + 1}
              </span>
              <b className="text-[16.5px] font-bold text-ink">{s.t}</b>
              <span className="text-sm leading-[1.75] text-ink-soft">{s.d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Trust model: draft → approved ---- */}
      <section id="trust" className={`${shell} pt-16`}>
        <div className="rounded-[28px] bg-brand-50 px-8 py-10">
          <h2 className="flex items-center justify-center gap-2.5 text-center font-display text-[28px] font-bold text-ink">
            <Spark gradient className="h-6 w-6" />
            {L.trust.title}
          </h2>
          <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
            {L.trust.sub}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-7">
            <div className="flex flex-col items-center gap-2">
              <TrustPill kind="draft">{L.trust.draft}</TrustPill>
              <span className="text-xs text-ink-muted">{L.trust.draftCap}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <TrustPill kind="approved">{L.trust.approved}</TrustPill>
              <span className="text-xs text-ink-muted">{L.trust.approvedCap}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Five petals = five skills ---- */}
      <section id="skills" className={`${shell} pt-16`}>
        <h2 className="text-center font-display text-[28px] font-bold text-ink">{L.skills.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
          {L.skills.sub}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3.5">
          {L.skills.items.map((s, i) => (
            <div
              key={s}
              className="flex min-w-[116px] flex-col items-center gap-2 rounded-[18px] border border-ink/10 bg-white px-5 py-4 shadow-ward-1"
            >
              <Petal i={i} />
              <span className="text-[13.5px] font-bold text-ink">{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section id="pricing" className={`${shell} pt-16`}>
        <h2 className="text-center font-display text-[28px] font-bold text-ink">{L.pricing.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
          {L.pricing.sub}
        </p>
        <div className="mt-8 grid items-start gap-4 sm:grid-cols-3">
          {L.pricing.plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-[24px] p-6 ${
                p.featured
                  ? "bg-gradient-to-b from-brand-50 to-white shadow-ward-2 ring-2 ring-brand sm:-mt-3 sm:pb-8"
                  : "border border-ink/8 bg-white shadow-ward-1"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 start-6 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white shadow-ward-1">
                  <Spark className="h-3 w-3" />
                  {L.pricing.badge}
                </span>
              )}
              <b className="font-display text-lg font-bold text-ink">{p.name}</b>
              <div className="mt-2 flex items-end gap-1">
                <span className="font-display text-[34px] font-bold leading-none text-brand-700">{p.price}</span>
                <span className="pb-1 text-xs font-semibold text-ink-muted">{L.pricing.perMonth}</span>
              </div>
              <span className="mt-1 text-sm font-semibold text-ink-soft">{p.cadence}</span>

              <ul className="mt-5 grid gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-soft">
                    <FeatureCheck />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Button
                  href={ENROLL}
                  variant={p.featured ? "primary" : "soft"}
                  size="md"
                  className="w-full"
                >
                  {L.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs font-medium text-ink-muted">{L.pricing.note}</p>
      </section>

      {/* ---- Testimonials ---- */}
      <section id="reviews" className={`${shell} pt-16`}>
        <h2 className="text-center font-display text-[28px] font-bold text-ink">{L.testimonials.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
          {L.testimonials.sub}
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {L.testimonials.items.map((tm) => (
            <figure key={tm.name} className="flex flex-col gap-4 rounded-2xl border border-ink/8 bg-white p-6 shadow-ward-1">
              <div className="flex gap-0.5 text-amber-500" aria-hidden>
                {[0, 1, 2, 3, 4].map((s) => (
                  <Icon key={s} name="star" className="h-4 w-4 fill-current" stroke="none" />
                ))}
              </div>
              <blockquote className="text-[14.5px] leading-[1.85] text-ink-soft">“{tm.quote}”</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-display text-sm font-bold text-brand-700">
                  {tm.name.charAt(0)}
                </span>
                <span className="text-sm">
                  <b className="block font-bold text-ink">{tm.name}</b>
                  <span className="text-xs text-ink-muted">{tm.city}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section id="faq" className={`${shell} pt-16`}>
        <h2 className="text-center font-display text-[28px] font-bold text-ink">{L.faq.title}</h2>
        <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
          {L.faq.sub}
        </p>
        <div className="mx-auto mt-7 grid max-w-[760px] gap-3">
          {L.faq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-ink/8 bg-white px-5 shadow-ward-1 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-bold text-ink">
                {item.q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand transition-transform group-open:rotate-45">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M7 2v10M2 7h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="pb-5 pe-10 text-[14px] leading-[1.85] text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section id="final" className={`${shell} pt-16`}>
        <div className="rounded-[28px] bg-gradient-to-br from-brand-400 to-brand-600 px-8 py-11 text-center text-white">
          <WhiteFlower />
          <h2 className="mt-2.5 font-display text-[26px] font-bold text-white">{L.final.title}</h2>
          <p className="mx-auto mb-5 mt-2 max-w-[48ch] text-[15px] text-brand-100">{L.final.sub}</p>
          <Button href={ENROLL} variant="warm" size="lg">
            {L.cta}
          </Button>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mt-16 border-t border-ink/10">
        <div className={`${shell} grid gap-8 py-10 sm:grid-cols-[1.4fr_1fr_1fr]`}>
          <div className="flex flex-col gap-3">
            <Link href="#top" className="flex items-center gap-2.5" aria-label={L.brand}>
              <FlowerMark className="h-9 w-9" title="" />
              <b className="font-display text-[16px] text-brand-800">{L.brand}</b>
            </Link>
            <p className="max-w-[34ch] text-[13.5px] leading-relaxed text-ink-muted">{L.footer.tagline}</p>
          </div>

          <nav className="flex flex-col gap-2.5" aria-label="footer-explore">
            <b className="text-xs font-bold uppercase tracking-wide text-ink-faint">{L.footer.exploreTitle}</b>
            {L.nav.map((n, i) => (
              <a key={n} href={NAV_HREFS[i]} className="text-sm font-semibold text-ink-soft transition-colors hover:text-brand">
                {n}
              </a>
            ))}
          </nav>

          <nav className="flex flex-col gap-2.5" aria-label="footer-account">
            <b className="text-xs font-bold uppercase tracking-wide text-ink-faint">{L.footer.accountTitle}</b>
            <Link href="/login" className="text-sm font-semibold text-ink-soft transition-colors hover:text-brand">
              {L.login}
            </Link>
            <Link href={ENROLL} className="text-sm font-semibold text-ink-soft transition-colors hover:text-brand">
              {L.cta}
            </Link>
          </nav>
        </div>
        <div className={`${shell} border-t border-ink/8 py-5`}>
          <p className="text-center text-xs text-ink-muted">{L.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
