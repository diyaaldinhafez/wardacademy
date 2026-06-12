"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Mascot from "./Mascot";
import Icon from "./Icon";
import Button from "./ui/Button";
import { useT } from "./LanguageProvider";

/**
 * VISUAL ONLY login form (email + password). No auth backend — submitting just
 * shows a friendly "preview" note and points new users to the free trial.
 */
export default function LoginScreen() {
  const t = useT();
  const L = t.login;
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // no auth backend — visual only
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Ward Academy">
          <Mascot className="h-9 w-9" title="" />
          <span className="font-display text-lg font-bold text-ink">Ward Academy</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-brand">
          <Icon name="arrow-right" className="rtl-flip h-4 w-4 rotate-180" />
          {t.ui.backHome}
        </Link>
      </header>

      <div className="mx-auto max-w-md px-5 pb-20">
        <div className="text-center">
          <Mascot className="mx-auto mb-2 h-16 w-16 drop-shadow" title="" />
          <h1 className="font-display text-3xl font-bold text-ink">{L.title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-base text-ink-soft">{L.subtitle}</p>
        </div>

        <div className="mt-8 rounded-3xl border border-ink/5 bg-white p-6 shadow-ward-2 sm:p-8">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand">
                <Icon name="check" className="h-7 w-7" />
              </span>
              <p className="text-base leading-relaxed text-ink-soft">{L.demoNote}</p>
              <Button href="/enroll" variant="warm" size="lg" className="w-full">
                {L.register}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
              <Field id="email" label={L.email.label} placeholder={L.email.placeholder} type="email" autoComplete="email" />
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="password" className="text-sm font-semibold text-ink">
                    {L.password.label}
                  </label>
                  <span className="text-xs font-semibold text-brand-600 hover:underline">
                    {L.forgot}
                  </span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={L.password.placeholder}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              <button
                type="submit"
                className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-ward-1 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {L.submit}
              </button>
            </form>
          )}
        </div>

        {!submitted && (
          <p className="mt-6 text-center text-sm text-ink-soft">
            {L.noAccount}{" "}
            <Link href="/enroll" className="font-semibold text-brand-600 hover:underline">
              {L.register}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  placeholder,
  type,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </div>
  );
}
