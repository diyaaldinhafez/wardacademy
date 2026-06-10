import { features } from "@/lib/content";
import Icon, { type IconName } from "./Icon";
import Reveal from "./Reveal";

/** Accent → tailwind classes for each card's icon badge. */
const accentClasses: Record<string, string> = {
  brand: "bg-brand-100 text-brand",
  mint: "bg-mint-100 text-mint-600",
  coral: "bg-coral-100 text-coral-600",
  amber: "bg-amber-100 text-amber-600",
};

export default function Features() {
  return (
    <section id="features" className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
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
              <article className="flex h-full flex-col rounded-3xl border border-ink/5 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl ${accentClasses[card.accent]} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon name={card.icon as IconName} className="h-6 w-6" />
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
