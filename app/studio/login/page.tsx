import Link from "next/link";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import enMessages from "@/messages/en.json";
import { createClient } from "@/lib/supabase/server";
import { homePathForRoles } from "@/lib/roles";
import LoginForm from "@/components/studio/LoginForm";
import FlowerMark from "@/components/FlowerMark";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("roles").eq("id", user.id).single();
    redirect(homePathForRoles(profile?.roles));
  }

  const t = await getTranslations({ locale: "en", namespace: "studio.login" });

  // The studio login is English by internal decision — force `en` for LoginForm.
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <main dir="ltr" className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-ward-1">
          <div className="mb-6 flex flex-col items-center text-center">
            <FlowerMark className="h-12 w-12" />
            <h1 className="mt-3 text-xl font-bold text-ink">{t("title")}</h1>
            <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-ink-soft">
            {t("newGuardian")}{" "}
            <Link href="/enroll" className="font-semibold text-brand hover:underline">
              {t("enrol")}
            </Link>
          </p>
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
