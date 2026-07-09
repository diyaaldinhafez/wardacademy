/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity -- server component: per-request date math is intentional */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { updateTeacherProfile } from "@/app/admin/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import TeacherStatusToggle from "@/components/admin/TeacherStatusToggle";
import TeacherArchiveToggle from "@/components/admin/TeacherArchiveToggle";
import ResendInviteButton from "@/components/admin/ResendInviteButton";
import AvailabilityView from "@/components/admin/AvailabilityView";
import { Card, Badge, Avatar } from "@/components/ward/ui";

const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;
const ctl = "ward-field__control";
const secTitle = { fontSize: 15, fontWeight: 700, color: "var(--text-strong)", marginBottom: 12 } as const;
const flabel = { fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 } as const;

// A labelled read-only fact — only rendered when it has a value (mirrors PendingApplications.Fact).
function Fact({ k, v }: { k: string; v?: string | number | null }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 12.5 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 120, flexShrink: 0 }}>{k}</span>
      <span style={{ color: "var(--text-body)", whiteSpace: "pre-wrap" }}>{v}</span>
    </div>
  );
}

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.teachers" });

  const { data: teacher } = await supabase.from("profiles").select("id, full_name, login_email, roles").eq("id", id).maybeSingle();

  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("bio, phone, start_date, notes, archived_at")
    .eq("instructor_id", id)
    .maybeSingle();

  // "View original application" — resolved through the durable link (0073), NOT email. Null for
  // manually-created teachers (e.g. Ghinwa, no application) → the panel shows "No application on file".
  const { data: application } = await supabase
    .from("teacher_applications")
    .select("phone, bio, note, timezone, years_experience, teaches_children, certifications, english_level, online_1to1_experience, weekly_availability, cv_url, motivation, created_at")
    .eq("instructor_id", id)
    .maybeSingle();

  // Two independent dimensions: ACCESS (isActive ⇔ instructor role) and VISIBILITY (isArchived ⇔
  // teacher_profiles.archived_at set). A "teacher" is a current instructor OR one with a surviving
  // teacher_profiles row (deactivated/archived).
  const isActive = ((teacher?.roles as string[]) ?? []).includes("instructor");
  const isArchived = !!tp?.archived_at;
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
        <div style={{ display: "flex", gap: 6 }}>
          <Badge tone={isActive ? "success" : "neutral"}>{isActive ? t("active") : t("inactive")}</Badge>
          {isArchived && <Badge tone="neutral">{t("archivedBadge")}</Badge>}
        </div>
      </div>
      {/* Two-dimension controls: ACCESS (deactivate/reactivate) vs VISIBILITY (archive/restore). */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        <TeacherStatusToggle instructorId={id} isActive={isActive} labels={{ deactivate: t("deactivate"), reactivate: t("reactivate") }} />
        <TeacherArchiveToggle instructorId={id} isArchived={isArchived} labels={{ archive: t("archive"), restore: t("restore") }} />
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{t("accessVsVisibilityLegend")}</p>
      {!isActive && <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>{t("deactivatedNote")}</p>}
      {isActive && <ResendInviteButton instructorId={id} label={t("resendInvite")} sentLabel={t("inviteResent")} />}

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

      {/* Profile — ADMIN-OWNED fields only (phone, join date, internal notes). Status is set by the
          Deactivate/Reactivate button above (single source); bio is teacher-owned (edited in /studio)
          and shown read-only here. */}
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
          </div>
          <div>
            <label style={flabel}>{t("opsNote")}</label>
            <textarea name="notes" rows={2} defaultValue={tp?.notes ?? ""} className={ctl} placeholder={t("opsNotePh")} />
          </div>
          <SubmitButton pendingText="…" className={btn("secondary", "md")}>{t("saveProfile")}</SubmitButton>
        </form>
        <div style={{ borderTop: "1px solid var(--ink-100)", paddingTop: 10 }}>
          <label style={flabel}>{t("bio")}</label>
          <p style={{ fontSize: 13.5, color: tp?.bio ? "var(--text-body)" : "var(--text-muted)", margin: "2px 0 4px", whiteSpace: "pre-wrap" }}>
            {tp?.bio || t("bioEmpty")}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{t("bioOwnedNote")}</p>
        </div>
      </Card>

      {/* View original application — the immutable archive, resolved via the durable link (0073). */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={secTitle}>{t("originalApplicationTitle")}</div>
        {!application ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{t("originalApplicationNone")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Fact k="Experience" v={application.years_experience != null ? `${application.years_experience} years` : null} />
            <Fact k="Teaches 9–13" v={application.teaches_children == null ? null : application.teaches_children ? "Yes" : "No"} />
            <Fact k="English" v={application.english_level} />
            <Fact k="Certifications" v={application.certifications} />
            <Fact k="Online 1:1" v={application.online_1to1_experience == null ? null : application.online_1to1_experience ? "Yes" : "No"} />
            <Fact k="Availability" v={application.weekly_availability} />
            <Fact k="Timezone" v={application.timezone} />
            <Fact k="Phone (as applied)" v={application.phone} />
            {application.cv_url && (
              <div style={{ display: "flex", gap: 6, fontSize: 12.5 }}>
                <span style={{ color: "var(--text-muted)", minWidth: 120, flexShrink: 0 }}>CV / link</span>
                <a href={application.cv_url} target="_blank" rel="noreferrer" dir="ltr" style={{ color: "var(--text-brand)", fontWeight: 600, wordBreak: "break-all" }}>{application.cv_url}</a>
              </div>
            )}
            <Fact k="About (as applied)" v={application.bio} />
            <Fact k="Motivation" v={application.motivation} />
            <Fact k="Note" v={application.note} />
          </div>
        )}
      </Card>

      {/* Availability (the teacher's schedule) */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-strong)", marginBottom: 10 }}>{t("scheduleTitle")}</h2>
        <AvailabilityView instructorId={id} />
      </div>
    </div>
  );
}
