import { signup } from "@/lib/content";
import Icon from "./Icon";
import Mascot from "./Mascot";
import EnrollFlow from "./EnrollFlow";

/**
 * The enrolment section. Heading + mascot, then the multi-step flow
 * (Register → Book a trial → Quick check → Done). Visual only — see EnrollFlow.
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

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <Mascot className="animate-bob mx-auto mb-2 h-24 w-24 drop-shadow-lg" />
          <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral-100 px-4 py-1.5 text-sm font-semibold text-coral-600">
            <Icon name="check-badge" className="h-4 w-4" />
            {signup.eyebrow}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {signup.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
            {signup.subheading}
          </p>
        </div>

        <div className="mt-10">
          <EnrollFlow />
        </div>
      </div>
    </section>
  );
}
