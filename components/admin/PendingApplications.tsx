"use client";

import Link from "next/link";
import { useActionState } from "react";
import { provisionTeacher, rejectApplication } from "@/app/admin/actions";
import { Avatar } from "@/components/ward/ui";

type App = { id: string; full_name: string; email: string; phone?: string | null; specialties?: string | null; bio?: string | null; note?: string | null };
type Labels = { approve: string; reject: string; openTeacher: string };
const btn = (v: string) => `ward-btn ward-btn--${v} ward-btn--sm`;

// One application row — each owns its own action state so Approve/Reject errors (e.g. a duplicate
// email) render INLINE on that row instead of throwing a 500 page. Three outcomes: ok (invited),
// warning (account created but the invite email failed → resend), error (nothing created).
function Row({ app, labels }: { app: App; labels: Labels }) {
  const [pState, pAction, pPending] = useActionState(provisionTeacher, undefined);
  const [rState, rAction, rPending] = useActionState(rejectApplication, undefined);
  const err = pState?.error || rState?.error;
  const warn = pState?.warning;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-card)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Avatar name={app.full_name ?? "?"} size={34} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{app.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }} dir="ltr">
            {app.email}{app.phone ? ` · ${app.phone}` : ""}{app.specialties ? ` · ${app.specialties}` : ""}
          </div>
          {(app.bio || app.note) && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{app.bio ?? app.note}</div>}
        </div>
        <form action={pAction}>
          <input type="hidden" name="applicationId" value={app.id} />
          <button type="submit" disabled={pPending} className={btn("success")}>{pPending ? "…" : labels.approve}</button>
        </form>
        <form action={rAction}>
          <input type="hidden" name="applicationId" value={app.id} />
          <button type="submit" disabled={rPending} className={btn("ghost")}>{rPending ? "…" : labels.reject}</button>
        </form>
      </div>
      {err && <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--rose-700, #b23a56)", margin: 0 }}>{err}</p>}
      {warn && (
        <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--apricot-600, #c97a2b)", margin: 0 }}>
          {warn}{pState?.instructorId && <> <Link href={`/admin/teachers/${pState.instructorId}`} style={{ color: "var(--text-brand)" }}>{labels.openTeacher}</Link></>}
        </p>
      )}
    </div>
  );
}

export default function PendingApplications({ apps, labels }: { apps: App[]; labels: Labels }) {
  return <>{apps.map((a) => <Row key={a.id} app={a} labels={labels} />)}</>;
}
