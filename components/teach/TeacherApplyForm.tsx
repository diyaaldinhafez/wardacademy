"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitTeacherApplication } from "@/app/teach/actions";
import FlowerMark from "@/components/FlowerMark";

const ctl = "ward-field__control";

export default function TeacherApplyForm() {
  const t = useTranslations("teach");
  const [state, action, pending] = useActionState(submitTeacherApplication, undefined);

  if (state?.ok) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <FlowerMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold text-ink">{t("thanksTitle")}</h1>
        <p className="mt-3 text-sm text-ink-soft">{t("thanksBody")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="text-center">
        <FlowerMark className="mx-auto h-12 w-12" />
        <h1 className="mt-3 text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>

      <form action={action} className="mt-6 flex flex-col gap-3">
        {/* honeypot */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("fullName")} *</span>
          <input name="fullName" required className={ctl} placeholder={t("fullNamePh")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("email")} *</span>
          <input name="email" type="email" required dir="ltr" className={ctl} placeholder={t("emailPh")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("phone")}</span>
          <input name="phone" type="tel" dir="ltr" className={ctl} placeholder={t("phonePh")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("languages")}</span>
          <input name="languages" className={ctl} placeholder={t("languagesPh")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("specialties")}</span>
          <input name="specialties" className={ctl} placeholder={t("specialtiesPh")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("bio")}</span>
          <textarea name="bio" rows={3} className={ctl} placeholder={t("bioPh")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink">{t("note")}</span>
          <textarea name="note" rows={2} className={ctl} placeholder={t("notePh")} />
        </label>

        {state?.error && <p className="text-sm font-medium text-rose-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="ward-btn ward-btn--primary ward-btn--lg mt-1">
          {pending ? t("submitting") : t("submit")}
        </button>
        <p className="text-center text-xs text-ink-soft">{t("reviewNote")}</p>
      </form>
    </div>
  );
}
