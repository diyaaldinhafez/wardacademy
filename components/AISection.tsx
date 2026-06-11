"use client";

import Icon, { type IconName } from "./Icon";
import Reveal from "./Reveal";
import Spark from "./Spark";
import { useT } from "./LanguageProvider";

export default function AISection() {
  const ai = useT().ai;
  return (
    <section
      id="ai"
      className="relative overflow-hidden bg-brand-800 py-20 text-white sm:py-28"
    >
      {/* Subtle background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-coral/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-brand-200">
            <Spark className="h-3.5 w-3.5" />
            {ai.eyebrow}
          </span>
          <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {ai.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-brand-100">{ai.body}</p>
        </Reveal>

        {/* Pipeline */}
        <div className="mt-16">
          <ol className="grid items-stretch gap-5 md:grid-cols-3">
            {ai.pipeline.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 80} className="relative">
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand">
                      <Icon name={step.icon as IconName} className="h-6 w-6" />
                    </span>
                    <span className="font-display text-sm font-bold uppercase tracking-wider text-brand-100">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-100">
                    {step.body}
                  </p>
                </div>

                {/* Flow connector — points right on desktop, down on mobile */}
                {i < ai.pipeline.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute start-1/2 top-full z-10 -translate-x-1/2 translate-y-1 text-amber-300 md:start-auto md:top-1/2 md:end-[-1.1rem] md:translate-x-0 md:-translate-y-1/2"
                  >
                    <Icon
                      name="arrow-right"
                      className="rtl-flip h-7 w-7 rotate-90 md:rotate-0"
                    />
                  </span>
                )}
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
