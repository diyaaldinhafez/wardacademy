/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";

export default async function TeachersPage() {
  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const all = (people ?? []) as any[];
  const teachers = all.filter((p) => ((p.roles as string[]) ?? []).includes("instructor"));
  const { data: tprofiles } = await supabase.from("teacher_profiles").select("instructor_id, status, specialties");
  const profByTeacher = new Map<string, any>();
  for (const t of (tprofiles ?? []) as any[]) profByTeacher.set(t.instructor_id, t);

  const studentsByTeacher = new Map<string, number>();
  for (const p of all) if (((p.roles as string[]) ?? []).includes("learner") && p.assigned_instructor_id) {
    studentsByTeacher.set(p.assigned_instructor_id, (studentsByTeacher.get(p.assigned_instructor_id) ?? 0) + 1);
  }

  return (
    <>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>المعلّمون وبياناتهم. (تُضاف معلّماتٌ إضافيات في نسخةٍ لاحقة.)</p>
      {teachers.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا معلّمين بعد.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {teachers.map((t) => {
          const tp = profByTeacher.get(t.id);
          const inactive = tp?.status === "inactive";
          return (
            <Card key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Link href={`/admin/teachers/${t.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160, textDecoration: "none" }}>
                <Avatar name={t.full_name ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{t.full_name ?? t.id}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    {studentsByTeacher.get(t.id) ?? 0} طالب{tp?.specialties ? ` · ${tp.specialties}` : ""}
                  </div>
                </div>
              </Link>
              <Badge tone={inactive ? "neutral" : "success"}>{inactive ? "متوقّفة" : "نشطة"}</Badge>
              <Link href={`/admin/teachers/${t.id}`} className="ward-btn ward-btn--ghost ward-btn--sm">إدارة</Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
