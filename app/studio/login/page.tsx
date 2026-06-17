import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/studio/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/studio");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Ward Academy Studio</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Teacher sign in</p>
        <LoginForm />
      </div>
    </main>
  );
}
