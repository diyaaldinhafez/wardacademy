import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import arMessages from "@/messages/ar.json";
import { createAdminClient } from "@/lib/supabase/admin";
import LeadTestForm from "@/components/LeadTestForm";
import FlowerMark from "@/components/FlowerMark";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "ar", namespace: "placement" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-brand-100 bg-white p-8 text-center text-ink shadow-ward-1">{children}</div>;
}

// PA-2: /t (placement) is Arabic-only — force ar (provider locale="ar" wraps the client
// LeadTestForm) + own dir="rtl" lang="ar" so the root LOCALE cookie can't flip it. The CEFR
// question CONTENT (q.prompt/options) stays as authored — only the UI chrome is forced Arabic.
export default async function LeadTestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations({ locale: "ar", namespace: "placement" });
  const admin = createAdminClient();
  const { data: test } = await admin
    .from("lead_tests")
    .select("id, status, suggested_level")
    .eq("share_token", token)
    .single();

  let questions: { id: string; prompt: string; content: unknown }[] = [];
  if (test?.status === "shared") {
    const { data } = await admin
      .from("lead_test_questions")
      .select("id, prompt, content, position")
      .eq("lead_test_id", test.id)
      .order("position");
    questions = data ?? [];
  }

  return (
   <NextIntlClientProvider locale="ar" messages={arMessages}>
    <main dir="rtl" lang="ar" className="flex min-h-screen flex-col items-center bg-cream px-5 py-6">
      <div className="flex w-full flex-1 items-center justify-center pb-12 pt-4">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <FlowerMark className="mx-auto h-12 w-12" />
            <h1 className="mt-3 text-2xl font-bold text-ink">{t("heading")}</h1>
          </div>

          {!test && <Card>{t("invalidLink")}</Card>}
          {test?.status === "draft" && <Card>{t("notReady")}</Card>}
          {test?.status === "completed" && (
            <Card>
              <p className="text-ink">
                {t("suggestedLevel")} <span className="text-2xl font-bold text-brand-700">{test.suggested_level ?? "—"}</span>
              </p>
              <p className="mt-2 text-sm text-ink-soft">{t("completedNote")}</p>
            </Card>
          )}
          {test?.status === "shared" && <LeadTestForm token={token} questions={questions} />}
        </div>
      </div>
    </main>
   </NextIntlClientProvider>
  );
}
