"use client";

import { useState, type FormEvent } from "react";
import { signup } from "@/lib/content";
import Icon from "./Icon";
import Mascot from "./Mascot";

/**
 * VISUAL ONLY. This form does not submit anywhere, store data, or create an
 * account. On submit it simply shows a thank-you message.
 *
 * TODO (foundation phase): wire real registration + explicit parental consent
 * capture (with timestamp) + booking. Until then, keep this purely presentational.
 */
export default function SignupSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // no network, no storage — visual placeholder only
    setSubmitted(true);
  }

  return (
    <section
      id="signup"
      className="relative overflow-hidden bg-gradient-to-b from-cream-deep to-cream py-20 sm:py-28"
    >
      {/* Playful backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float-slow absolute -left-12 top-16 h-56 w-56 rounded-full bg-coral-100/60 blur-3xl" />
        <div className="animate-float-slower absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <Mascot className="animate-bob mx-auto mb-2 h-24 w-24 drop-shadow-lg" />
          <span className="inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral-100 px-4 py-1.5 text-sm font-semibold text-coral-600">
            <Icon name="check-badge" className="h-4 w-4" />
            {signup.eyebrow}
          </span>
          <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {signup.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
            {signup.subheading}
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-ink/5 bg-white p-6 shadow-xl shadow-brand/5 sm:p-9">
          {submitted ? (
            <SuccessMessage />
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="guardianName"
                  label={signup.fields.guardianName.label}
                  placeholder={signup.fields.guardianName.placeholder}
                  type="text"
                  autoComplete="name"
                />
                <Field
                  id="email"
                  label={signup.fields.email.label}
                  placeholder={signup.fields.email.placeholder}
                  type="email"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="studentName"
                  label={signup.fields.studentName.label}
                  placeholder={signup.fields.studentName.placeholder}
                  type="text"
                />
                <SelectField
                  id="studentAge"
                  label={signup.fields.studentAge.label}
                  placeholder={signup.fields.studentAge.placeholder}
                  options={signup.ageOptions.map((a) => ({
                    value: a,
                    label: `${a} years`,
                  }))}
                />
              </div>

              <SelectField
                id="track"
                label={signup.fields.track.label}
                placeholder={signup.fields.track.placeholder}
                options={signup.trackOptions}
              />

              {/* Parental consent — the heart of the product's trust promise */}
              <label
                htmlFor="consent"
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 bg-cream/60 p-4 transition-colors hover:border-brand/30"
              >
                <input
                  id="consent"
                  type="checkbox"
                  name="consent"
                  required
                  aria-required="true"
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-ink/30 text-brand accent-brand focus:ring-2 focus:ring-brand/40"
                />
                <span className="text-sm leading-relaxed text-ink-soft">
                  {signup.consentLabel}{" "}
                  <span className="text-coral-600" aria-hidden>
                    *
                  </span>
                </span>
              </label>

              <button
                type="submit"
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl active:scale-[0.98]"
              >
                {signup.submit}
                <Icon name="arrow-right" className="h-5 w-5" />
              </button>

              <p className="text-center text-xs font-medium text-ink-muted">
                {signup.reassurance}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function SuccessMessage() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand">
        <Icon name="check" className="h-8 w-8" />
      </span>
      <h3 className="mt-5 font-display text-2xl font-extrabold text-ink">
        {signup.success}
      </h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
        {signup.successDetail}
      </p>
    </div>
  );
}

/* ---- Field primitives --------------------------------------------------- */

type FieldProps = {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  autoComplete?: string;
};

function Field({ id, label, placeholder, type, autoComplete }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
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

type SelectFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  options: readonly { readonly value: string; readonly label: string }[];
};

function SelectField({ id, label, placeholder, options }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          defaultValue=""
          className="w-full appearance-none rounded-2xl border border-ink/15 bg-white px-4 py-3 pr-10 text-base text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
