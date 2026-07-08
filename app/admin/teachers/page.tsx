/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import PendingApplications from "@/components/admin/PendingApplications";

export default async function TeachersPage() {
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.teachers" });
  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const all = (people ?? []) as any[];
  const { data: tprofiles } = await supabase.from("teacher_profiles").select("instructor_id, status, specialties");
  const profByTeacher = new Map<string, any>();
  for (const t of (tprofiles ?? []) as any[]) profByTeacher.set(t.instructor_id, t);
  // Include DEACTIVATED teachers (a teacher_profiles row survives; the instructor role is removed on
  // deactivate) so admin can still find + reactivate them — not just current instructor-role profiles.
  const teachers = all.filter((p) => ((p.roles as string[]) ?? []).includes("instructor") || profByTeacher.has(p.id));

  // §9(f): pending self-service applications awaiting review (the ADD-teacher entry point).
  const { data: applications } = await supabase
    .from("teacher_applications")
    .select("id, full_name, email, phone, languages, specialties, bio, note, created_at")
    .eq("status", "applied")
    .order("created_at", { ascending: false });
  const apps = (applications ?? []) as any[];

  const studentsByTeacher = new Map<string, number>();
  for (const p of all) if (((p.roles as string[]) ?? []).includes("learner") && p.assigned_instructor_id) {
    studentsByTeacher.set(p.assigned_instructor_id, (studentsByTeacher.get(p.assigned_instructor_id) ?? 0) + 1);
  }

  return (
    <>
      {/* Pending applications — Approve mints an instructor account (provisionTeacher); Reject sets status. */}
      <Card variant="soft" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: "var(--ward-purple-200)" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ward-purple-800)", display: "flex", alignItems: "center", gap: 8 }}>
          {t("applicationsTitle")} {apps.length > 0 && <Badge tone="brand">{apps.length}</Badge>}
        </div>
        {apps.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("applicationsEmpty")}</p>
        ) : (
          <PendingApplications apps={apps} labels={{ approve: t("approve"), reject: t("reject"), openTeacher: t("openTeacher") }} />
        )}
      </Card>

      <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>{t("listIntro")}</p>
      {teachers.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("listEmpty")}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {teachers.map((teacher) => {
          const tp = profByTeacher.get(teacher.id);
          const inactive = tp?.status === "inactive";
          return (
            <Card key={teacher.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Link href={`/admin/teachers/${teacher.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160, textDecoration: "none" }}>
                <Avatar name={teacher.full_name ?? "?"} size={40} />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{teacher.full_name ?? teacher.id}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    {t("studentsCount", { n: studentsByTeacher.get(teacher.id) ?? 0 })}{tp?.specialties ? ` · ${tp.specialties}` : ""}
                  </div>
                </div>
              </Link>
              <Badge tone={inactive ? "neutral" : "success"}>{inactive ? t("inactive") : t("active")}</Badge>
              <Link href={`/admin/teachers/${teacher.id}`} className="ward-btn ward-btn--ghost ward-btn--sm">{t("manage")}</Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
