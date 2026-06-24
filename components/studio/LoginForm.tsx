"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/app/studio/actions";

const field = "rounded-2xl border border-brand-100 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-brand-400";

export default function LoginForm() {
  const t = useTranslations("studio.login");
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4" dir="ltr">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
        {t("email")}
        <input name="email" type="email" required autoComplete="email" dir="ltr" className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
        {t("password")}
        <input name="password" type="password" required autoComplete="current-password" dir="ltr" className={field} />
      </label>

      {state?.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 font-semibold text-white shadow-ward-1 transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? t("signingIn") : t("signIn")}
      </button>
    </form>
  );
}
