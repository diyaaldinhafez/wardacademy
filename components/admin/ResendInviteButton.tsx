"use client";

import { useActionState } from "react";
import { resendTeacherInvite } from "@/app/admin/actions";

// Resend the set-password (invite) link to a teacher whose account exists but hasn't onboarded (or whose
// first invite email failed). Inline ok/error, never a 500.
export default function ResendInviteButton({ instructorId, label, sentLabel }: { instructorId: string; label: string; sentLabel: string }) {
  const [state, action, pending] = useActionState(resendTeacherInvite, undefined);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <form action={action}>
        <input type="hidden" name="instructorId" value={instructorId} />
        <button type="submit" disabled={pending} className="ward-btn ward-btn--soft ward-btn--sm">{pending ? "…" : label}</button>
      </form>
      {state?.ok && <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--leaf-700)" }}>{sentLabel}</span>}
      {state?.error && <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--rose-700, #b23a56)" }}>{state.error}</span>}
    </div>
  );
}
