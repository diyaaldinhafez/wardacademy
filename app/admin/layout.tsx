import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { homePathForRoles } from "@/lib/roles";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Ward Academy — الإدارة",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, roles").eq("id", user.id).single();
  const roles = (profile?.roles as string[]) ?? [];
  if (!roles.includes("admin")) redirect(homePathForRoles(roles));

  const { count: leadsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", ["new", "booked", "testing", "tested"]);

  const today = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <AdminShell adminName={profile?.full_name ?? user.email ?? "الإدارة"} today={today} leadsCount={leadsCount ?? 0}>
      {children}
    </AdminShell>
  );
}
