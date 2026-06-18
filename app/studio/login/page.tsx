import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-ward-1">
        <div className="mb-6 flex flex-col items-center text-center">
          <FlowerMark className="h-12 w-12" />
          <h1 className="mt-3 text-xl font-bold text-ink">أكاديمية وَرد</h1>
          <p className="mt-1 text-sm text-ink-soft">تسجيل الدخول</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-ink-soft">
          وليّ أمرٍ جديد؟{" "}
          <Link href="/enroll" className="font-semibold text-brand hover:underline">
            سجّل طفلك
          </Link>
        </p>
      </div>
    </main>
  );
}
