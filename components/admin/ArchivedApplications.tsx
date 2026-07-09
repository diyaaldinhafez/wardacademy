"use client";

import { useActionState, useState } from "react";
import { restoreApplication, deleteApplication } from "@/app/admin/actions";
import { Avatar } from "@/components/ward/ui";

type App = { id: string; full_name: string; email: string; status: string; instructor_id?: string | null };
type Labels = { restore: string; delete: string; confirmDelete: string; cancel: string; rejected: string; archived: string };
const btn = (v: string) => `ward-btn ward-btn--${v} ward-btn--sm`;

// One archived/rejected application row: a status badge (Rejected vs Archived) + Restore + a
// two-step Permanent-delete confirm ("cannot be undone"). Per-row action state → inline errors,
// never a 500. Delete is server-guarded (a live-linked application is refused there too).
function Row({ app, labels }: { app: App; labels: Labels }) {
  const [rState, rAction, rPending] = useActionState(restoreApplication, undefined);
  const [dState, dAction, dPending] = useActionState(deleteApplication, undefined);
  const [confirming, setConfirming] = useState(false);
  const err = rState?.error || dState?.error;
  const isRejected = app.status === "rejected";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-card)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Avatar name={app.full_name ?? "?"} size={30} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{app.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }} dir="ltr">{app.email}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: isRejected ? "var(--rose-700, #b23a56)" : "var(--text-muted)", background: isRejected ? "var(--rose-50, #fdeef2)" : "var(--ink-100)" }}>
          {isRejected ? labels.rejected : labels.archived}
        </span>
        <form action={rAction}>
          <input type="hidden" name="applicationId" value={app.id} />
          <button type="submit" disabled={rPending} className={btn("ghost")}>{rPending ? "…" : labels.restore}</button>
        </form>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className={btn("danger")}>{labels.delete}</button>
        ) : (
          <form action={dAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="hidden" name="applicationId" value={app.id} />
            <button type="submit" disabled={dPending} className={btn("danger")}>{dPending ? "…" : labels.confirmDelete}</button>
            <button type="button" onClick={() => setConfirming(false)} className={btn("ghost")}>{labels.cancel}</button>
          </form>
        )}
      </div>
      {err && <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--rose-700, #b23a56)", margin: 0 }}>{err}</p>}
    </div>
  );
}

export default function ArchivedApplications({ apps, labels }: { apps: App[]; labels: Labels }) {
  return <>{apps.map((a) => <Row key={a.id} app={a} labels={labels} />)}</>;
}
