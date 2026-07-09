"use client";

import Link from "next/link";
import { useActionState } from "react";
import { provisionTeacher, rejectApplication, archiveApplication } from "@/app/admin/actions";
import { Avatar } from "@/components/ward/ui";

type App = {
  id: string; full_name: string; email: string; phone?: string | null; bio?: string | null;
  timezone?: string | null; years_experience?: number | null; teaches_children?: boolean | null;
  certifications?: string | null; english_level?: string | null; online_1to1_experience?: boolean | null;
  weekly_availability?: string | null; cv_url?: string | null; motivation?: string | null;
};
type Labels = { approve: string; reject: string; archive: string; openTeacher: string };
const btn = (v: string) => `ward-btn ward-btn--${v} ward-btn--sm`;
const yn = (b?: boolean | null) => (b == null ? "—" : b ? "Yes" : "No");

// A labelled fact — only rendered when it has a value (keeps the fit-screen card tidy).
function Fact({ k, v }: { k: string; v?: string | number | null }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 12.5 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 96, flexShrink: 0 }}>{k}</span>
      <span style={{ color: "var(--text-body)" }}>{v}</span>
    </div>
  );
}

// One application row — its own action state so Approve/Reject errors (e.g. a duplicate email) render
// INLINE, never a 500. The fit-screen fields sit in an expandable "Details" block for a first-pass screen.
function Row({ app, labels }: { app: App; labels: Labels }) {
  const [pState, pAction, pPending] = useActionState(provisionTeacher, undefined);
  const [rState, rAction, rPending] = useActionState(rejectApplication, undefined);
  const [aState, aAction, aPending] = useActionState(archiveApplication, undefined);
  const err = pState?.error || rState?.error || aState?.error;
  const warn = pState?.warning;
  const summary = [app.years_experience != null ? `${app.years_experience} yrs` : null, app.teaches_children ? "teaches 9–13" : null, app.english_level || null].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--surface-card)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Avatar name={app.full_name ?? "?"} size={34} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{app.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }} dir="ltr">
            {app.email}{app.phone ? ` · ${app.phone}` : ""}{app.timezone ? ` · ${app.timezone}` : ""}
          </div>
          {summary && <div style={{ fontSize: 12, color: "var(--text-brand)", marginTop: 2 }}>{summary}</div>}
        </div>
        <form action={pAction}>
          <input type="hidden" name="applicationId" value={app.id} />
          <button type="submit" disabled={pPending} className={btn("success")}>{pPending ? "…" : labels.approve}</button>
        </form>
        <form action={rAction}>
          <input type="hidden" name="applicationId" value={app.id} />
          <button type="submit" disabled={rPending} className={btn("ghost")}>{rPending ? "…" : labels.reject}</button>
        </form>
        <form action={aAction}>
          <input type="hidden" name="applicationId" value={app.id} />
          <button type="submit" disabled={aPending} className={btn("ghost")}>{aPending ? "…" : labels.archive}</button>
        </form>
      </div>

      <details style={{ borderTop: "1px solid var(--ink-100)", paddingTop: 6 }}>
        <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--text-brand)" }}>Details</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 6 }}>
          <Fact k="Experience" v={app.years_experience != null ? `${app.years_experience} years` : null} />
          <Fact k="Teaches 9–13" v={app.teaches_children == null ? null : yn(app.teaches_children)} />
          <Fact k="English" v={app.english_level} />
          <Fact k="Certifications" v={app.certifications} />
          <Fact k="Online 1:1" v={app.online_1to1_experience == null ? null : yn(app.online_1to1_experience)} />
          <Fact k="Availability" v={app.weekly_availability} />
          {app.cv_url && (
            <div style={{ display: "flex", gap: 6, fontSize: 12.5 }}>
              <span style={{ color: "var(--text-muted)", minWidth: 96, flexShrink: 0 }}>CV / link</span>
              <a href={app.cv_url} target="_blank" rel="noreferrer" dir="ltr" style={{ color: "var(--text-brand)", fontWeight: 600, wordBreak: "break-all" }}>{app.cv_url}</a>
            </div>
          )}
          <Fact k="About" v={app.bio} />
          <Fact k="Motivation" v={app.motivation} />
        </div>
      </details>

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
