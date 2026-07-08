/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity -- server component: per-request date math is intentional */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { updateTeacherProfile, deactivateTeacher, reactivateTeacher } from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import AvailabilityView from "@/components/admin/AvailabilityView";
import { Card, Badge, Avatar } from "@/components/ward/ui";

const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const ctl = "ward-field__control";
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 12 } as const;
const flabel = { fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 } as const;

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.teachers" });

  const { data: teacher } = await supabase.from("profiles").select("id, full_name, login_email, roles").eq("id", id).maybeSingle();

  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("bio, languages, specialties, phone, start_date, status, notes")
    .eq("instructor_id", id)
    .maybeSingle();

  // A "teacher" is a current instructor OR a deactivated one (teacher_profiles survives, role removed).
  const isActive = ((teacher?.roles as string[]) ?? []).includes("instructor");
  if (!teacher || (!isActive && !tp)) notFound();

  const { data: people } = await supabase.from("profiles").select("id, full_name, roles, assigned_instructor_id");
  const students = (people ?? []).filter((p: any) => ((p.roles as string[]) ?? []).includes("learner") && p.assigned_instructor_id === id);
  const studentIds = students.map((s: any) => s.id);

  let avgRating: number | null = null;
  if (studentIds.length) {
    const { data: evs } = await supabase.from("evaluations").select("teacher_rating").in("learner_id", studentIds);
    const vals = (evs ?? []).map((e: any) => e.teacher_rating).filter((n: any) => typeof n === "number");
    if (vals.length) avgRating = Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10;
  }

  const { data: sessions } = await supabase.from("sessions").select("scheduled_at, status").eq("instructor_id", id);
  const nowMs = Date.now();
  const sessList = (sessions ?? []) as any[];
  const sessDone = sessList.filter((s) => s.status === "completed").length;
  const sessUpcoming = sessList.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() >= nowMs).length;
  const sessMissed = sessList.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() < nowMs).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <Link href="/admin/teachers" className={btn("ghost")} style={{ alignSelf: "flex-start" }}>{t("back")}</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={teacher.full_name ?? "?"} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{teacher.full_name ?? teacher.id}</div>
          <div dir="ltr" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{teacher.login_email}</div>
        </div>
        <Badge tone={isActive ? "success" : "neutral"}>{isActive ? t("active") : t("inactive")}</Badge>
        {isActive ? (
          <form action={deactivateTeacher}>
            <input type="hidden" name="instructorId" value={id} />
            <SubmitButton pendingText="…" className={btn("danger")}>{t("deactivate")}</SubmitButton>
          </form>
        ) : (
          <form action={reactivateTeacher}>
            <input type="hidden" name="instructorId" value={id} />
            <SubmitButton pendingText="…" className={btn("success")}>{t("reactivate")}</SubmitButton>
          </form>
        )}
      </div>
      {!isActive && <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>{t("deactivatedNote")}</p>}

      {/* Performance */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>{t("performanceTitle")}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13.5, color: "var(--text-body)" }}>
          <span>{t("avgRating")} <strong style={{ color: "var(--leaf-700)" }}>{avgRating != null ? `${avgRating} / 5` : "—"}</strong></span>
          <span>{t("studentsLabel")} <strong style={{ color: "var(--text-strong)" }}>{students.length}</strong></span>
          <span>{t("sessionsDone")} <strong style={{ color: "var(--leaf-700)" }}>{sessDone}</strong></span>
          <span>{t("upcoming")} <strong style={{ color: "var(--text-strong)" }}>{sessUpcoming}</strong></span>
          <span>{t("missed")} <strong style={{ color: sessMissed > 0 ? "var(--rose-700)" : "var(--text-strong)" }}>{sessMissed}</strong></span>
        </div>
      </Card>

      {/* Assigned students */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>{t("assignedTitle")} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({students.length})</span></div>
        {students.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("noAssigned")}</p>}
        {students.map((s: any) => (
          <Link key={s.id} href={`/admin/students/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "6px 0", borderBottom: "1px solid var(--ink-100)" }}>
            <Avatar name={s.full_name ?? "?"} size={30} />
            <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>{s.full_name ?? s.id}</span>
          </Link>
        ))}
      </Card>

      {/* Profile */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={secTitle}>{t("profileTitle")}</div>
        <form action={updateTeacherProfile} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="hidden" name="instructorId" value={id} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div>
              <label style={flabel}>{t("whatsapp")}</label>
              <input name="phone" defaultValue={tp?.phone ?? ""} dir="ltr" className={ctl} style={{ width: 180 }} placeholder="+9665…" />
            </div>
            <div>
              <label style={flabel}>{t("joinDate")}</label>
              <input name="startDate" type="date" defaultValue={tp?.start_date ?? ""} dir="ltr" className={ctl} style={{ width: 170 }} />
            </div>
            <div>
              <label style={flabel}>{t("status")}</label>
              <select name="status" defaultValue={tp?.status ?? "active"} className={ctl} style={{ width: 140 }}>
                <option value="active">{t("active")}</option>
                <option value="inactive">{t("inactive")}</option>
              </select>
            </div>
          </div>
          <div>
            <label style={flabel}>{t("languages")}</label>
            <input name="languages" defaultValue={tp?.languages ?? ""} className={ctl} placeholder={t("languagesPh")} />
          </div>
          <div>
            <label style={flabel}>{t("specialties")}</label>
            <input name="specialties" defaultValue={tp?.specialties ?? ""} className={ctl} placeholder={t("specialtiesPh")} />
          </div>
          <div>
            <label style={flabel}>{t("bio")}</label>
            <textarea name="bio" rows={2} defaultValue={tp?.bio ?? ""} className={ctl} placeholder={t("bioPh")} />
          </div>
          <div>
            <label style={flabel}>{t("opsNote")}</label>
            <textarea name="notes" rows={2} defaultValue={tp?.notes ?? ""} className={ctl} placeholder={t("opsNotePh")} />
          </div>
          <SubmitButton pendingText="…" className={btn("secondary", "md")}>{t("saveProfile")}</SubmitButton>
        </form>
      </Card>

      {/* Availability (the teacher's schedule) */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-strong)", marginBottom: 10 }}>{t("scheduleTitle")}</h2>
        <AvailabilityView instructorId={id} />
      </div>
    </div>
  );
}
