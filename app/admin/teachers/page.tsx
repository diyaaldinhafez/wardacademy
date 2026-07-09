/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import PendingApplications from "@/components/admin/PendingApplications";
import ArchivedApplications from "@/components/admin/ArchivedApplications";
import TeacherArchiveToggle from "@/components/admin/TeacherArchiveToggle";

export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "" } = await searchParams;
  const archivedView = view === "archived";
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.teachers" });

  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const all = (people ?? []) as any[];
  const { data: tprofiles } = await supabase.from("teacher_profiles").select("instructor_id, archived_at");
  const profByTeacher = new Map<string, any>();
  for (const tp of (tprofiles ?? []) as any[]) profByTeacher.set(tp.instructor_id, tp);

  // A "teacher" is anyone with the instructor role OR a surviving teacher_profiles row (deactivated/
  // archived teachers keep the row). Split by the VISIBILITY dimension: archived_at null = roster.
  const allTeachers = all.filter((p) => ((p.roles as string[]) ?? []).includes("instructor") || profByTeacher.has(p.id));
  const rosterTeachers = allTeachers.filter((p) => !profByTeacher.get(p.id)?.archived_at);
  const archivedTeachers = allTeachers.filter((p) => !!profByTeacher.get(p.id)?.archived_at);

  // Applications: Pending = applied only. Archived view = rejected + archived (distinct badges).
  const { data: applications } = await supabase
    .from("teacher_applications")
    .select("id, full_name, email, phone, bio, timezone, years_experience, teaches_children, certifications, english_level, online_1to1_experience, weekly_availability, cv_url, motivation, status, instructor_id, created_at")
    .in("status", ["applied", "rejected", "archived"])
    .order("created_at", { ascending: false });
  const apps = (applications ?? []) as any[];
  const pendingApps = apps.filter((a) => a.status === "applied");
  const archivedApps = apps.filter((a) => a.status === "rejected" || a.status === "archived");

  const studentsByTeacher = new Map<string, number>();
  for (const p of all) if (((p.roles as string[]) ?? []).includes("learner") && p.assigned_instructor_id) {
    studentsByTeacher.set(p.assigned_instructor_id, (studentsByTeacher.get(p.assigned_instructor_id) ?? 0) + 1);
  }

  const tab = (active: boolean) => ({
    padding: "6px 14px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, textDecoration: "none",
    border: active ? "1.5px solid var(--brand)" : "1.5px solid var(--border-soft)",
    background: active ? "var(--brand-soft)" : "var(--surface-card)",
    color: active ? "var(--text-on-soft)" : "var(--text-muted)",
  }) as const;

  return (
    <>
      {/* View toggle: Active roster+pending vs Archived teachers+applications */}
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <Link href="/admin/teachers" style={tab(!archivedView)}>{t("viewActive")}</Link>
        <Link href="/admin/teachers?view=archived" style={tab(archivedView)}>
          {t("viewArchived")}{archivedApps.length + archivedTeachers.length > 0 ? ` (${archivedApps.length + archivedTeachers.length})` : ""}
        </Link>
      </div>

      {!archivedView ? (
        <>
          {/* Pending applications — Approve mints an account; Reject/Archive move to the Archived view. */}
          <Card variant="soft" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: "var(--ward-purple-200)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ward-purple-800)", display: "flex", alignItems: "center", gap: 8 }}>
              {t("applicationsTitle")} {pendingApps.length > 0 && <Badge tone="brand">{pendingApps.length}</Badge>}
            </div>
            {pendingApps.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("applicationsEmpty")}</p>
            ) : (
              <PendingApplications apps={pendingApps} labels={{ approve: t("approve"), reject: t("reject"), archive: t("archive"), openTeacher: t("openTeacher") }} />
            )}
          </Card>

          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>{t("listIntro")}</p>
          {rosterTeachers.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("listEmpty")}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rosterTeachers.map((teacher) => {
              // Single ACCESS source: active ⇔ the instructor role is present (Deactivate removes it).
              const inactive = !((teacher.roles as string[]) ?? []).includes("instructor");
              return (
                <Card key={teacher.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <Link href={`/admin/teachers/${teacher.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160, textDecoration: "none" }}>
                    <Avatar name={teacher.full_name ?? "?"} size={40} />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{teacher.full_name ?? teacher.id}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {t("studentsCount", { n: studentsByTeacher.get(teacher.id) ?? 0 })}
                      </div>
                    </div>
                  </Link>
                  <Badge tone={inactive ? "neutral" : "success"}>{inactive ? t("inactive") : t("active")}</Badge>
                  <TeacherArchiveToggle instructorId={teacher.id} isArchived={false} labels={{ archive: t("archive"), restore: t("restore") }} />
                  <Link href={`/admin/teachers/${teacher.id}`} className="ward-btn ward-btn--ghost ward-btn--sm">{t("manage")}</Link>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Archived applications (rejected + archived, badged) — restore or permanently delete. */}
          <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" }}>{t("archivedApplicationsTitle")}</div>
            {archivedApps.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("archivedApplicationsEmpty")}</p>
            ) : (
              <ArchivedApplications apps={archivedApps} labels={{ restore: t("restore"), delete: t("deletePermanently"), confirmDelete: t("confirmDelete"), cancel: t("cancel"), rejected: t("statusRejected"), archived: t("statusArchived") }} />
            )}
          </Card>

          {/* Archived teachers — hidden from the roster; access revoked. Restore returns them deactivated. */}
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)", marginTop: 8 }}>{t("archivedTeachersTitle")}</div>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 4px" }}>{t("archivedTeachersHint")}</p>
          {archivedTeachers.length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("archivedTeachersEmpty")}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {archivedTeachers.map((teacher) => (
              <Card key={teacher.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Link href={`/admin/teachers/${teacher.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 160, textDecoration: "none" }}>
                  <Avatar name={teacher.full_name ?? "?"} size={40} />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text-strong)" }}>{teacher.full_name ?? teacher.id}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {t("studentsCount", { n: studentsByTeacher.get(teacher.id) ?? 0 })}
                    </div>
                  </div>
                </Link>
                <Badge tone="neutral">{t("archivedBadge")}</Badge>
                <Badge tone="neutral">{t("noAccessBadge")}</Badge>
                <TeacherArchiveToggle instructorId={teacher.id} isArchived={true} labels={{ archive: t("archive"), restore: t("restore") }} />
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
