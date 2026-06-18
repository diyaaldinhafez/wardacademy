import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import TeacherShell from "@/components/studio/TeacherShell";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  // Sidebar badge: AI drafts (items + session reports) awaiting review.
  const [{ count: itemDrafts }, { count: reportDrafts }] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("session_reports").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);

  const today = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <TeacherShell teacherName={profile?.full_name ?? user.email ?? "المعلّم"} today={today} reviewsCount={(itemDrafts ?? 0) + (reportDrafts ?? 0)}>
      {children}
    </TeacherShell>
  );
}
