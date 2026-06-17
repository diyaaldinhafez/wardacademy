"use client";

import { useActionState } from "react";
import { login } from "@/app/studio/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
