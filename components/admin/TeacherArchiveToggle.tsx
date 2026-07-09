"use client";

import { useActionState } from "react";
import { archiveTeacher, restoreTeacher } from "@/app/admin/actions";

const btn = (v: string) => `ward-btn ward-btn--${v} ward-btn--sm`;

// Archive / Restore toggle — the VISIBILITY dimension, distinct from Deactivate/Reactivate (ACCESS).
// Archiving FORCES access revocation (server-side). Restore returns the teacher to the roster still
// deactivated (admin must Reactivate for access). Inline error instead of 500'ing the page.
export default function TeacherArchiveToggle({
  instructorId,
  isArchived,
  labels,
}: {
  instructorId: string;
  isArchived: boolean;
  labels: { archive: string; restore: string };
}) {
  const action = isArchived ? restoreTeacher : archiveTeacher;
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <form action={formAction}>
        <input type="hidden" name="instructorId" value={instructorId} />
        <button type="submit" disabled={pending} className={btn(isArchived ? "success" : "ghost")}>
          {pending ? "…" : isArchived ? labels.restore : labels.archive}
        </button>
      </form>
      {state?.error && <p style={{ fontSize: 12, fontWeight: 600, color: "var(--rose-700, #b23a56)", margin: 0 }}>{state.error}</p>}
    </div>
  );
}
