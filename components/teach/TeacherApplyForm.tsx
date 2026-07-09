"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { submitTeacherApplication } from "@/app/teach/actions";
import FlowerMark from "@/components/FlowerMark";

const ctl = "ward-field__control";
const label = "mb-1 block text-sm font-semibold text-ink";
const pill = "cursor-pointer rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-ink has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50";

function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-1.5">
      {labels.map((l, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={l} className="flex items-center gap-1.5">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-brand text-white" : done ? "bg-leaf text-white" : "bg-brand-50 text-ink-soft"}`}>{done ? "✓" : n}</span>
            <span className={`text-sm font-semibold ${active ? "text-brand-700" : "text-ink-soft"}`}>{l}</span>
            {n < labels.length && <span className="mx-1 h-px w-4 bg-brand-100" />}
          </div>
        );
      })}
    </div>
  );
}

function YesNo({ name, yes, no }: { name: string; yes: string; no: string }) {
  return (
    <div className="flex gap-2">
      <label className={pill}><input type="radio" name={name} value="yes" className="sr-only" /> {yes}</label>
      <label className={pill}><input type="radio" name={name} value="no" className="sr-only" /> {no}</label>
    </div>
  );
}

export default function TeacherApplyForm() {
  const t = useTranslations("teach");
  const [state, action, pending] = useActionState(submitTeacherApplication, undefined);
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const steps = t.raw("steps") as string[];
  const levels = t.raw("levels") as Record<string, string>;

  if (state?.ok) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <FlowerMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold text-ink">{t("thanksTitle")}</h1>
        <p className="mt-3 text-sm text-ink-soft">{t("thanksBody")}</p>
      </div>
    );
  }

  // Gate leaving Step 1 on the two required fields (they stay mounted/hidden for the single submit).
  const next = () => {
    if (step === 1) {
      const f = formRef.current;
      const nameOk = !!f?.elements.namedItem("fullName") && (f.elements.namedItem("fullName") as HTMLInputElement).value.trim();
      const emailInput = f?.elements.namedItem("email") as HTMLInputElement | null;
      if (!nameOk || !emailInput?.value.trim()) { emailInput?.reportValidity?.(); (f?.elements.namedItem("fullName") as HTMLInputElement)?.reportValidity?.(); return; }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-2 text-center">
        <FlowerMark className="mx-auto h-12 w-12" />
        <h1 className="mt-3 text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>
      <Steps current={step} labels={steps} />

      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        {/* Step 1 — About you */}
        <div hidden={step !== 1} className="flex flex-col gap-3">
          <label><span className={label}>{t("fullName")} *</span><input name="fullName" required className={ctl} placeholder={t("fullNamePh")} /></label>
          <label><span className={label}>{t("email")} *</span><input name="email" type="email" required dir="ltr" className={ctl} placeholder={t("emailPh")} /></label>
          <label><span className={label}>{t("phone")}</span><input name="phone" type="tel" dir="ltr" className={ctl} placeholder={t("phonePh")} /></label>
          <label><span className={label}>{t("timezone")}</span><input name="timezone" className={ctl} placeholder={t("timezonePh")} /></label>
        </div>

        {/* Step 2 — Qualifications & experience */}
        <div hidden={step !== 2} className="flex flex-col gap-3">
          <p className="text-xs text-ink-soft">{t("step2Hint")}</p>
          <label><span className={label}>{t("yearsExperience")}</span><input name="yearsExperience" type="number" min={0} inputMode="numeric" className={ctl} placeholder={t("yearsExperiencePh")} /></label>
          <div><span className={label}>{t("teachesChildren")}</span><YesNo name="teachesChildren" yes={t("yes")} no={t("no")} /></div>
          <label><span className={label}>{t("certifications")}</span><input name="certifications" className={ctl} placeholder={t("certificationsPh")} /></label>
          <label><span className={label}>{t("specialties")}</span><input name="specialties" className={ctl} placeholder={t("specialtiesPh")} /></label>
          <div><span className={label}>{t("englishLevel")}</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(levels).map(([v, l]) => (
                <label key={v} className={pill}><input type="radio" name="englishLevel" value={v} className="sr-only" /> {l}</label>
              ))}
            </div>
          </div>
          <div><span className={label}>{t("online1to1")}</span><YesNo name="online1to1" yes={t("yes")} no={t("no")} /></div>
          <label><span className={label}>{t("weeklyAvailability")}</span><input name="weeklyAvailability" className={ctl} placeholder={t("weeklyAvailabilityPh")} /></label>
        </div>

        {/* Step 3 — Presence & motivation */}
        <div hidden={step !== 3} className="flex flex-col gap-3">
          <label><span className={label}>{t("bio")}</span><textarea name="bio" rows={3} className={ctl} placeholder={t("bioPh")} /></label>
          <label><span className={label}>{t("cvUrl")}</span><input name="cvUrl" type="url" dir="ltr" className={ctl} placeholder={t("cvUrlPh")} /></label>
          <label><span className={label}>{t("motivation")}</span><textarea name="motivation" rows={3} className={ctl} placeholder={t("motivationPh")} /></label>
        </div>

        {state?.error && <p className="text-sm font-medium text-rose-600">{state.error}</p>}

        <div className="mt-1 flex items-center gap-2">
          {step > 1 && <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="ward-btn ward-btn--ghost ward-btn--md">{t("back")}</button>}
          {step < 3 ? (
            <button type="button" onClick={next} className="ward-btn ward-btn--primary ward-btn--md ml-auto">{t("next")}</button>
          ) : (
            <button type="submit" disabled={pending} className="ward-btn ward-btn--primary ward-btn--lg ml-auto">{pending ? t("submitting") : t("submit")}</button>
          )}
        </div>
        {step === 3 && <p className="text-center text-xs text-ink-soft">{t("reviewNote")}</p>}
      </form>
    </div>
  );
}
