import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import enMessages from "@/messages/en.json";
import { createClient } from "@/lib/supabase/server";
import TeacherShell from "@/components/studio/TeacherShell";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/studio/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const t = await getTranslations({ locale: "en", namespace: "studio.nav" });

  const today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  // The teacher studio is English by internal decision — force `en` for every
  // client component beneath the shell, regardless of the global LOCALE cookie.
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TeacherShell teacherName={profile?.full_name ?? user.email ?? t("teacherFallback")} today={today}>
        {children}
      </TeacherShell>
    </NextIntlClientProvider>
  );
}
