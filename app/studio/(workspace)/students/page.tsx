/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const learners = (people ?? []).filter(
    (p: any) => ((p.roles as string[]) ?? []).includes("learner") && (!p.assigned_instructor_id || p.assigned_instructor_id === user?.id),
  );

  const { data: placements } = await supabase.from("placement_tests").select("learner_id, status, suggested_level, created_at").order("created_at", { ascending: false });
  const plOf = new Map<string, any>();
  for (const pl of (placements ?? []) as any[]) if (!plOf.has(pl.learner_id)) plOf.set(pl.learner_id, pl);

  const { data: studyPlans } = await supabase.from("study_plans").select("learner_id, status, created_at").order("created_at", { ascending: false });
  const planOf = new Map<string, any>();
  for (const sp of (studyPlans ?? []) as any[]) if (!planOf.has(sp.learner_id)) planOf.set(sp.learner_id, sp);

  const { data: sessions } = await supabase.from("sessions").select("learner_id, scheduled_at, status");
  const nowIso = new Date().toISOString();
  const upcomingByLearner = new Map<string, number>();
  for (const s of (sessions ?? []) as any[]) {
    if (s.status === "scheduled" && s.scheduled_at >= nowIso) upcomingByLearner.set(s.learner_id, (upcomingByLearner.get(s.learner_id) ?? 0) + 1);
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>
        الطلاب <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({learners.length})</span>
      </h2>
      {learners.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا طلاب بعد — تُسنَد الحسابات من الإدارة.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
        {learners.map((l: any) => {
          const pl = plOf.get(l.id);
          const plan = planOf.get(l.id);
          const upcoming = upcomingByLearner.get(l.id) ?? 0;
          return (
            <Link key={l.id} href={`/studio/students/${l.id}`} style={{ textDecoration: "none" }}>
              <Card style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={l.full_name ?? l.id} size={40} />
                  <span style={{ fontWeight: 700, color: "var(--text-strong)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.full_name ?? l.id}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pl?.status === "completed" ? (
                    <Badge tone="success">المستوى {pl.suggested_level}</Badge>
                  ) : pl?.status === "in_progress" ? (
                    <Badge tone="warning">التحديد جارٍ</Badge>
                  ) : (
                    <Badge tone="neutral">بلا تحديد</Badge>
                  )}
                  {plan ? (
                    plan.status === "approved" ? <Badge tone="success">خطّة معتمَدة</Badge> : <Badge tone="warning">خطّة مسودّة</Badge>
                  ) : (
                    <Badge tone="neutral">بلا خطّة</Badge>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
                  <span style={{ fontSize: 12.5, color: upcoming > 0 ? "var(--leaf-700)" : "var(--text-muted)" }}>
                    {upcoming > 0 ? `${upcoming} موعد قادم` : "لا مواعيد قادمة"}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>التفاصيل ←</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
