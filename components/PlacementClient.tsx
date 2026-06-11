"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Mascot from "./Mascot";
import PlacementTest from "./PlacementTest";
import { useT } from "./LanguageProvider";

/**
 * Standalone placement-test page content. Reads the child's first name / level
 * from URL params (no storage) so a shared link greets them by name.
 */
export default function PlacementClient() {
  const t = useT();
  const params = useSearchParams();
  const name = params.get("name") ?? undefined;
  // relative link to this test; ShareRow resolves it to absolute at click time
  const query = params.toString();
  const shareUrl = query ? `/placement?${query}` : "/placement";

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-deep to-cream px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2" aria-label="Ward Academy">
          <Mascot face={false} className="h-9 w-9" title="" />
          <span className="font-display text-lg font-bold text-ink">Ward Academy</span>
        </Link>

        <div className="mt-8 rounded-3xl border border-ink/5 bg-white p-6 shadow-xl shadow-brand/5 sm:p-9">
          <PlacementTest name={name} shareUrl={shareUrl} />
        </div>

        <p className="mt-6 text-center text-xs font-medium text-ink-muted">
          {t.ui.placementPageNote}
        </p>
      </div>
    </main>
  );
}
