import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Avatar } from "@/components/ward/ui";
import ProfileBioForm from "@/components/studio/ProfileBioForm";

const flabel = { fontSize: 13, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 } as const;
const fval = { fontSize: 14, color: "var(--text-body)", margin: 0 } as const;

// Teacher self-service profile (coherence redesign, 0073). The teacher edits the ONE field she owns —
// her BIO — via set_my_teacher_bio (bio-only, own-row-only). Admin-owned fields (phone, join date,
// status) are shown READ-ONLY. Forced-English internal surface, mobile-first.
export default async function StudioProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const t = await getTranslations({ locale: "en", namespace: "studio.profile" });

  const { data: profile } = await supabase.from("profiles").select("full_name, login_email, roles").eq("id", user.id).single();
  // Owner-scoped SELECT (0073 policy) — the teacher reads only her own row.
  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("bio, phone, start_date")
    .eq("instructor_id", user.id)
    .maybeSingle();

  const isActive = ((profile?.roles as string[]) ?? []).includes("instructor");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={profile?.full_name ?? user.email ?? "?"} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{profile?.full_name ?? user.email}</div>
          <div dir="ltr" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{profile?.login_email ?? user.email}</div>
        </div>
        <Badge tone={isActive ? "success" : "neutral"}>{isActive ? t("active") : t("inactive")}</Badge>
      </div>

      {/* Teacher-owned: bio */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{t("bioTitle")}</div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>{t("bioHint")}</p>
        <ProfileBioForm initialBio={tp?.bio ?? ""} />
      </Card>

      {/* Admin-owned: read-only */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{t("adminOwnedTitle")}</div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>{t("adminOwnedHint")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          <div>
            <span style={flabel}>{t("phone")}</span>
            <p dir="ltr" style={fval}>{tp?.phone || "—"}</p>
          </div>
          <div>
            <span style={flabel}>{t("joinDate")}</span>
            <p dir="ltr" style={fval}>{tp?.start_date || "—"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
