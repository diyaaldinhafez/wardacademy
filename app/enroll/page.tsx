import type { Metadata } from "next";
import Link from "next/link";
import { enroll, signup, starter } from "@/lib/content";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import EnrollFlow from "@/components/EnrollFlow";

export const metadata: Metadata = {
  title: "Get started — Ward Academy",
  description: "Register, book a free trial, and take a quick placement test.",
};

/**
 * Dedicated enrolment page — a focused, distraction-free conversion surface
 * (own minimal header, no marketing nav/footer). Reads ?goal=key to pre-fill.
 */
export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const { goal } = await searchParams;
  const initialGoal = starter.options.find((o) => o.key === goal)?.goal;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-deep to-cream">
      {/* minimal header */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Ward Academy">
          <Mascot face={false} className="h-9 w-9" title="" />
          <span className="font-display text-lg font-bold text-ink">Ward Academy</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand"
        >
          <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
          Back to home
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <div className="text-center">
          <Mascot className="mx-auto mb-2 h-20 w-20 drop-shadow-lg" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {signup.heading}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">
            {signup.subheading}
          </p>
        </div>

        <div className="mt-8">
          <EnrollFlow initialGoal={initialGoal} />
        </div>

        <p className="mt-6 text-center text-xs font-medium text-ink-muted">
          {enroll.register.reassurance}
        </p>
      </div>
    </main>
  );
}
