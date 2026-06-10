import { safety } from "@/lib/content";
import Icon, { type IconName } from "./Icon";
import Reveal from "./Reveal";

export default function Safety() {
  return (
    <section id="safety" className="bg-cream py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left: heading */}
          <Reveal className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand">
              <Icon name="lock" className="h-4 w-4" />
              {safety.eyebrow}
            </span>
            <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
              {safety.heading}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              {safety.body}
            </p>
          </Reveal>

          {/* Right: points */}
          <div className="grid gap-4 lg:col-span-7">
            {safety.points.map((point, i) => (
              <Reveal key={point.title} delay={i * 90}>
                <article className="flex items-start gap-4 rounded-2xl border border-ink/5 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand">
                    <Icon name={point.icon as IconName} className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">
                      {point.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {point.body}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
