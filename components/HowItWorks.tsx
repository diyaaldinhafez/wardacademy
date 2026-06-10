import { howItWorks } from "@/lib/content";
import Reveal from "./Reveal";

/** Steps alternate the two primaries: indigo / coral. */
const stepColors = [
  "bg-brand text-white ring-brand-100",
  "bg-coral text-white ring-coral-100",
  "bg-brand text-white ring-brand-100",
  "bg-coral text-white ring-coral-100",
];

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
            className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-brand via-brand-400 to-coral lg:block"
          />
          {howItWorks.steps.map((step, i) => (
            <Reveal as="li" key={step.number} delay={i * 70} className="group relative">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <span
                  className={`relative z-10 grid h-16 w-16 place-items-center rounded-2xl font-display text-xl font-bold shadow-md ring-4 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${stepColors[i % stepColors.length]}`}
                >
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
