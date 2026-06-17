"use client";

import { useActionState } from "react";
import { signupGuardian } from "@/app/signup/actions";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupGuardian, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Your name
        <input name="name" required className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" required autoComplete="email" className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500" />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
        {pending ? "Creating account…" : "Create parent account"}
      </button>
    </form>
  );
}
