"use client";

import Icon, { type IconName } from "./Icon";
import Reveal from "./Reveal";
import Mascot from "./Mascot";
import { useT } from "./LanguageProvider";

/**
 * One consistent card treatment (white, soft, rounded-3xl). Only the icon badge
 * carries color — and only from the brand palette, in a deliberate rhythm:
 * indigo → coral → amber → indigo.
 */
const badgeByAccent: Record<string, string> = {
  brand: "bg-brand-100 text-brand",
  coral: "bg-coral-100 text-coral-600",
  amber: "bg-amber-100 text-amber-600",
};

export default function Features() {
  const features = useT().features;
  return (
    <section id="features" className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
            <Mascot className="h-7 w-7" title="" />
          </span>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {features.heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {features.subheading}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.cards.map((card, i) => (
            <Reveal
              key={card.title}
              delay={i * 90}
              className="group h-full"
            >
              <article className="hover-pop flex h-full flex-col rounded-3xl border border-ink/5 bg-white p-6 shadow-sm hover:shadow-xl">
                <span
                  className={`grid h-14 w-14 place-items-center rounded-2xl ${badgeByAccent[card.accent]} transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}
                >
                  <Icon name={card.icon as IconName} className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold leading-snug text-ink">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                  {card.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
