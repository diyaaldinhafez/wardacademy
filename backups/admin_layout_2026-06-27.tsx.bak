import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import enMessages from "@/messages/en.json";
import { createClient } from "@/lib/supabase/server";
import { homePathForRoles } from "@/lib/roles";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Ward Academy — Admin",
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

  const [{ count: leadsCount }, { count: requestsCount }] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("archived", false).in("status", ["new", "booked", "testing", "tested"]),
    supabase.from("requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);

  const t = await getTranslations({ locale: "en", namespace: "admin.nav" });
  const today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  // Admin is English by internal decision — force `en` for all client components.
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AdminShell adminName={profile?.full_name ?? user.email ?? t("adminFallback")} today={today} leadsCount={leadsCount ?? 0} requestsCount={requestsCount ?? 0}>
        {children}
      </AdminShell>
    </NextIntlClientProvider>
  );
}
