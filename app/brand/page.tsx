import type { Metadata } from "next";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import Spark from "@/components/Spark";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Brand & identity — Ward Academy",
  robots: { index: false, follow: false },
};

/**
 * Living visual-identity reference (internal). The single source of truth for
 * the brand: logo/mascot, color, type, the spark motif, and tone — the
 * foundation the coded design system will build on.
 */

const colors = [
  { name: "Indigo — Primary 1", hex: "#4F46E5", token: "brand", onDark: false },
  { name: "Coral — Primary 2", hex: "#FB7185", token: "coral", onDark: false },
  { name: "Amber — Secondary", hex: "#FBBF24", token: "amber", onDark: false },
  { name: "Violet — gradient mid", hex: "#8B5CF6", token: "—", onDark: true },
];

const neutrals = [
  { name: "Cream (background)", hex: "#FFF8F1" },
  { name: "Cream deep", hex: "#FFF1E3" },
  { name: "Ink (text)", hex: "#1E293B" },
  { name: "Ink soft", hex: "#475569" },
  { name: "Ink muted", hex: "#64748B" },
];

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink/10 py-12">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-brand">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function BrandPage() {
  return (
    <main dir="ltr" className="min-h-screen bg-cream">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Ward Academy">
            <Mascot face={false} className="h-9 w-9" title="" />
            <span className="font-display text-lg font-bold text-ink">Ward Academy</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-brand">
            ← Home
          </Link>
        </div>

        {/* hero */}
        <header className="py-12">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-brand">
            Visual identity
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
            One spark, <span className="brand-gradient bg-clip-text text-transparent">one soul</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Ward Academy is confident English for ages 9–13 — teacher-led, AI-supported.
            Warm and lively for kids, clear and trustworthy for parents. This page is the
            living reference for the brand.
          </p>
        </header>

        {/* Logo & mascot */}
        <Section kicker="Logo & mascot" title="Wardy — the spark">
          <p className="max-w-2xl text-ink-soft">
            The identity is a 4-point spark (an AI &ldquo;sparkle&rdquo;) in the brand gradient.
            One source, two uses: the <strong>mascot</strong> (with a face) and the clean{" "}
            <strong>logo mark</strong> (no face, also the favicon). A refined wordmark — the
            spark integrated into the word <em>Ward</em> — is the next step.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-ink/5 bg-white p-8">
              <Mascot className="h-28 w-28" />
              <span className="text-sm font-semibold text-ink-muted">Mascot (with face)</span>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-ink/5 bg-brand-800 p-8">
              <Mascot face={false} className="h-28 w-28" />
              <span className="text-sm font-semibold text-white/70">Logo mark · on dark</span>
            </div>
          </div>
        </Section>

        {/* Color */}
        <Section kicker="Color" title="Two primaries + one accent">
          <div className="overflow-hidden rounded-3xl border border-ink/5">
            <div className="brand-gradient flex h-24 items-end p-4">
              <span className="font-display text-sm font-bold text-white">
                Confidence gradient · indigo → violet → coral
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-ink-muted">
            linear-gradient(110deg, #4F46E5, #6366F1 45%, #FB7185) — used on the spark &amp; primary CTAs.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colors.map((c) => (
              <div key={c.hex} className="overflow-hidden rounded-2xl border border-ink/5 bg-white">
                <div className="h-20" style={{ backgroundColor: c.hex }} />
                <div className="p-3">
                  <div className="text-sm font-bold text-ink">{c.name}</div>
                  <div className="font-mono text-xs text-ink-muted">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {neutrals.map((c) => (
              <div key={c.hex} className="overflow-hidden rounded-2xl border border-ink/5 bg-white">
                <div className="h-14 border-b border-ink/5" style={{ backgroundColor: c.hex }} />
                <div className="p-2.5">
                  <div className="text-xs font-bold text-ink">{c.name}</div>
                  <div className="font-mono text-[11px] text-ink-muted">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            <strong>Rule:</strong> indigo &amp; coral lead; amber is a sparing sparkle accent only.
            Body text uses ink / ink-soft / ink-muted (all AA-legible on cream).
          </p>
        </Section>

        {/* Typography */}
        <Section kicker="Typography" title="Fredoka + Inter">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-ink/5 bg-white p-6">
              <div className="font-display text-6xl font-bold text-ink">Aa</div>
              <div className="mt-3 font-display text-xl font-bold text-ink">Fredoka — Display</div>
              <p className="mt-1 text-sm text-ink-muted">Headings, the wordmark, numbers. Rounded &amp; friendly.</p>
            </div>
            <div className="rounded-3xl border border-ink/5 bg-white p-6">
              <div className="text-6xl font-semibold text-ink" style={{ fontFamily: "var(--font-inter)" }}>Aa</div>
              <div className="mt-3 font-display text-xl font-bold text-ink">Inter — Body</div>
              <p className="mt-1 text-sm text-ink-muted" style={{ fontFamily: "var(--font-inter)" }}>
                Body copy, labels, UI. Clear and highly legible at any size.
              </p>
            </div>
          </div>
        </Section>

        {/* Spark motif */}
        <Section kicker="Motif" title="The spark, everywhere">
          <p className="max-w-2xl text-ink-soft">
            The 4-point spark is the single recurring motif — for eyebrows, accents and bullets —
            so every screen echoes the logo. It is the only decorative shape.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 rounded-3xl border border-ink/5 bg-white p-8">
            <Spark className="h-10 w-10 text-brand" />
            <Spark className="h-8 w-8 text-coral" />
            <Spark className="h-6 w-6 text-amber-600" />
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand">
              <Spark className="h-3.5 w-3.5" /> Example chip
            </span>
            <button className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white">
              Primary button <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </div>
        </Section>

        {/* Tone */}
        <Section kicker="Tone of voice" title="Warm, simple, honest">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-brand/15 bg-brand-50 p-6">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-brand">
                <Icon name="check" className="h-4 w-4" /> Do
              </div>
              <ul className="space-y-2 text-sm text-ink-soft">
                <li>“Original practice, matched to their level.”</li>
                <li>“The teacher reviews and approves everything.”</li>
                <li>Honest numbers: “6 of 8”, not fake percentages.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-coral/20 bg-coral-100/40 p-6">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-coral-600">
                <Icon name="close" className="h-4 w-4" /> Don&apos;t
              </div>
              <ul className="space-y-2 text-sm text-ink-soft">
                <li>Jargon, hype, or scary exam pressure.</li>
                <li>Childish baby-talk, or cold corporate tone.</li>
                <li>Over-promising or vague “97% success” claims.</li>
              </ul>
            </div>
          </div>
        </Section>

        <p className="border-t border-ink/10 py-8 text-center text-sm text-ink-muted">
          Living reference · the coded design system (tokens + components) builds on this.
        </p>
      </div>
    </main>
  );
}
