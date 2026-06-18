import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar, AITrustBadge, Spark } from "@/components/ward/ui";
import { fmtUTC } from "@/lib/datetime";

/* eslint-disable @typescript-eslint/no-explicit-any */
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 12 } as const;
const row = { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--ink-100)" } as const;

function timeOf(iso: string) {
  return new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function TodayPage() {
  const supabase = await createClient();

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const learners = (people ?? []).filter(
    (p: any) =>
      ((p.roles as string[]) ?? []).includes("learner") && (!p.assigned_instructor_id || p.assigned_instructor_id === user?.id),
  );
  const nameOf = new Map<string, string>();
  for (const l of learners) nameOf.set(l.id, (l.full_name as string) ?? l.id);

  const { data: todaySessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id")
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .order("scheduled_at");
  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, learner_id")
    .gte("scheduled_at", end.toISOString())
    .order("scheduled_at")
    .limit(4);

  const { data: placements } = await supabase.from("placement_tests").select("learner_id, status, suggested_level, created_at").order("created_at", { ascending: false });
  const levelOf = new Map<string, string>();
  for (const pl of (placements ?? []) as any[]) if (pl.status === "completed" && !levelOf.has(pl.learner_id)) levelOf.set(pl.learner_id, pl.suggested_level);

  const { data: drafts } = await supabase.from("items").select("id, prompt, format").eq("status", "draft").order("created_at", { ascending: false }).limit(4);
  const { count: reportDraftCount } = await supabase.from("session_reports").select("id", { count: "exact", head: true }).eq("status", "draft");
  const draftCount = (drafts ?? []).length;
  const totalReviews = draftCount + (reportDraftCount ?? 0);

  const sessions = (todaySessions ?? []).length > 0 ? todaySessions! : upcoming ?? [];
  const sessionsLabel = (todaySessions ?? []).length > 0 ? "جلسات اليوم" : "الجلسات القادمة";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Sessions */}
        <Card>
          <div style={secTitle}>{sessionsLabel}</div>
          {sessions.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا جلسات مجدولة. جدوِلها من «تقارير الجلسات».</p>}
          {sessions.map((s: any, i: number) => (
            <div key={s.id} style={{ ...row, ...(i === sessions.length - 1 ? { borderBottom: "none" } : {}) }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-brand)", width: 56, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{timeOf(s.scheduled_at)}</span>
              <Avatar name={nameOf.get(s.learner_id) ?? "?"} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{nameOf.get(s.learner_id) ?? s.learner_id}</span>
                <br />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtUTC(s.scheduled_at)} · {s.duration_minutes} دقيقة</span>
              </span>
              <Link href="/studio/homework" className="ward-btn ward-btn--ghost ward-btn--sm">التحضير</Link>
            </div>
          ))}
        </Card>

        {/* Roster */}
        <Card>
          <div style={secTitle}>الطلاب <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({learners.length})</span></div>
          {learners.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا طلاب بعد.</p>}
          {learners.map((l: any, i: number) => (
            <div key={l.id} style={{ ...row, ...(i === learners.length - 1 ? { borderBottom: "none" } : {}) }}>
              <Avatar name={l.full_name ?? l.id} size={32} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{l.full_name ?? l.id}</span>
              {levelOf.get(l.id) ? <Badge tone="neutral">{levelOf.get(l.id)}</Badge> : <Badge tone="warning">بلا تحديد</Badge>}
              <Link href="/studio/students" className="ward-btn ward-btn--ghost ward-btn--sm">التفاصيل</Link>
            </div>
          ))}
        </Card>
      </div>

      {/* Pending reviews */}
      <Card variant="soft" style={{ borderColor: "var(--ward-purple-200)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Spark size={18} state="idle" />
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ward-purple-800)" }}>بانتظار مراجعتك</span>
          {totalReviews > 0 && <Badge tone="brand">{totalReviews}</Badge>}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>لا يصل شيءٌ للطالب قبل موافقتك.</p>
        {totalReviews === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>كلّ شيءٍ مُراجَع. ✓</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(drafts ?? []).map((d: any) => (
            <div key={d.id} style={{ background: "var(--surface-card)", borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--ward-purple-100)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span dir="ltr" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", flex: 1, fontFamily: "var(--font-en-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.prompt}</span>
                <AITrustBadge status="draft" compact />
              </div>
              <Link href="/studio/reviews" className="ward-btn ward-btn--soft ward-btn--sm" style={{ alignSelf: "flex-start" }}>راجِع واعتمِد</Link>
            </div>
          ))}
          {(reportDraftCount ?? 0) > 0 && (
            <Link href="/studio/reviews" className="ward-btn ward-btn--ghost ward-btn--sm" style={{ alignSelf: "flex-start" }}>
              + {reportDraftCount} تقرير جلسة بانتظار الاعتماد ←
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
