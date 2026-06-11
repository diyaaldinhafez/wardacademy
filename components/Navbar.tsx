"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import Mascot from "./Mascot";
import { useT, useLang } from "./LanguageProvider";

function LangSwitch() {
  const { lang, setLang } = useLang();
  const base = "rounded-full px-2.5 py-1 text-xs font-bold transition-colors";
  return (
    <div className="inline-flex items-center rounded-full border border-ink/15 bg-white/70 p-0.5 backdrop-blur">
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`${base} ${lang === "ar" ? "bg-brand text-white" : "text-ink-muted hover:text-brand"}`}
        aria-pressed={lang === "ar"}
      >
        ع
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`${base} ${lang === "en" ? "bg-brand text-white" : "text-ink-muted hover:text-brand"}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}

export default function Navbar() {
  const t = useT();
  const nav = t.nav;
  const site = t.site;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape, and lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-cream/85 backdrop-blur-md shadow-[0_4px_24px_-12px_rgba(30,41,59,0.25)]"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-2" aria-label={site.name}>
          <Mascot face={false} className="h-10 w-10" title="" />
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            {site.name}
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-7 md:flex">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft transition-colors hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right cluster: language + CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitch />
          <Link
            href="/enroll"
            className="brand-gradient hidden items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:-translate-y-0.5 hover:shadow-lg md:inline-flex"
          >
            {nav.cta}
            <Icon name="arrow-right" className="rtl-flip h-4 w-4" />
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white/70 text-ink md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="mx-4 mb-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-xl md:hidden">
          <div className="flex flex-col">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink-soft transition-colors hover:bg-cream hover:text-brand"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/enroll"
              onClick={() => setOpen(false)}
              className="brand-gradient mt-2 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold text-white shadow-md"
            >
              {nav.cta}
              <Icon name="arrow-right" className="rtl-flip h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
