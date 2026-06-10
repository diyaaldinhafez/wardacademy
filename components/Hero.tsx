import { hero } from "@/lib/content";
import Icon from "./Icon";
import Mascot from "./Mascot";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-cream-deep via-cream to-cream"
    >
      {/* Soft floating background shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-16 top-10 h-64 w-64 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="animate-float-slower absolute -right-10 top-32 h-72 w-72 rounded-full bg-coral-100/70 blur-3xl" />
        <div className="animate-float-slow absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* ---- Left: copy ---- */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand shadow-sm backdrop-blur">
              <Icon name="star" className="h-4 w-4 text-amber-600" />
              {hero.eyebrow}
            </span>

            <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {hero.titleLines.map((line) =>
                line === hero.highlight ? (
                  <span key={line} className="relative inline-block">
                    <span className="bg-gradient-to-r from-brand via-brand-500 to-coral bg-clip-text text-transparent">
                      {line}
                    </span>
                    <svg
                      aria-hidden
                      viewBox="0 0 300 24"
                      className="absolute -bottom-2 left-0 h-4 w-full text-amber"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M3 18 C 80 6, 220 6, 297 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                ) : (
                  <span key={line} className="block sm:inline">
                    {line}{" "}
                  </span>
                ),
              )}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl lg:mx-0">
              {hero.subtitle}
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
              <a
                href="#signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl active:scale-95 sm:w-auto"
              >
                {hero.primaryCta}
                <Icon name="arrow-right" className="h-5 w-5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/80 px-7 py-4 text-base font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:text-brand active:scale-95 sm:w-auto"
              >
                {hero.secondaryCta}
              </a>
            </div>

            <p className="mt-5 text-sm font-medium text-ink-muted">{hero.trustNote}</p>
          </div>

          {/* ---- Right: mascot + product peek + letter bubbles ---- */}
          <div className="relative mx-auto w-full max-w-md">
            <LetterBubbles />
            <div className="relative flex flex-col items-center">
              <Mascot className="animate-bob h-40 w-40 drop-shadow-xl sm:h-48 sm:w-48" />
              <div className="-mt-6 w-full">
                <HeroPreview />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Stat strip ---- */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-3 sm:gap-6">
          {hero.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-ink/5 bg-white/80 px-4 py-5 text-center shadow-sm backdrop-blur"
            >
              <div className="font-display text-2xl font-bold text-brand sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-xs font-medium text-ink-soft sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Floating English-letter bubbles — playful nod to language learning. */
function LetterBubbles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
      <span className="animate-wiggle absolute -left-6 top-4 grid h-12 w-12 place-items-center rounded-2xl bg-coral font-display text-xl font-bold text-white shadow-md">
        A
      </span>
      <span className="animate-bob absolute -right-4 top-10 grid h-11 w-11 place-items-center rounded-2xl bg-amber font-display text-lg font-bold text-white shadow-md">
        Bb
      </span>
      <span className="animate-float-slow absolute -left-8 top-1/2 grid h-11 w-11 place-items-center rounded-full bg-mint font-display text-base font-bold text-white shadow-md">
        Hi!
      </span>
      <span className="animate-wiggle absolute -right-7 bottom-10 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-md">
        <Icon name="check" className="h-6 w-6" />
      </span>
    </div>
  );
}

function HeroPreview() {
  const p = hero.preview;
  return (
    <div className="rounded-3xl border border-ink/5 bg-white p-5 shadow-xl shadow-brand/10 sm:p-6">
      {/* Header: label + approved chip */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-muted">{p.label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-2.5 py-1 text-xs font-semibold text-mint-600">
          <Icon name="check-badge" className="h-3.5 w-3.5" />
          {p.approved}
        </span>
      </div>

      {/* Sample question */}
      <div className="mt-4 rounded-2xl bg-cream/70 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          {p.question}
        </p>
        <p className="mt-1.5 font-display text-base font-bold text-ink">{p.sentence}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.options.map((opt) => (
            <span
              key={opt.text}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${
                opt.correct
                  ? "border-mint/40 bg-mint-100 text-mint-600"
                  : "border-ink/10 bg-white text-ink-soft"
              }`}
            >
              {opt.correct && <Icon name="check" className="h-4 w-4" />}
              {opt.text}
            </span>
          ))}
        </div>
      </div>

      {/* Honest progress */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-soft">{p.progressLabel}</span>
        <span className="font-display text-sm font-bold text-brand">{p.progressValue}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-brand to-mint" />
      </div>
    </div>
  );
}
