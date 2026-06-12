"use client";

import Link from "next/link";
import FlowerMark from "./FlowerMark";
import Icon from "./Icon";
import EnrollFlow from "./EnrollFlow";
import { useT } from "./LanguageProvider";

/**
 * Focused enrolment screen (own minimal header, no marketing nav/footer).
 * Bilingual via useT; receives the starter goal key to pre-fill.
 */
export default function EnrollScreen({ goalKey }: { goalKey?: string }) {
  const t = useT();
  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-deep to-cream">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Ward Academy">
          <FlowerMark className="h-9 w-9" title="" />
          <span className="font-display text-lg font-bold text-ink">Ward Academy</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand"
        >
          <Icon name="arrow-right" className="rtl-flip h-4 w-4 rotate-180" />
          {t.ui.backHome}
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <div className="text-center">
          <FlowerMark className="mx-auto mb-2 h-20 w-20 drop-shadow-lg" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t.signup.heading}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">
            {t.signup.subheading}
          </p>
        </div>

        <div className="mt-8">
          <EnrollFlow goalKey={goalKey} />
        </div>
      </div>
    </main>
  );
}
