import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import LeadTestForm from "@/components/LeadTestForm";
import FlowerMark from "@/components/FlowerMark";

export const metadata: Metadata = {
  title: "اختبار تحديد المستوى — أكاديمية وَرد",
  robots: { index: false, follow: false },
};

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-brand-100 bg-white p-8 text-center text-ink shadow-ward-1">{children}</div>;
}

export default async function LeadTestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <FlowerMark className="mx-auto h-12 w-12" />
          <h1 className="mt-3 text-2xl font-bold text-ink">اختبار تحديد المستوى</h1>
        </div>

        {!test && <Card>رابطٌ غير صالح أو منتهٍ.</Card>}
        {test?.status === "draft" && <Card>الاختبار غير جاهزٍ بعد — سيرسله المعلّم قريباً.</Card>}
        {test?.status === "completed" && (
          <Card>
            <p className="text-ink">
              المستوى المقترح: <span className="text-2xl font-bold text-brand-700">{test.suggested_level ?? "—"}</span>
            </p>
            <p className="mt-2 text-sm text-ink-soft">تمّ حلّ هذا الاختبار، والنتيجة مع المعلّم.</p>
          </Card>
        )}
        {test?.status === "shared" && <LeadTestForm token={token} questions={questions} />}
      </div>
    </main>
  );
}
