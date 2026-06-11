import type { Metadata } from "next";
import Link from "next/link";
import { enroll, teacher } from "@/lib/content";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import ShareRow from "@/components/ShareRow";

export const metadata: Metadata = {
  title: "Teacher dashboard (demo) — Ward Academy",
  robots: { index: false, follow: false },
};

/**
 * VISUAL DEMO of the teacher's view (sample data only, no backend).
 * Shows new registrations: student info, trial booking, and placement status,
 * with a link to (re)share the placement test with the family.
 */
export default function TeacherPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Ward Academy">
            <Mascot face={false} className="h-9 w-9" title="" />
            <span className="font-display text-lg font-bold text-ink">Ward Academy</span>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
            <Icon name="star" className="h-3.5 w-3.5" />
            {teacher.demoBadge}
          </span>
        </div>

        <header className="mt-8">
          <h1 className="font-display text-3xl font-bold text-ink">{teacher.title}</h1>
          <p className="mt-2 text-ink-soft">{teacher.subtitle}</p>
        </header>

        <div className="mt-8 grid gap-4">
          {teacher.students.map((s) => {
            const first = s.name.split(" ")[0];
            const url = `/placement?name=${encodeURIComponent(first)}&level=${encodeURIComponent(s.level)}`;
            const completed = s.test === "completed";
            return (
              <article key={s.name} className="rounded-3xl border border-ink/5 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* student */}
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand">
                      <Icon name="user" className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-bold text-ink">{s.name}</h2>
                      <p className="text-sm text-ink-muted">
                        {s.age} yrs · {s.grade} · {s.schoolType}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        <span className="font-semibold text-ink">Goal:</span> {s.goal}
                      </p>
                    </div>
                  </div>

                  {/* placement status */}
                  <div className="text-right">
                    {completed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand">
                        <Icon name="check" className="h-3.5 w-3.5" />
                        {teacher.status.completed} · {s.score}/10
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink-muted">
                        <Icon name="clock" className="h-3.5 w-3.5" />
                        {teacher.status.not_started}
                      </span>
                    )}
                    {completed && (
                      <p className="mt-1 text-xs font-medium text-ink-muted">{s.level}</p>
                    )}
                  </div>
                </div>

                {/* trial + share */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-4">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
                    <Icon name="clock" className="h-4 w-4 text-brand" />
                    Trial: {s.trial.day} · {s.trial.time}
                  </span>
                  <div>
                    <span className="mb-1 block text-right text-xs font-medium text-ink-muted sm:inline sm:pr-2">
                      {teacher.shareTestLabel}
                    </span>
                    <ShareRow url={url} message={enroll.share.linkMessage} compact />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs font-medium text-ink-muted">
          Demo view with sample data. In the real product this is private to the teacher.
        </p>
      </div>
    </main>
  );
}
