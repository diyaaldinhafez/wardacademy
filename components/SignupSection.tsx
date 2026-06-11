import Link from "next/link";
import { starter } from "@/lib/content";
import Icon from "./Icon";
import Mascot from "./Mascot";

/**
 * Homepage starter: one playful, one-tap question that hooks the visitor and
 * sends them to /enroll (goal pre-filled). Keeps the homepage light; the full
 * Register → Book → Placement flow lives on the dedicated /enroll page.
 */
export default function SignupSection() {
  return (
    <section
      id="signup"
      className="relative overflow-hidden bg-gradient-to-b from-cream-deep to-cream py-20 sm:py-28"
    >
      {/* Playful backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float-slow absolute -left-12 top-16 h-56 w-56 rounded-full bg-coral-100/60 blur-3xl" />
        <div className="animate-float-slower absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl px-5 sm:px-8">
        <div className="text-center">
          <Mascot className="animate-bob mx-auto mb-2 h-24 w-24 drop-shadow-lg" />
          <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral-100 px-4 py-1.5 text-sm font-semibold text-coral-600">
            <Icon name="check-badge" className="h-4 w-4" />
            {starter.eyebrow}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {starter.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
            {starter.subheading}
          </p>
        </div>

        {/* one-tap options → /enroll?goal=key */}
        <div className="mt-9 grid gap-3 sm:grid-cols-2">
          {starter.options.map((o) => (
            <Link
              key={o.key}
              href={`/enroll?goal=${o.key}`}
              className="group flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cream text-2xl">
                {o.emoji}
              </span>
              <span className="flex-1 font-display text-base font-bold text-ink">
                {o.label}
              </span>
              <Icon
                name="arrow-right"
                className="h-5 w-5 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </Link>
          ))}
        </div>

        {/* secondary, unconditional CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/enroll"
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            {starter.cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
