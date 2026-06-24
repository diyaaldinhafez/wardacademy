import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { updateRequestStatus } from "@/app/admin/actions";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import { REQUEST_TYPE_EN, REQUEST_TYPE_TONE, REQUEST_STATUS_EN, REQUEST_STATUS_TONE } from "@/lib/requests";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "active" } = await searchParams;
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.requests" });
  const TABS = [
    { key: "active", label: t("tabActive") },
    { key: "closed", label: t("tabClosed") },
    { key: "all", label: t("tabAll") },
  ];

  const { data: reqs } = await supabase
    .from("requests")
    .select("id, learner_id, type, details, status, resolution, created_at")
    .order("created_at", { ascending: false });
  const { data: people } = await supabase.from("profiles").select("id, full_name");
  const nameOf = new Map<string, string>();
  for (const p of (people ?? []) as any[]) nameOf.set(p.id, p.full_name ?? p.id);

  const all = (reqs ?? []) as any[];
  const counts: Record<string, number> = {
    active: all.filter((r) => r.status !== "closed").length,
    closed: all.filter((r) => r.status === "closed").length,
    all: all.length,
  };
  const list = view === "all" ? all : view === "closed" ? all.filter((r) => r.status === "closed") : all.filter((r) => r.status !== "closed");

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TABS.map((t) => {
          const active = view === t.key;
          return (
            <Link
              key={t.key}
              href={`/admin/requests?view=${t.key}`}
              className="ward-btn ward-btn--sm"
              style={{ background: active ? "var(--brand)" : "var(--surface-card)", color: active ? "#fff" : "var(--text-muted)", border: active ? "none" : "1px solid var(--border-soft)" }}
            >
              {t.label}
              <span style={{ marginInlineStart: 6, opacity: 0.8 }}>{counts[t.key] ?? 0}</span>
            </Link>
          );
        })}
      </div>

      {list.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("empty")}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((r) => (
          <Card key={r.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Avatar name={nameOf.get(r.learner_id) ?? "?"} size={32} />
              <Link href={`/admin/students/${r.learner_id}`} style={{ fontWeight: 700, color: "var(--text-strong)", textDecoration: "none" }}>
                {nameOf.get(r.learner_id) ?? "student"}
              </Link>
              <Badge tone={REQUEST_TYPE_TONE[r.type] ?? "neutral"}>{REQUEST_TYPE_EN[r.type] ?? r.type}</Badge>
              <Badge tone={REQUEST_STATUS_TONE[r.status] ?? "neutral"}>{REQUEST_STATUS_EN[r.status] ?? r.status}</Badge>
              <span style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--text-muted)" }}>{fmtUTC(r.created_at)}</span>
            </div>
            {r.details && <p style={{ fontSize: 13.5, color: "var(--text-body)" }}>{r.details}</p>}
            {r.resolution && <p style={{ fontSize: 13, color: "var(--leaf-700)" }}>{t("resolutionLabel")} {r.resolution}</p>}
            {r.status !== "closed" && (
              <form action={updateRequestStatus} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <input type="hidden" name="requestId" value={r.id} />
                <input type="hidden" name="learnerId" value={r.learner_id} />
                <input name="resolution" placeholder={t("resolutionPlaceholder")} className="ward-field__control" style={{ width: "auto", flex: 1, minWidth: 180 }} />
                {r.status === "open" && (
                  <button type="submit" name="status" value="in_progress" className={btn("secondary")}>{t("inProgress")}</button>
                )}
                <button type="submit" name="status" value="closed" className={btn("success")}>{t("close")}</button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
