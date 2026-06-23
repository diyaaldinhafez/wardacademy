"use client";

import { useState } from "react";
import Link from "next/link";
import FlowerMark from "./FlowerMark";
import HeroBloom from "./HeroBloom";
import Spark from "./Spark";
import Icon from "./Icon";
import Button from "./ui/Button";
import LangToggle from "./LangToggle";
import Reveal from "./Reveal";
import ProductShowcase from "./ProductShowcase";
import BloomReport from "./BloomReport";
import TeacherDashboard from "./TeacherDashboard";
import Outcomes from "./Outcomes";
import StickyTrialBar from "./StickyTrialBar";
import { useT } from "./LanguageProvider";

const ENROLL = "/enroll";
const NAV_HREFS = ["#how", "#pricing", "#faq"];

/* White flower for the final CTA (on the purple bloom gradient) */
function WhiteFlower() {
  const PETAL =
    "M50,50 C38.7,46.2 31.2,35 34,22.7 C35.9,12.4 42.5,6.8 50,3 C57.5,6.8 64.1,12.4 66,22.7 C68.8,35 61.3,46.2 50,50 Z";
  return (
    <svg viewBox="0 0 100 100" width="54" height="54" aria-hidden className="mx-auto">
      <g fill="#FFFFFF">
        {[0, 90, 180, 270].map((d) => (
          <path key={d} d={PETAL} transform={`rotate(${d} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="9" fill="#C8ABFF" />
      <circle cx="50" cy="50" r="3.5" fill="#3D2371" />
    </svg>
  );
}

/* A small leaf-green check for feature rows */
function FeatureCheck() {
  return (
    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
      <svg width="11" height="11" viewBox="0 0 13 13" aria-hidden>
        <path d="M2.5 7l3 3 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Stars() {
  return (
    <span className="flex gap-0.5 text-amber-500" aria-hidden>
      {[0, 1, 2, 3, 4].map((s) => (
        <Icon key={s} name="star" className="h-3.5 w-3.5 fill-current" stroke="none" />
      ))}
    </span>
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

/* A real glimpse of the signature Bloom Report, shown beneath the hero flower.
   Two skills (one strong, one developing — honest) + streak + season. */
function PeekCard({
  name,
  report,
}: {
  name: string;
  report: {
    tag: string;
    streak: string;
    season: string;
    skills: { name: string; value: number; tag: string }[];
  };
}) {
  // Reading (strong) + Speaking (developing) make an honest two-line teaser
  const rows = [report.skills[2], report.skills[1]];
  return (
    <div className="w-[250px] rounded-2xl border border-ink/8 bg-white p-4 text-start shadow-ward-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
          {report.tag}
        </span>
        <span className="rounded-full bg-leaf/15 px-2.5 py-0.5 text-[10px] font-bold text-leaf">{name}</span>
      </div>
      <div className="mt-3 grid gap-2.5">
        {rows.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] font-bold text-ink">{s.name}</span>
            <span className="h-2 flex-1 rounded-full bg-brand-100">
              <span
                className="block h-full rounded-full"
                style={{ width: `${s.value}%`, background: "linear-gradient(90deg,#9f7de7,#6840bd)" }}
              />
            </span>
            <span className="min-w-[3.5rem] shrink-0 whitespace-nowrap text-end text-[10px] font-bold text-brand-700">
              {s.tag}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
          <Sprout />
          {report.streak}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
          <Icon name="star" className="h-2.5 w-2.5 fill-current" stroke="none" />
          {report.season}
        </span>
      </div>
    </div>
  );
}

/* The hero flower + its soft glow. Rendered once per breakpoint layout. */
function HeroFlower() {
  return (
    <div className="relative grid place-items-center">
      <div
        aria-hidden
        className="absolute h-44 w-44 rounded-full blur-2xl sm:h-52 sm:w-52"
        style={{ background: "radial-gradient(circle, rgba(127,85,217,0.20), transparent 70%)" }}
      />
      <HeroBloom className="relative h-52 w-52 overflow-visible sm:h-60 sm:w-60 lg:h-64 lg:w-64" title="" />
    </div>
  );
}

export default function Landing() {
  const t = useT();
  const L = t.landing;
  const shell = "mx-auto w-full max-w-[1080px] px-6";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* ---- Nav ---- */}
      <div className="sticky top-0 z-30 border-b border-transparent bg-white/85 backdrop-blur">
        <div className={shell}>
          <nav className="flex items-center gap-5 py-3.5" aria-label="main">
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
              <Link href="/studio/login" className="hidden text-sm font-semibold text-ink-soft hover:text-brand sm:inline">
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
                href="/studio/login"
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
      </div>

      {/* ---- Hero ---- */}
      <header id="top">
        {/* full-bleed gradient — reaches the screen edges (no white gutters) */}
        <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-b from-brand-50 to-white">
          {/* soft gradient mesh */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -start-16 -top-10 h-64 w-64 rounded-full opacity-60" style={{ background: "radial-gradient(circle, rgba(159,125,231,0.22), transparent 70%)" }} />
            <div className="absolute end-0 top-1/3 h-72 w-72 rounded-full opacity-50" style={{ background: "radial-gradient(circle, rgba(255,180,107,0.16), transparent 70%)" }} />
          </div>

          <div className={`${shell} relative`}>
            <div className="grid items-center gap-5 pb-12 pt-7 sm:gap-6 sm:py-16 lg:gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              {/* text column — on mobile the flower + card are interleaved here */}
              <div className="flex flex-col items-center gap-4 text-center sm:gap-5 lg:items-start lg:text-start lg:ps-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-ink/8 bg-white/80 px-3 py-1.5 shadow-ward-1 backdrop-blur">
                  <Stars />
                  <b className="text-xs font-bold text-ink">{L.hero.rating}</b>
                </span>
                <h1 className="font-display text-[clamp(28px,5.2vw,46px)] font-bold leading-[1.3] text-brand-900">
                  {L.hero.title}
                </h1>

                {/* mobile: flower right after the headline (blooms when seen) */}
                <div className="my-1 lg:hidden">
                  <HeroFlower />
                </div>

                <p className="mx-auto max-w-[52ch] text-[17px] leading-[1.8] text-ink-soft lg:mx-0">
                  {L.hero.sub}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
                  <Button href={ENROLL} variant="green" size="lg">
                    {L.cta}
                  </Button>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-600">
                    {L.hero.note}
                  </span>
                </div>

                {/* mobile: the Bloom Report glimpse below the CTA */}
                <div className="mt-2 lg:hidden">
                  <PeekCard name={L.hero.peek.student} report={L.bloomReport} />
                </div>
              </div>

              {/* desktop: flower + card in the right column */}
              <div className="hidden flex-col items-center gap-5 lg:flex">
                <HeroFlower />
                <PeekCard name={L.hero.peek.student} report={L.bloomReport} />
              </div>
            </div>
          </div>
        </div>

        {/* assurance strip on white */}
        <div className={shell}>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-5">
            {L.assurances.map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <Icon name="check" className="h-3.5 w-3.5 text-leaf" />
                {a}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ---- How it works ---- */}
      <section id="how" className={`${shell} pt-16`}>
        <Reveal className="text-center">
          <h2 className="font-display text-[28px] font-bold text-ink">{L.how.title}</h2>
        </Reveal>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {L.how.steps.map((s, i) => (
            <Reveal key={i} delay={i * 80} className="flex flex-col gap-2.5 rounded-2xl border border-ink/5 bg-white p-5 shadow-ward-1">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-display text-[15px] font-bold text-brand-700">
                {i + 1}
              </span>
              <b className="text-[16.5px] font-bold text-ink">{s.t}</b>
              <span className="text-sm leading-[1.75] text-ink-soft">{s.d}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- A peek inside (parent + student screens) ---- */}
      <ProductShowcase />

      {/* ---- The Bloom Report (signature progress visual) ---- */}
      <BloomReport />

      {/* ---- The private teacher: one-to-one, every session ---- */}
      <section id="trust" className={`${shell} pt-16`}>
        <Reveal>
          <div className="rounded-[28px] bg-brand-50 px-8 py-10">
            <h2 className="flex items-center justify-center gap-2.5 text-center font-display text-[28px] font-bold text-ink">
              <Icon name="teacher" className="h-6 w-6 text-brand-600" />
              {L.trust.title}
            </h2>
            <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
              {L.trust.sub}
            </p>
            <div className="mx-auto mt-7 grid max-w-[760px] gap-3 sm:grid-cols-3">
              {L.trust.points.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2.5 rounded-2xl border border-ink/8 bg-white px-4 py-3.5 text-start shadow-ward-1"
                >
                  <FeatureCheck />
                  <span className="text-[14px] font-semibold leading-snug text-ink">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- AI support: a booster for teacher + student ---- */}
      <section id="ai" className={`${shell} pt-16`}>
        <Reveal>
          <div className="rounded-[28px] border border-brand-100 bg-gradient-to-br from-brand-50 to-white px-8 py-10">
            <h2 className="flex items-center justify-center gap-2.5 text-center font-display text-[28px] font-bold text-ink">
              <Spark gradient className="h-6 w-6" />
              {L.ai.title}
            </h2>
            <p className="mx-auto mt-3 max-w-[64ch] text-center text-[15.5px] leading-[1.8] text-ink-soft">
              {L.ai.sub}
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {L.ai.points.map((pt) => (
                <div key={pt.t} className="flex flex-col gap-2 rounded-2xl border border-ink/8 bg-white p-5 shadow-ward-1">
                  <b className="text-[16px] font-bold text-ink">{pt.t}</b>
                  <span className="text-sm leading-[1.75] text-ink-soft">{pt.d}</span>
                </div>
              ))}
            </div>

            {/* the teacher's screen: where AI proposes and the teacher approves */}
            <div className="mt-8">
              <TeacherDashboard />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- Outcomes / social proof ---- */}
      <Outcomes />

      {/* ---- Pricing ---- */}
      <section id="pricing" className={`${shell} pt-16`}>
        <Reveal className="text-center">
          <h2 className="font-display text-[28px] font-bold text-ink">{L.pricing.title}</h2>
          <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">
            {L.pricing.sub}
          </p>
        </Reveal>
        <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-3">
          {L.pricing.plans.map((p, i) => (
            <Reveal
              key={p.name}
              delay={i * 80}
              className={`relative flex flex-col rounded-[24px] p-6 text-center ${
                p.featured
                  ? "bg-gradient-to-b from-brand-50 to-white shadow-ward-2 ring-2 ring-brand sm:-mt-3 sm:pb-8"
                  : "border border-ink/8 bg-white shadow-ward-1"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white shadow-ward-1">
                  {L.pricing.badge}
                </span>
              )}
              <b className="font-display text-lg font-bold text-ink">{p.name}</b>
              <span className="mt-1 text-sm font-semibold text-brand-700">{p.cadence}</span>
              <div className="mt-4 flex items-end justify-center gap-1">
                <span className="font-display text-[36px] font-bold leading-none text-brand-700">{p.price}</span>
                <span className="pb-1 text-xs font-semibold text-ink-muted">{L.pricing.perMonth}</span>
              </div>
              <span className="mt-1.5 text-xs font-medium text-ink-muted">{p.sessions}</span>
              <div className="mt-auto pt-6">
                <Button
                  href={ENROLL}
                  variant={p.featured ? "primary" : "soft"}
                  size="md"
                  className="w-full"
                >
                  {L.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Shared — every plan includes the same care */}
        <Reveal delay={80} className="mt-5 rounded-[24px] border border-ink/8 bg-white p-6 shadow-ward-1">
          <b className="text-[15px] font-bold text-ink">{L.pricing.includesTitle}</b>
          <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {L.pricing.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[14px] leading-relaxed text-ink-soft">
                <FeatureCheck />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>

        <p className="mt-5 text-center text-xs font-medium text-ink-muted">{L.pricing.note}</p>
      </section>

      {/* ---- Testimonials ---- */}
      <section id="reviews" className={`${shell} pt-16`}>
        <Reveal className="text-center">
          <h2 className="font-display text-[28px] font-bold text-ink">{L.testimonials.title}</h2>
          <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">
            {L.testimonials.sub}
          </p>
        </Reveal>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {L.testimonials.items.map((tm, i) => (
            <Reveal key={tm.name} delay={i * 80}>
              <figure className="flex h-full flex-col gap-4 rounded-2xl border border-ink/8 bg-white p-6 shadow-ward-1">
                <Stars />
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
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section id="faq" className={`${shell} pt-16`}>
        <Reveal className="text-center">
          <h2 className="font-display text-[28px] font-bold text-ink">{L.faq.title}</h2>
          <p className="mx-auto mt-3 max-w-[64ch] text-[15.5px] leading-[1.8] text-ink-soft">
            {L.faq.sub}
          </p>
        </Reveal>
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
        <Reveal>
          <div className="rounded-[28px] bg-gradient-to-br from-brand-400 to-brand-600 px-8 py-11 text-center text-white">
            <WhiteFlower />
            <h2 className="mt-2.5 font-display text-[26px] font-bold text-white">{L.final.title}</h2>
            <p className="mx-auto mb-5 mt-2 max-w-[48ch] text-[15px] text-brand-100">{L.final.sub}</p>
            <Button href={ENROLL} variant="green" size="lg">
              {L.cta}
            </Button>
          </div>
        </Reveal>
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
            <Link href="/studio/login" className="text-sm font-semibold text-ink-soft transition-colors hover:text-brand">
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

      {/* ---- Sticky mobile CTA ---- */}
      <StickyTrialBar />
    </div>
  );
}
