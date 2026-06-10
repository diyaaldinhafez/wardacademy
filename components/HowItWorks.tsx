import { howItWorks } from "@/lib/content";
import Reveal from "./Reveal";

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-gradient-to-b from-cream to-cream-deep py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {howItWorks.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {howItWorks.subheading}
          </p>
        </Reveal>

        <ol className="relative mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Connecting line on large screens */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-brand-200 via-coral-300 to-amber-300 lg:block"
          />
          {howItWorks.steps.map((step, i) => (
            <Reveal as="li" key={step.number} delay={i * 70} className="relative">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <span className="relative z-10 grid h-14 w-14 place-items-center rounded-2xl bg-white font-display text-lg font-extrabold text-brand shadow-md ring-4 ring-cream">
                  {step.number}
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
